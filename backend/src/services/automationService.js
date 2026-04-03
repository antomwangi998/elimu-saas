// ============================================================
// Automation Service — Cron Jobs
// Auto-promotions, fee reminders, subscription enforcement,
// badge awards, insight generation, scheduled messages
// ============================================================
const cron = require('node-cron');
const { query, withTransaction } = require('../config/database');
const smsService = require('./smsService');
const emailService = require('./emailService');
const logger = require('../config/logger');

// ============================================================
// FEE BALANCE REMINDERS (Daily at 9 AM)
// ============================================================
const runFeeReminders = async () => {
  logger.info('Running fee balance reminders...');
  try {
    const { rows: schools } = await query(
      "SELECT id, name, school_code FROM schools WHERE is_active=true"
    );

    for (const school of schools) {
      // Get students with outstanding balance > 0
      const { rows: debtors } = await query(
        `SELECT DISTINCT s.id, s.first_name, s.last_name, s.admission_number,
                sp.phone as parent_phone, sp.email as parent_email, sp.first_name as parent_name,
                (COALESCE(SUM(sfa.net_fees),0) - COALESCE(SUM(fp.amount),0)) as balance
         FROM students s
         JOIN student_fee_assignments sfa ON sfa.student_id=s.id
         LEFT JOIN fee_payments fp ON fp.student_id=s.id AND fp.status='completed'
         LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
         WHERE s.school_id=$1 AND s.is_active=true
         GROUP BY s.id, sp.phone, sp.email, sp.first_name
         HAVING (COALESCE(SUM(sfa.net_fees),0) - COALESCE(SUM(fp.amount),0)) > 5000`,
        [school.id]
      );

      // Only send reminders on Monday and Thursday
      const day = new Date().getDay();
      if (day !== 1 && day !== 4) continue;

      for (const debtor of debtors.slice(0, 100)) {
        if (debtor.parent_phone) {
          const msg = `Dear ${debtor.parent_name||'Parent'}, your child ${debtor.first_name} ${debtor.last_name} (${debtor.admission_number}) has an outstanding fee balance of KES ${parseFloat(debtor.balance).toLocaleString()} at ${school.name}. Please pay promptly to avoid disruption. Thank you.`;
          await smsService.send(debtor.parent_phone, msg).catch(() => {});
        }
      }

      if (debtors.length > 0) {
        logger.info(`Fee reminders sent to ${debtors.length} parents at ${school.name}`);
      }
    }
  } catch (e) {
    logger.error('Fee reminder error:', e.message);
  }
};

// ============================================================
// SUBSCRIPTION ENFORCEMENT (Daily at 7 AM)
// ============================================================
const enforceSubscriptions = async () => {
  logger.info('Enforcing subscription statuses...');
  try {
    const graceDays = parseInt(process.env.GRACE_PERIOD_DAYS || '14');

    // Move expired active subscriptions to grace
    await query(
      `UPDATE subscriptions SET status='grace', grace_end_date=end_date + INTERVAL '${graceDays} days'
       WHERE status='active' AND end_date < CURRENT_DATE AND grace_end_date IS NULL`
    );

    // Suspend subscriptions past grace period
    const { rows: suspended } = await query(
      `UPDATE subscriptions SET status='suspended'
       WHERE status='grace' AND grace_end_date < CURRENT_DATE
       RETURNING school_id`
    );

    // Send warning to schools entering grace period
    const { rows: inGrace } = await query(
      `SELECT s.id, s.name, s.email, sub.end_date, sub.grace_end_date
       FROM subscriptions sub JOIN schools s ON sub.school_id=s.id
       WHERE sub.status='grace' AND sub.grace_end_date = CURRENT_DATE + INTERVAL '3 days'`
    );

    for (const school of inGrace) {
      if (school.email) {
        await emailService.sendHtml(school.email,
          `⚠️ ElimuSaaS Subscription Expiring Soon — ${school.name}`,
          `<p>Dear Administrator,</p>
           <p>Your ElimuSaaS subscription for <b>${school.name}</b> expires in <b>3 days</b> on ${new Date(school.grace_end_date).toLocaleDateString('en-KE')}.</p>
           <p>Please renew your subscription immediately to avoid system lockout.</p>
           <a href="${process.env.FRONTEND_URL}/subscription/renew" style="background:#1a365d;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Renew Now</a>`
        ).catch(() => {});
      }
    }

    logger.info(`Subscription enforcement: ${suspended.length} schools suspended, ${inGrace.length} warned`);
  } catch (e) {
    logger.error('Subscription enforcement error:', e.message);
  }
};

