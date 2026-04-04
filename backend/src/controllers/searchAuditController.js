// ============================================================
// Global Search Controller
// Full-text search across students, staff, classes,
// subjects, resources, messages, alumni, payments
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');

// ── GET /api/search?q=&modules=&limit= ───────────────────────
const globalSearch = async (req, res) => {
  const { q, modules, limit = 10 } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

  const search = q.trim();
  const lim = Math.min(parseInt(limit), 20);
  const activeModules = modules ? modules.split(',') : ['students','staff','classes','resources','alumni','payments'];
  const results = {};

  const searches = [];

  if (activeModules.includes('students')) {
    searches.push(
      query(
        `SELECT 'student' as type, s.id, s.admission_number as ref,
                s.first_name||' '||s.last_name as label,
                c.name as context, s.photo_url as image,
                ts_rank(to_tsvector('english', s.first_name||' '||s.last_name||' '||COALESCE(s.admission_number,'')), plainto_tsquery($1)) as rank
         FROM students s LEFT JOIN classes c ON s.current_class_id=c.id
         WHERE s.school_id=$2 AND s.is_active=true
           AND (s.first_name ILIKE $3 OR s.last_name ILIKE $3 OR s.admission_number ILIKE $3
                OR to_tsvector('english', s.first_name||' '||s.last_name||' '||COALESCE(s.admission_number,'')) @@ plainto_tsquery($1))
         ORDER BY rank DESC LIMIT $4`,
        [search, req.schoolId, `%${search}%`, lim]
      ).then(r => ({ module: 'students', data: r.rows }))
    );
  }

  if (activeModules.includes('staff')) {
    searches.push(
      query(
        `SELECT 'staff' as type, u.id, s.staff_number as ref,
                u.first_name||' '||u.last_name as label,
                COALESCE(s.designation, u.role) as context, u.photo_url as image,
                u.role, s.tsc_number, s.tsc_verification_status
         FROM users u LEFT JOIN staff s ON s.user_id=u.id
         WHERE u.school_id=$1 AND u.is_active=true AND u.role NOT IN ('parent','student','alumni')
           AND (u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.email ILIKE $2
                OR s.staff_number ILIKE $2 OR s.tsc_number ILIKE $2)
         LIMIT $3`,
        [req.schoolId, `%${search}%`, lim]
      ).then(r => ({ module: 'staff', data: r.rows }))
    );
  }

  if (activeModules.includes('classes')) {
    searches.push(
      query(
        `SELECT 'class' as type, c.id, c.name as ref, c.label as label,
                'Form '||c.level||COALESCE(' '||c.stream,'') as context,
                u.first_name||' '||u.last_name as teacher_name
         FROM classes c LEFT JOIN users u ON c.class_teacher_id=u.id
         WHERE c.school_id=$1 AND c.is_active=true AND c.name ILIKE $2
         LIMIT $3`,
        [req.schoolId, `%${search}%`, lim]
      ).then(r => ({ module: 'classes', data: r.rows }))
    );
  }

  if (activeModules.includes('resources')) {
    searches.push(
      query(
        `SELECT 'resource' as type, lr.id, lr.resource_type as ref,
                lr.title as label,
                COALESCE(sub.name, 'General') as context,
                lr.file_url as url, lr.view_count
         FROM learning_resources lr LEFT JOIN subjects sub ON lr.subject_id=sub.id
         WHERE lr.school_id=$1
           AND (lr.title ILIKE $2 OR lr.description ILIKE $2
                OR to_tsvector('english', lr.title||' '||COALESCE(lr.description,'')) @@ plainto_tsquery($3))
         ORDER BY lr.view_count DESC LIMIT $4`,
        [req.schoolId, `%${search}%`, search, lim]
      ).then(r => ({ module: 'resources', data: r.rows }))
    );
  }

  if (activeModules.includes('alumni')) {
    searches.push(
      query(
        `SELECT 'alumni' as type, a.id, a.admission_number as ref,
                a.first_name||' '||a.last_name as label,
                COALESCE(a.current_occupation, 'Class of '||a.graduation_year::text) as context,
                a.photo_url as image
         FROM alumni WHERE school_id=$1 AND is_active=true
           AND (first_name ILIKE $2 OR last_name ILIKE $2 OR admission_number ILIKE $2)
         LIMIT $3`,
        [req.schoolId, `%${search}%`, lim]
      ).then(r => ({ module: 'alumni', data: r.rows }))
    );
  }

  if (activeModules.includes('payments')) {
    searches.push(
      query(
        `SELECT 'payment' as type, fp.id, fp.receipt_number as ref,
                s.first_name||' '||s.last_name as label,
                'KES '||fp.amount||' — '||fp.payment_method as context,
                fp.paid_at as date
         FROM fee_payments fp JOIN students s ON fp.student_id=s.id
         WHERE fp.school_id=$1 AND fp.status='completed'
           AND (fp.receipt_number ILIKE $2 OR fp.mpesa_receipt ILIKE $2
                OR s.admission_number ILIKE $2 OR s.first_name ILIKE $2 OR s.last_name ILIKE $2)
         ORDER BY fp.paid_at DESC LIMIT $3`,
        [req.schoolId, `%${search}%`, lim]
      ).then(r => ({ module: 'payments', data: r.rows }))
    );
  }

  const searchResults = await Promise.allSettled(searches);
  let totalResults = 0;

  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      results[result.value.module] = result.value.data;
      totalResults += result.value.data.length;
    }
  }

  res.json({
    query: search,
    totalResults,
    results,
    modules: Object.keys(results),
  });
};

