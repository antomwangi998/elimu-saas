// ============================================================
// Resource Library Controller
// ============================================================
const { query, paginatedQuery } = require('../config/database');

const getResources = async (req, res) => {
  const { subjectId, classId, resourceType, level, search, curriculum, page = 1 } = req.query;
  let sql = `
    SELECT lr.*, sub.name as subject_name, c.name as class_name,
           u.first_name||' '||u.last_name as uploaded_by_name,
           ROUND(AVG(rr.rating),1) as avg_rating, COUNT(rr.id) as rating_count
    FROM learning_resources lr
    LEFT JOIN subjects sub ON lr.subject_id=sub.id
    LEFT JOIN classes c ON lr.class_id=c.id
    JOIN users u ON lr.uploaded_by=u.id
    LEFT JOIN resource_ratings rr ON rr.resource_id=lr.id
    WHERE lr.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (subjectId) { sql += ` AND lr.subject_id=$${i++}`; params.push(subjectId); }
  if (classId) { sql += ` AND (lr.class_id=$${i++} OR lr.class_id IS NULL)`; params.push(classId); }
  if (resourceType) { sql += ` AND lr.resource_type=$${i++}`; params.push(resourceType); }
  if (level) { sql += ` AND (lr.level=$${i++} OR lr.level IS NULL)`; params.push(level); }
  if (curriculum) { sql += ` AND lr.curriculum=$${i++}`; params.push(curriculum); }
  if (search) {
    sql += ` AND (lr.title ILIKE $${i} OR lr.description ILIKE $${i} OR $${i}=ANY(lr.tags))`;
    params.push(`%${search}%`); i++;
  }
  sql += ' GROUP BY lr.id, sub.name, c.name, u.first_name, u.last_name ORDER BY lr.created_at DESC';
  const result = await paginatedQuery(sql, params, parseInt(page), 30);
  res.json(result);
};

const uploadResource = async (req, res) => {
  const { title, description, resourceType, subjectId, classId, level, curriculum, fileUrl, externalUrl, tags, isPublic } = req.body;
  if (!title || (!fileUrl && !externalUrl)) return res.status(400).json({ error: 'title and fileUrl/externalUrl required' });

  const { rows } = await query(
    `INSERT INTO learning_resources(school_id, title, description, resource_type, subject_id, class_id, level,
       curriculum, file_url, external_url, tags, is_public, uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.schoolId, title, description, resourceType||'note', subjectId, classId, level,
     curriculum||'cbc', fileUrl, externalUrl, tags||[], isPublic||false, req.user.id]
  );
  res.status(201).json(rows[0]);
};

const rateResource = async (req, res) => {
  const { rating, comment } = req.body;
  await query(
    `INSERT INTO resource_ratings(resource_id, user_id, rating, comment) VALUES($1,$2,$3,$4)
     ON CONFLICT(resource_id, user_id) DO UPDATE SET rating=$3, comment=$4`,
    [req.params.id, req.user.id, rating, comment]
  );
  const { rows } = await query(
    'SELECT ROUND(AVG(rating),1) as avg FROM resource_ratings WHERE resource_id=$1', [req.params.id]
  );
  await query('UPDATE learning_resources SET rating=$1 WHERE id=$2', [rows[0].avg, req.params.id]);
  res.json({ message: 'Rated', newAvg: rows[0].avg });
};

const trackView = async (req, res) => {
  await query('UPDATE learning_resources SET view_count=view_count+1 WHERE id=$1', [req.params.id]);
  res.json({ message: 'View tracked' });
};

module.exports = { getResources, uploadResource, rateResource, trackView };


// ============================================================
// Student Timeline Controller
// ============================================================
const getStudentTimeline = async (req, res) => {
  const { studentId } = req.params;
  const { category, from, to, limit = 50 } = req.query;

  let sql = `SELECT * FROM student_timeline WHERE student_id=$1 AND school_id=$2`;
  const params = [studentId, req.schoolId]; let i = 3;
  if (category) { sql += ` AND category=$${i++}`; params.push(category); }
  if (from) { sql += ` AND event_date >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND event_date <= $${i++}`; params.push(to); }
  sql += ` ORDER BY event_date DESC, created_at DESC LIMIT $${i}`;
  params.push(parseInt(limit));

  const { rows } = await query(sql, params);
  res.json(rows);
};