// ============================================================
// AUTO PROMOTIONS (End of year — runs December 15)
// ============================================================
const runAutoPromotions = async () => {
  logger.info('Running auto-promotions...');
  try {
    const currentYear = new Date().getFullYear();

    const { rows: schools } = await query("SELECT id FROM schools WHERE is_active=true");

    for (const school of schools) {
      // Get all active students with their current class level
      const { rows: students } = await query(
        `SELECT s.id, s.current_class_id, c.level, c.school_id
         FROM students s
         JOIN classes c ON s.current_class_id=c.id
         WHERE s.school_id=$1 AND s.is_active=true`,
        [school.id]
      );

      // Group students by level
      const byLevel = {};
      for (const s of students) {
        if (!byLevel[s.level]) byLevel[s.level] = [];
        byLevel[s.level].push(s);
      }

      for (const [levelStr, classStudents] of Object.entries(byLevel)) {
        const currentLevel = parseInt(levelStr);
        if (currentLevel >= 4) continue; // Form 4 graduates

        // Find classes at the next level
        const { rows: nextClasses } = await query(
          `SELECT id, level, stream FROM classes
           WHERE school_id=$1 AND level=$2 AND is_active=true
           ORDER BY stream`,
          [school.id, currentLevel + 1]
        );
        if (!nextClasses.length) continue;

        // Promote each student to a class at next level
        let classIdx = 0;
        await withTransaction(async (client) => {
          for (const student of classStudents) {
            const nextClass = nextClasses[classIdx % nextClasses.length];
            classIdx++;

            await client.query(
              'UPDATE students SET current_class_id=$1, updated_at=NOW() WHERE id=$2',
              [nextClass.id, student.id]
            );

            await client.query(
              `INSERT INTO promotion_records(school_id, student_id, from_class_id, to_class_id, from_level, to_level, academic_year, promotion_type)
               VALUES($1,$2,$3,$4,$5,$6,$7,'auto')
               ON CONFLICT DO NOTHING`,
              [school.id, student.id, student.current_class_id, nextClass.id, currentLevel, currentLevel + 1, currentYear]
            );

            await client.query(
              `INSERT INTO student_timeline(school_id, student_id, event_type, title, description, event_date, category, colour)
               VALUES($1,$2,'promotion','Promoted to Form ${currentLevel + 1}',
               'Automatically promoted to Form ${currentLevel + 1} for academic year ${currentYear + 1}',
               CURRENT_DATE, 'academic', '#6366f1')`,
              [school.id, student.id]
            );
          }
        });
      }
    }
    logger.info('Auto-promotions completed');
  } catch (e) {
    logger.error('Auto-promotion error:', e.message);
  }
};