// ── GET /api/search/students?q= — dedicated student search ────
const searchStudents = async (req, res) => {
  const { q, classId, gender, isActive = 'true', isBoarding, limit = 30 } = req.query;
  if (!q || q.length < 1) return res.status(400).json({ error: 'q required' });

  let sql = `
    SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
           s.photo_url, s.is_boarding, s.date_of_birth,
           c.name as class_name, c.level, c.stream
    FROM students s LEFT JOIN classes c ON s.current_class_id=c.id
    WHERE s.school_id=$1
      AND (s.first_name ILIKE $2 OR s.last_name ILIKE $2 OR s.admission_number ILIKE $2
           OR (s.first_name||' '||s.last_name) ILIKE $2)
  `;
  const params = [req.schoolId, `%${q}%`]; let i = 3;
  if (classId) { sql += ` AND s.current_class_id=$${i++}`; params.push(classId); }
  if (gender) { sql += ` AND s.gender=$${i++}`; params.push(gender); }
  if (isActive !== 'all') { sql += ` AND s.is_active=$${i++}`; params.push(isActive === 'true'); }
  if (isBoarding !== undefined) { sql += ` AND s.is_boarding=$${i++}`; params.push(isBoarding === 'true'); }
  sql += ` ORDER BY s.first_name LIMIT $${i}`;
  params.push(parseInt(limit));

  const { rows } = await query(sql, params);
  res.json(rows);
};

module.exports = { globalSearch, searchStudents };


// ============================================================
// Audit Logs Controller
// ============================================================
const getAuditLogs = async (req, res) => {
  const { userId, action, entityType, from, to, page = 1, limit = 50 } = req.query;

  let sql = `
    SELECT al.*,
           u.first_name||' '||u.last_name as user_name,
           u.role as user_role, u.email as user_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id=u.id
    WHERE al.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (userId) { sql += ` AND al.user_id=$${i++}`; params.push(userId); }
  if (action) { sql += ` AND al.action ILIKE $${i++}`; params.push(`%${action}%`); }
  if (entityType) { sql += ` AND al.entity_type=$${i++}`; params.push(entityType); }
  if (from) { sql += ` AND al.created_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND al.created_at <= $${i++}`; params.push(to); }
  sql += ' ORDER BY al.created_at DESC';

  const { paginatedQuery: pg } = require('../config/database');
  res.json(await pg(sql, params, parseInt(page), parseInt(limit)));
};

module.exports = { ...module.exports, getAuditLogs };


// ============================================================
// Activity Monitoring + Security Controller
// ============================================================
const logActivity = async (userId, schoolId, action, entityType, entityId, metadata, req) => {
  try {
    await query(
      `INSERT INTO user_activity_log(school_id, user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [schoolId, userId, action, entityType, entityId,
       req?.ip, req?.headers?.['user-agent'],
       JSON.stringify(metadata || {})]
    );
  } catch (e) { /* non-blocking */ }
};

const getActivityLog = async (req, res) => {
  const { userId, action, from, to, page = 1, limit = 50 } = req.query;
  const { paginatedQuery: pg } = require('../config/database');

  let sql = `
    SELECT ual.*,
           u.first_name||' '||u.last_name as user_name,
           u.role, u.email
    FROM user_activity_log ual
    LEFT JOIN users u ON ual.user_id=u.id
    WHERE ual.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (userId) { sql += ` AND ual.user_id=$${i++}`; params.push(userId); }
  if (action) { sql += ` AND ual.action ILIKE $${i++}`; params.push(`%${action}%`); }
  if (from) { sql += ` AND ual.created_at >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND ual.created_at <= $${i++}`; params.push(to); }
  sql += ' ORDER BY ual.created_at DESC';
  res.json(await pg(sql, params, parseInt(page), parseInt(limit)));
};

const getLoginHistory = async (req, res) => {
  const { userId } = req.params;
  const targetUser = userId || req.user.id;
  const { rows } = await query(
    `SELECT * FROM login_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [targetUser]
  );
  res.json(rows);
};

const getSecuritySummary = async (req, res) => {
  const [failedLogins, recentActivity, unusualTimes] = await Promise.allSettled([
    query(
      `SELECT u.first_name||' '||u.last_name as name, u.email, COUNT(*) as count
       FROM login_history lh JOIN users u ON lh.user_id=u.id
       WHERE lh.school_id=$1 AND lh.status='failed' AND lh.created_at >= NOW()-INTERVAL '24 hours'
       GROUP BY u.id HAVING COUNT(*) >= 3 ORDER BY count DESC LIMIT 10`,
      [req.schoolId]
    ),
    query(
      `SELECT action, COUNT(*) as count FROM user_activity_log
       WHERE school_id=$1 AND created_at >= NOW()-INTERVAL '24 hours'
       GROUP BY action ORDER BY count DESC LIMIT 10`,
      [req.schoolId]
    ),
    query(
      `SELECT u.first_name||' '||u.last_name as name, u.role, lh.created_at, lh.ip_address
       FROM login_history lh JOIN users u ON lh.user_id=u.id
       WHERE lh.school_id=$1 AND lh.status='success'
         AND (EXTRACT(HOUR FROM lh.created_at) < 5 OR EXTRACT(HOUR FROM lh.created_at) > 22)
         AND lh.created_at >= NOW()-INTERVAL '7 days'
       ORDER BY lh.created_at DESC LIMIT 20`,
      [req.schoolId]
    ),
  ]);

  res.json({
    failedLogins: failedLogins.status === 'fulfilled' ? failedLogins.value.rows : [],
    topActions: recentActivity.status === 'fulfilled' ? recentActivity.value.rows : [],
    unusualLoginTimes: unusualTimes.status === 'fulfilled' ? unusualTimes.value.rows : [],
  });
};

module.exports = {
  ...module.exports,
  logActivity, getActivityLog, getLoginHistory, getSecuritySummary,
};
