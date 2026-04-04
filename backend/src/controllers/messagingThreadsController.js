// ============================================================
// Two-Way Messaging Threads Controller
// Parent ↔ Teacher, Teacher ↔ Admin, Group announcements
// Real-time via Socket.IO, read receipts, notifications
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const smsService = require('../services/smsService');
const logger = require('../config/logger');

// ── GET /api/threads — my threads ────────────────────────────
const getMyThreads = async (req, res) => {
  const { type, page = 1, limit = 30 } = req.query;

  let sql = `
    SELECT mt.id, mt.subject, mt.type, mt.class_id, mt.is_archived,
           mt.last_message_at, mt.created_at,
           c.name as class_name,
           u.first_name||' '||u.last_name as created_by_name,
           u.role as created_by_role,
           -- Last message preview
           (SELECT body FROM thread_messages WHERE thread_id=mt.id AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) as last_message,
           (SELECT sender_id FROM thread_messages WHERE thread_id=mt.id ORDER BY created_at DESC LIMIT 1) as last_sender_id,
           -- Unread count
           (SELECT COUNT(*) FROM thread_messages tm2
            WHERE tm2.thread_id=mt.id AND NOT ($2 = ANY(tm2.read_by)) AND tm2.sender_id != $2
            AND tm2.deleted_at IS NULL) as unread_count,
           -- Participant count
           (SELECT COUNT(*) FROM thread_participants WHERE thread_id=mt.id) as participant_count,
           tp.last_read
    FROM message_threads mt
    JOIN thread_participants tp ON tp.thread_id=mt.id AND tp.user_id=$2
    LEFT JOIN classes c ON mt.class_id=c.id
    JOIN users u ON mt.created_by=u.id
    WHERE mt.school_id=$1 AND mt.is_archived=false
  `;
  const params = [req.schoolId, req.user.id]; let i = 3;
  if (type) { sql += ` AND mt.type=$${i++}`; params.push(type); }
  sql += ' ORDER BY mt.last_message_at DESC';

  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

// ── POST /api/threads — create thread ────────────────────────
const createThread = async (req, res) => {
  const { subject, type, classId, participantIds, firstMessage } = req.body;
  if (!subject || !firstMessage) return res.status(400).json({ error: 'subject and firstMessage required' });

  let participants = participantIds || [];

  // Auto-populate participants based on type
  if (type === 'class_announcement' && classId) {
    // Include all teachers and parents of the class
    const { rows: classUsers } = await query(
      `SELECT DISTINCT u.id FROM users u
       WHERE u.school_id=$1 AND u.role IN ('teacher','class_teacher')
       UNION
       SELECT DISTINCT u.id FROM users u
       JOIN student_parents sp ON sp.email=u.email OR sp.phone=u.phone
       JOIN students s ON sp.student_id=s.id
       WHERE s.school_id=$1 AND s.current_class_id=$2 AND u.is_active=true`,
      [req.schoolId, classId]
    );
    participants = [...new Set([...participants, ...classUsers.map(u => u.id)])];
  } else if (type === 'admin_staff') {
    const { rows: staffUsers } = await query(
      "SELECT id FROM users WHERE school_id=$1 AND role NOT IN ('parent','student','alumni') AND is_active=true",
      [req.schoolId]
    );
    participants = [...new Set([...participants, ...staffUsers.map(u => u.id)])];
  }

  // Always include creator
  if (!participants.includes(req.user.id)) participants.push(req.user.id);

  const thread = await withTransaction(async (client) => {
    const { rows: threadRows } = await client.query(
      `INSERT INTO message_threads(school_id, subject, type, class_id, created_by, last_message_at)
       VALUES($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [req.schoolId, subject, type||'general', classId||null, req.user.id]
    );
    const t = threadRows[0];

    // Add all participants
    for (const uid of participants) {
      await client.query(
        `INSERT INTO thread_participants(thread_id, user_id, role)
         VALUES($1,$2,$3) ON CONFLICT(thread_id, user_id) DO NOTHING`,
        [t.id, uid, uid === req.user.id ? 'owner' : 'participant']
      );
    }

    // Send first message
    const { rows: msgRows } = await client.query(
      `INSERT INTO thread_messages(thread_id, school_id, sender_id, body, read_by)
       VALUES($1,$2,$3,$4,ARRAY[$3]) RETURNING *`,
      [t.id, req.schoolId, req.user.id, firstMessage]
    );

    return { thread: t, message: msgRows[0] };
  });

  // Notify all participants via Socket.IO
  const io = req.app.get('io');
  if (io) {
    for (const uid of participants) {
      if (uid !== req.user.id) {
        io.to(`user-${uid}`).emit('thread:new', {
          threadId: thread.thread.id,
          subject,
          from: `${req.user.firstName} ${req.user.lastName}`,
        });
      }
    }
    io.to(`school-${req.schoolId}`).emit('thread:created', { threadId: thread.thread.id });
  }

  res.status(201).json(thread);
};

// ── GET /api/threads/:threadId/messages ──────────────────────
const getMessages = async (req, res) => {
  const { threadId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify user is participant
  const { rows: partRows } = await query(
    'SELECT id FROM thread_participants WHERE thread_id=$1 AND user_id=$2',
    [threadId, req.user.id]
  );
  if (!partRows.length) return res.status(403).json({ error: 'Not a participant in this thread' });

  let sql = `
    SELECT tm.id, tm.body, tm.attachments, tm.is_system, tm.read_by,
           tm.edited_at, tm.deleted_at, tm.created_at,
           u.id as sender_id, u.first_name, u.last_name, u.photo_url, u.role,
           CASE WHEN tm.deleted_at IS NOT NULL THEN true ELSE false END as is_deleted
    FROM thread_messages tm
    JOIN users u ON tm.sender_id=u.id
    WHERE tm.thread_id=$1 AND tm.school_id=$2
    ORDER BY tm.created_at DESC
  `;

  const result = await paginatedQuery(sql, [threadId, req.schoolId], parseInt(page), parseInt(limit));

  // Mark messages as read
  await query(
    `UPDATE thread_messages SET read_by = array_append(read_by, $1)
     WHERE thread_id=$2 AND NOT ($1 = ANY(read_by)) AND sender_id != $1`,
    [req.user.id, threadId]
  ).catch(() => {});

  // Update last_read
  await query(
    'UPDATE thread_participants SET last_read=NOW() WHERE thread_id=$1 AND user_id=$2',
    [threadId, req.user.id]
  ).catch(() => {});

  res.json(result);
};

// ── POST /api/threads/:threadId/messages — send message ───────
const sendMessage = async (req, res) => {
  const { threadId } = req.params;
  const { body, attachments } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Message body required' });

  // Verify participant
  const { rows: partRows } = await query(
    `SELECT tp.id FROM thread_participants tp
     JOIN message_threads mt ON tp.thread_id=mt.id
     WHERE tp.thread_id=$1 AND tp.user_id=$2 AND mt.school_id=$3 AND mt.is_archived=false`,
    [threadId, req.user.id, req.schoolId]
  );
  if (!partRows.length) return res.status(403).json({ error: 'Not a participant or thread is archived' });

  const { rows: msgRows } = await query(
    `INSERT INTO thread_messages(thread_id, school_id, sender_id, body, attachments, read_by)
     VALUES($1,$2,$3,$4,$5::jsonb, ARRAY[$3]) RETURNING *`,
    [threadId, req.schoolId, req.user.id, body.trim(), JSON.stringify(attachments||[])]
  );
  const message = msgRows[0];

  await query('UPDATE message_threads SET last_message_at=NOW() WHERE id=$1', [threadId]);

  // Get thread info + other participants
  const { rows: threadRows } = await query(
    `SELECT mt.subject, mt.type,
            array_agg(tp.user_id) FILTER (WHERE tp.user_id != $1) as other_participants
     FROM message_threads mt
     JOIN thread_participants tp ON tp.thread_id=mt.id
     WHERE mt.id=$2
     GROUP BY mt.id`,
    [req.user.id, threadId]
  );
  const thread = threadRows[0];

  // Real-time push to others
  const io = req.app.get('io');
  if (io) {
    (thread?.other_participants || []).forEach(uid => {
      io.to(`user-${uid}`).emit('thread:message', {
        threadId, messageId: message.id, body: body.substring(0, 100),
        from: req.user.firstName || 'Someone',
        threadSubject: thread?.subject,
      });
    });
  }

  // SMS notification for parent-teacher threads (only if offline)
  if (thread?.type === 'parent_teacher') {
    const { rows: parentUsers } = await query(
      `SELECT u.phone FROM users u
       JOIN thread_participants tp ON tp.user_id=u.id
       WHERE tp.thread_id=$1 AND u.role='parent' AND u.id != $2 AND u.phone IS NOT NULL`,
      [threadId, req.user.id]
    );
    for (const p of parentUsers) {
      smsService.send(p.phone,
        `New message on ElimuSaaS: "${body.substring(0, 80)}${body.length > 80 ? '...' : ''}". Login to reply.`
      ).catch(() => {});
    }
  }

  res.status(201).json(message);
};

// ── PUT /api/threads/:threadId/messages/:messageId — edit ─────
const editMessage = async (req, res) => {
  const { body } = req.body;
  const { rows } = await query(
    `UPDATE thread_messages SET body=$1, edited_at=NOW()
     WHERE id=$2 AND thread_id=$3 AND sender_id=$4 AND deleted_at IS NULL RETURNING *`,
    [body, req.params.messageId, req.params.threadId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Message not found or not yours' });
  res.json(rows[0]);
};

// ── DELETE /api/threads/:threadId/messages/:messageId ─────────
const deleteMessage = async (req, res) => {
  const { rows } = await query(
    `UPDATE thread_messages SET deleted_at=NOW(), body='[Message deleted]'
     WHERE id=$1 AND thread_id=$2 AND sender_id=$3 RETURNING id`,
    [req.params.messageId, req.params.threadId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found or not yours' });
  res.json({ message: 'Deleted' });
};

// ── PUT /api/threads/:threadId/archive ────────────────────────
const archiveThread = async (req, res) => {
  await query(
    `UPDATE message_threads SET is_archived=true
     WHERE id=$1 AND school_id=$2 AND (created_by=$3 OR $4 IN ('school_admin','principal','dean_of_studies'))`,
    [req.params.threadId, req.schoolId, req.user.id, req.user.role]
  );
  res.json({ message: 'Thread archived' });
};

// ── GET /api/threads/:threadId/participants ───────────────────
const getParticipants = async (req, res) => {
  const { rows } = await query(
    `SELECT tp.role, tp.last_read, tp.is_muted,
            u.id, u.first_name, u.last_name, u.photo_url, u.role as user_role
     FROM thread_participants tp JOIN users u ON tp.user_id=u.id
     WHERE tp.thread_id=$1`,
    [req.params.threadId]
  );
  res.json(rows);
};

// ── POST /api/threads/:threadId/participants — add participant ─
const addParticipant = async (req, res) => {
  const { userId } = req.body;
  await query(
    `INSERT INTO thread_participants(thread_id, user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
    [req.params.threadId, userId]
  );

  // System message
  await query(
    `INSERT INTO thread_messages(thread_id, school_id, sender_id, body, is_system)
     SELECT $1, school_id, $2, $3, true FROM message_threads WHERE id=$1`,
    [req.params.threadId, req.user.id, `${req.user.firstName} added a new participant`]
  );
  res.json({ message: 'Participant added' });
};

module.exports = {
  getMyThreads, createThread, getMessages, sendMessage,
  editMessage, deleteMessage, archiveThread,
  getParticipants, addParticipant,
};