// ============================================================
// SCHEDULED MESSAGES PROCESSOR (Every 5 minutes)
// ============================================================
const processScheduledMessages = async () => {
  try {
    const { rows: messages } = await query(
      `SELECT * FROM scheduled_messages
       WHERE status='pending' AND scheduled_at <= NOW()
       ORDER BY scheduled_at LIMIT 10`
    );

    for (const msg of messages) {
      await query('UPDATE scheduled_messages SET status=$1 WHERE id=$2', ['sending', msg.id]);

      let sentCount = 0, failedCount = 0;
      const channels = msg.channels || [];

      // Get recipients
      let recipients = [];
      if (msg.recipient_type === 'all_parents') {
        const { rows } = await query(
          'SELECT sp.phone, sp.email FROM student_parents sp JOIN students s ON sp.student_id=s.id WHERE s.school_id=$1 AND s.is_active=true',
          [msg.school_id]
        );
        recipients = rows;
      } else if (msg.recipient_type === 'all_staff') {
        const { rows } = await query(
          'SELECT u.phone, u.email FROM users u WHERE u.school_id=$1 AND u.is_active=true AND u.role != $2',
          [msg.school_id, 'parent']
        );
        recipients = rows;
      }

      for (const r of recipients) {
        if (channels.includes('sms') && r.phone) {
          const ok = await smsService.send(r.phone, msg.body).catch(() => false);
          ok ? sentCount++ : failedCount++;
        }
        if (channels.includes('email') && r.email) {
          const ok = await emailService.send(r.email, msg.subject || 'School Message', msg.body).catch(() => false);
          ok ? sentCount++ : failedCount++;
        }
      }

      await query(
        'UPDATE scheduled_messages SET status=$1, sent_at=NOW(), sent_count=$2, failed_count=$3 WHERE id=$4',
        ['sent', sentCount, failedCount, msg.id]
      );
    }
  } catch (e) {
    logger.error('Scheduled messages error:', e.message);
  }
};

// ============================================================
// AI INSIGHTS GENERATION (Twice daily)
// ============================================================
const generateInsightsForAllSchools = async () => {
  try {
    const { rows: schools } = await query("SELECT id FROM schools WHERE is_active=true LIMIT 50");
    const { generateSchoolInsights } = require('./aiEngine');
    for (const school of schools) {
      await generateSchoolInsights(school.id).catch(e => logger.warn(`Insights error for ${school.id}:`, e.message));
    }
    logger.info(`AI insights generated for ${schools.length} schools`);
  } catch (e) {
    logger.error('AI insights generation error:', e.message);
  }
};

// ============================================================
// ATTENDANCE POINTS AWARD (Daily at 4 PM)
// ============================================================
const awardAttendancePoints = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Award 2 points to students who were present today
    await query(
      `INSERT INTO student_points(school_id, student_id, points, reason, category, academic_year, reference_id)
       SELECT ar.school_id, ar.student_id, 2, 'Daily attendance', 'attendance', EXTRACT(YEAR FROM NOW())::INT, ar.id
       FROM attendance_records ar
       WHERE ar.date=$1 AND ar.status='present'
       ON CONFLICT DO NOTHING`,
      [today]
    );
  } catch (e) {
    logger.error('Attendance points error:', e.message);
  }
};

// ============================================================
// REGISTER ALL CRON JOBS
// ============================================================
const initAutomation = () => {
  // Fee reminders — Mon & Thu 9AM EAT (6AM UTC)
  cron.schedule('0 6 * * 1,4', runFeeReminders, { timezone: 'Africa/Nairobi' });

  // Subscription enforcement — daily 7AM EAT (4AM UTC)
  cron.schedule('0 4 * * *', enforceSubscriptions, { timezone: 'Africa/Nairobi' });

  // Auto promotions — Dec 15 only
  cron.schedule('0 2 15 12 *', runAutoPromotions, { timezone: 'Africa/Nairobi' });

  // Scheduled messages — every 5 minutes
  cron.schedule('*/5 * * * *', processScheduledMessages);

  // AI insights — 6AM and 6PM EAT
  cron.schedule('0 3,15 * * *', generateInsightsForAllSchools, { timezone: 'Africa/Nairobi' });

  // Attendance points — weekdays 4PM EAT
  cron.schedule('0 13 * * 1-5', awardAttendancePoints, { timezone: 'Africa/Nairobi' });

  logger.info('✅ Automation cron jobs registered (6 jobs)');
};

module.exports = {
  initAutomation,
  runFeeReminders, enforceSubscriptions, runAutoPromotions,
  processScheduledMessages, generateInsightsForAllSchools,
};