const addTimelineEvent = async (req, res) => {
  const { studentId, eventType, title, description, eventDate, category, icon, colour, metadata } = req.body;
  const { rows } = await query(
    `INSERT INTO student_timeline(school_id, student_id, event_type, title, description, event_date, category, icon, colour, metadata)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *`,
    [req.schoolId, studentId||req.params.studentId, eventType, title, description,
     eventDate||new Date().toISOString().split('T')[0], category||'academic', icon, colour, JSON.stringify(metadata||{})]
  );
  res.status(201).json(rows[0]);
};

const getFullStudentProfile = async (req, res) => {
  const { studentId } = req.params;

  const [studentRes, marksRes, timelineRes, badgesRes, attendanceRes, clubsRes, sportsRes] = await Promise.allSettled([
    query(
      `SELECT s.*, c.name as class_name, c.level, c.stream,
              u_ct.first_name||' '||u_ct.last_name as class_teacher_name
       FROM students s LEFT JOIN classes c ON s.current_class_id=c.id
       LEFT JOIN users u_ct ON c.class_teacher_id=u_ct.id
       WHERE s.id=$1 AND s.school_id=$2`,
      [studentId, req.schoolId]
    ),
    query(
      `SELECT es.name as exam, AVG(sm.marks) as avg_marks, AVG(sm.points) as avg_points
       FROM student_marks sm JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       JOIN exam_series es ON ep.exam_series_id=es.id
       WHERE sm.student_id=$1 AND sm.school_id=$2 AND sm.is_absent=false
       GROUP BY es.id ORDER BY es.created_at DESC LIMIT 5`,
      [studentId, req.schoolId]
    ),
    query(
      'SELECT * FROM student_timeline WHERE student_id=$1 AND school_id=$2 ORDER BY event_date DESC LIMIT 20',
      [studentId, req.schoolId]
    ),
    query(
      `SELECT sb.awarded_at, bd.name, bd.icon, bd.colour, bd.category
       FROM student_badges sb JOIN badge_definitions bd ON sb.badge_id=bd.id
       WHERE sb.student_id=$1 AND sb.school_id=$2`,
      [studentId, req.schoolId]
    ),
    query(
      `SELECT ROUND(100.0*COUNT(*) FILTER (WHERE status='present')/NULLIF(COUNT(*),0),1) as rate,
              COUNT(*) FILTER (WHERE status='absent') as absent_days
       FROM attendance_records WHERE student_id=$1 AND school_id=$2`,
      [studentId, req.schoolId]
    ),
    query(
      `SELECT cl.name, cl.category, cm.role FROM club_memberships cm
       JOIN clubs cl ON cm.club_id=cl.id WHERE cm.student_id=$1 AND cm.is_active=true`,
      [studentId]
    ),
    query(
      `SELECT t.name as team, t.sport, ss.position FROM student_sports ss
       JOIN sports_teams t ON ss.team_id=t.id WHERE ss.student_id=$1 AND ss.is_active=true`,
      [studentId]
    ),
  ]);

  res.json({
    student: studentRes.status === 'fulfilled' ? studentRes.value.rows[0] : null,
    examHistory: marksRes.status === 'fulfilled' ? marksRes.value.rows : [],
    timeline: timelineRes.status === 'fulfilled' ? timelineRes.value.rows : [],
    badges: badgesRes.status === 'fulfilled' ? badgesRes.value.rows : [],
    attendance: attendanceRes.status === 'fulfilled' ? attendanceRes.value.rows[0] : {},
    clubs: clubsRes.status === 'fulfilled' ? clubsRes.value.rows : [],
    sports: sportsRes.status === 'fulfilled' ? sportsRes.value.rows : [],
  });
};

module.exports = {
  ...module.exports,
  getStudentTimeline, addTimelineEvent, getFullStudentProfile,
};
