// ============================================================
// FCM Push Notifications + WhatsApp Messaging Controller
// ============================================================
const { query } = require('../config/database');

// ── FCM ───────────────────────────────────────────────────────
exports.registerToken = async (req, res) => {
  try {
    const { token, deviceType = 'web' } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    await query(
      `INSERT INTO fcm_tokens(user_id,school_id,token,device_type)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(user_id,token) DO UPDATE SET is_active=true,device_type=$4,updated_at=NOW()`,
      [req.user.id, req.schoolId, token, deviceType]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.sendPushNotification = async (req, res) => {
  try {
    const { title, body, data = {}, targetType = 'all', targetIds = [] } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

    // Get FCM server key from school settings
    const { rows: cfg } = await query(
      `SELECT settings FROM schools WHERE id=$1`, [req.schoolId]
    );
    const settings = cfg[0]?.settings || {};
    const fcmKey = settings.fcm_server_key || process.env.FCM_SERVER_KEY;

    // Get target tokens
    let tokenQuery = `SELECT DISTINCT ft.token FROM fcm_tokens ft
                      JOIN users u ON ft.user_id=u.id
                      WHERE ft.school_id=$1 AND ft.is_active=true`;
    const params = [req.schoolId];
    if (targetType === 'users' && targetIds.length) {
      params.push(targetIds);
      tokenQuery += ` AND ft.user_id = ANY($${params.length})`;
    } else if (targetType === 'role') {
      params.push(targetIds[0]);
      tokenQuery += ` AND u.role=$${params.length}`;
    }
    const { rows: tokens } = await query(tokenQuery, params);

    // Log notification
    const { rows: notif } = await query(
      `INSERT INTO push_notifications(school_id,title,body,data,target_type,target_ids,status,created_by)
       VALUES($1,$2,$3,$4,$5,$6,'sending',$7) RETURNING *`,
      [req.schoolId, title, body, JSON.stringify(data), targetType, targetIds, req.user.id]
    );

    let sentCount = 0, failedCount = 0;

    if (fcmKey && tokens.length) {
      // Send via FCM HTTP API (v1 legacy)
      for (const t of tokens) {
        try {
          const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `key=${fcmKey}`,
            },
            body: JSON.stringify({
              to: t.token,
              notification: { title, body },
              data: { ...data, schoolId: req.schoolId },
            }),
          });
          const result = await resp.json();
          if (result.success === 1) sentCount++;
          else failedCount++;
        } catch { failedCount++; }
      }
    } else {
      // No FCM key — mark as queued for when key is configured
      sentCount = 0;
    }

    await query(
      `UPDATE push_notifications SET sent_count=$1,failed_count=$2,status='sent',sent_at=NOW() WHERE id=$3`,
      [sentCount, failedCount, notif[0].id]
    );

    res.json({ success: true, sentCount, failedCount, totalTokens: tokens.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getNotificationHistory = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pn.*, u.first_name||' '||u.last_name AS created_by_name
       FROM push_notifications pn LEFT JOIN users u ON pn.created_by=u.id
       WHERE pn.school_id=$1 ORDER BY pn.created_at DESC LIMIT 50`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveFcmConfig = async (req, res) => {
  try {
    const { fcmServerKey, vapidPublicKey } = req.body;
    await query(
      `UPDATE schools SET settings = settings || $1::jsonb WHERE id=$2`,
      [JSON.stringify({ fcm_server_key: fcmServerKey, vapid_public_key: vapidPublicKey }), req.schoolId]
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── WhatsApp ──────────────────────────────────────────────────
exports.getWhatsappConfig = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id,provider,whatsapp_number,is_active FROM whatsapp_config WHERE school_id=$1`,
      [req.schoolId]
    );
    res.json(rows[0] || { is_active: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveWhatsappConfig = async (req, res) => {
  try {
    const { provider = 'twilio', accountSid, authToken, whatsappNumber } = req.body;
    const { rows } = await query(
      `INSERT INTO whatsapp_config(school_id,provider,account_sid,auth_token,whatsapp_number,is_active)
       VALUES($1,$2,$3,$4,$5,true)
       ON CONFLICT(school_id) DO UPDATE SET provider=$2,account_sid=$3,auth_token=$4,
         whatsapp_number=$5,is_active=true,updated_at=NOW() RETURNING *`,
      [req.schoolId, provider, accountSid, authToken, whatsappNumber]
    );
    res.json({ success: true, id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.sendWhatsapp = async (req, res) => {
  try {
    const { recipientPhone, recipientName, recipientId, message, mediaUrl } = req.body;
    if (!recipientPhone || !message) return res.status(400).json({ error: 'Phone and message required' });

    const { rows: cfg } = await query(
      `SELECT * FROM whatsapp_config WHERE school_id=$1 AND is_active=true`, [req.schoolId]
    );

    let status = 'queued', providerMsgId = null, errorMsg = null;

    if (cfg.length && cfg[0].account_sid && cfg[0].auth_token) {
      try {
        const phone = recipientPhone.startsWith('+') ? recipientPhone : `+254${recipientPhone.replace(/^0/, '')}`;
        const fromNumber = `whatsapp:${cfg[0].whatsapp_number}`;
        const toNumber = `whatsapp:${phone}`;

        const credentials = Buffer.from(`${cfg[0].account_sid}:${cfg[0].auth_token}`).toString('base64');
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${cfg[0].account_sid}/Messages.json`,
          {
            method: 'POST',
            headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ From: fromNumber, To: toNumber, Body: message, ...(mediaUrl ? { MediaUrl: mediaUrl } : {}) }),
          }
        );
        const result = await resp.json();
        if (result.sid) { status = 'sent'; providerMsgId = result.sid; }
        else { status = 'failed'; errorMsg = result.message || 'Send failed'; }
      } catch (err) { status = 'failed'; errorMsg = err.message; }
    }

    const { rows } = await query(
      `INSERT INTO whatsapp_messages(school_id,recipient_phone,recipient_name,recipient_id,message,
        media_url,status,provider_message_id,error_message,sent_by,sent_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.schoolId, recipientPhone, recipientName, recipientId||null, message,
       mediaUrl||null, status, providerMsgId, errorMsg, req.user.id,
       status === 'sent' ? new Date() : null]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.sendBulkWhatsapp = async (req, res) => {
  try {
    const { recipients, message, targetType = 'custom' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    let phones = recipients || [];
    if (targetType === 'parents') {
      const { rows } = await query(
        `SELECT DISTINCT u.phone FROM users u
         JOIN parent_student_links psl ON psl.parent_id=u.id
         WHERE psl.school_id=$1 AND u.phone IS NOT NULL`,
        [req.schoolId]
      );
      phones = rows.map(r => ({ phone: r.phone }));
    } else if (targetType === 'staff') {
      const { rows } = await query(
        `SELECT phone, first_name||' '||last_name AS name FROM users
         WHERE school_id=$1 AND role NOT IN ('student','parent') AND phone IS NOT NULL`,
        [req.schoolId]
      );
      phones = rows.map(r => ({ phone: r.phone, name: r.name }));
    }

    let sent = 0, failed = 0;
    for (const r of phones) {
      const result = await fetch(`${process.env.API_URL || 'http://localhost:5000'}/api/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization },
        body: JSON.stringify({ recipientPhone: r.phone, recipientName: r.name, message }),
      }).catch(() => null);
      if (result?.ok) sent++; else failed++;
    }
    res.json({ success: true, sent, failed, total: phones.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getWhatsappMessages = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT wm.*, u.first_name||' '||u.last_name AS sent_by_name
       FROM whatsapp_messages wm LEFT JOIN users u ON wm.sent_by=u.id
       WHERE wm.school_id=$1 ORDER BY wm.created_at DESC LIMIT 100`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getWhatsappTemplates = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM whatsapp_templates WHERE school_id=$1 ORDER BY name`, [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.saveWhatsappTemplate = async (req, res) => {
  try {
    const { name, category, content } = req.body;
    const { rows } = await query(
      `INSERT INTO whatsapp_templates(school_id,name,category,content)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [req.schoolId, name, category || 'general', content]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Twilio incoming webhook
exports.webhookIncoming = async (req, res) => {
  try {
    const { From, Body, MessageSid } = req.body;
    const phone = From.replace('whatsapp:', '');
    await query(
      `INSERT INTO whatsapp_messages(school_id,recipient_phone,message,direction,status,provider_message_id)
       VALUES((SELECT id FROM whatsapp_config WHERE whatsapp_number=$1 LIMIT 1),$2,$3,'inbound','received',$4)`,
      [req.body.To?.replace('whatsapp:', ''), phone, Body, MessageSid]
    );
    res.set('Content-Type', 'text/xml').send('<Response></Response>');
  } catch { res.set('Content-Type', 'text/xml').send('<Response></Response>'); }
};
