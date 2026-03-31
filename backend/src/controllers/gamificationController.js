// ============================================================
// Gamification Controller
// Points, badges, leaderboard, achievements
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');

// ── Award points ──────────────────────────────────────────────
const awardPoints = async (req, res) => {
  const { studentId, points, reason, category, term } = req.body;
  if (!studentId || !points) return res.status(400).json({ error: 'studentId and points required' });

  const year = new Date().getFullYear();
  await query(
    `INSERT INTO student_points(school_id, student_id, points, reason, category, awarded_by, academic_year, term)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [req.schoolId, studentId, points, reason, category || 'academic', req.user.id, year, term]
  );

  // Update leaderboard
  await updateLeaderboard(studentId, req.schoolId, year, term);

  // Check badge eligibility
  await checkAndAwardBadges(studentId, req.schoolId);

  res.status(201).json({ message: `${points} points awarded`, studentId, points });
};

// ── Get student points ────────────────────────────────────────
const getStudentPoints = async (req, res) => {
  const { studentId } = req.params;
  const year = req.query.year || new Date().getFullYear();

  const { rows: points } = await query(
    `SELECT SUM(points) as total, category FROM student_points
     WHERE student_id=$1 AND school_id=$2 AND academic_year=$3
     GROUP BY category`,
    [studentId, req.schoolId, year]
  );

  const { rows: badges } = await query(
    `SELECT sb.*, bd.name, bd.description, bd.icon, bd.colour, bd.category
     FROM student_badges sb JOIN badge_definitions bd ON sb.badge_id=bd.id
     WHERE sb.student_id=$1 AND sb.school_id=$2
     ORDER BY sb.awarded_at DESC`,
    [studentId, req.schoolId]
  );

  const { rows: rankRow } = await query(
    `SELECT rank_in_class, rank_in_school, total_points
     FROM student_leaderboard
     WHERE student_id=$1 AND school_id=$2 AND academic_year=$3
     ORDER BY term DESC LIMIT 1`,
    [studentId, req.schoolId, year]
  );

  const total = points.reduce((s, p) => s + parseInt(p.total || 0), 0);
  res.json({ totalPoints: total, byCategory: points, badges, rank: rankRow[0] });
};

// ── Leaderboard ───────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  const { classId, year, term, limit = 20 } = req.query;
  const currentYear = year || new Date().getFullYear();

  const { rows } = await query(
    `SELECT sl.rank_in_class, sl.rank_in_school, sl.total_points,
            sl.academic_points, sl.attendance_points, sl.behavior_points,
            s.first_name, s.last_name, s.admission_number, s.photo_url,
            c.name as class_name,
            COUNT(sb.id) as badge_count
     FROM student_leaderboard sl
     JOIN students s ON sl.student_id=s.id
     LEFT JOIN classes c ON sl.class_id=c.id
     LEFT JOIN student_badges sb ON sb.student_id=s.id
     WHERE sl.school_id=$1 AND sl.academic_year=$2
     ${classId ? 'AND sl.class_id=$3' : ''}
     ${term ? `AND sl.term=$${classId ? 4 : 3}` : ''}
     GROUP BY sl.id, s.id, c.name
     ORDER BY sl.total_points DESC LIMIT $${classId && term ? 5 : classId || term ? 4 : 3}`,
    [req.schoolId, currentYear,
     ...(classId ? [classId] : []),
     ...(term ? [term] : []),
     parseInt(limit)]
  );
  res.json(rows);
};

// ── Badge definitions ─────────────────────────────────────────
const getBadges = async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM badge_definitions WHERE school_id=$1 ORDER BY category, name',
    [req.schoolId]
  );
  res.json(rows);
};

const createBadge = async (req, res) => {
  const { name, description, category, icon, colour, pointsReward, criteria, isAutoAward } = req.body;
  const { rows } = await query(
    `INSERT INTO badge_definitions(school_id, name, description, category, icon, colour, points_reward, criteria, is_auto_award)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9) RETURNING *`,
    [req.schoolId, name, description, category, icon, colour, pointsReward || 10, JSON.stringify(criteria || {}), isAutoAward || false]
  );
  res.status(201).json(rows[0]);
};

// ── Internal: update leaderboard ──────────────────────────────
const updateLeaderboard = async (studentId, schoolId, year, term) => {
  const { rows: pts } = await query(
    `SELECT
       SUM(points) as total,
       SUM(points) FILTER (WHERE category='academic') as academic,
       SUM(points) FILTER (WHERE category='attendance') as attendance,
       SUM(points) FILTER (WHERE category='behavior') as behavior,
       SUM(points) FILTER (WHERE category IN ('clubs','sports','leadership')) as activity
     FROM student_points
     WHERE student_id=$1 AND school_id=$2 AND academic_year=$3`,
    [studentId, schoolId, year]
  );
  const p = pts[0];

  const { rows: classRows } = await query(
    'SELECT current_class_id FROM students WHERE id=$1', [studentId]
  );
  const classId = classRows[0]?.current_class_id;

  await query(
    `INSERT INTO student_leaderboard(school_id, student_id, class_id, academic_year, term,
       total_points, academic_points, attendance_points, behavior_points, activity_points)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT(student_id, academic_year, term) DO UPDATE SET
       total_points=$6, academic_points=$7, attendance_points=$8, behavior_points=$9, activity_points=$10, updated_at=NOW()`,
    [schoolId, studentId, classId, year, term || 'term_1',
     p.total || 0, p.academic || 0, p.attendance || 0, p.behavior || 0, p.activity || 0]
  );

  // Recalculate ranks for class
  if (classId) {
    await query(
      `UPDATE student_leaderboard sl
       SET rank_in_class = ranks.rank
       FROM (
         SELECT student_id,
                ROW_NUMBER() OVER (PARTITION BY class_id ORDER BY total_points DESC) as rank
         FROM student_leaderboard WHERE school_id=$1 AND class_id=$2 AND academic_year=$3
       ) ranks
       WHERE sl.student_id=ranks.student_id AND sl.school_id=$1`,
      [schoolId, classId, year]
    );
  }
};

// ── Internal: check and award badges automatically ────────────
const checkAndAwardBadges = async (studentId, schoolId) => {
  const { rows: autoBadges } = await query(
    'SELECT * FROM badge_definitions WHERE school_id=$1 AND is_auto_award=true',
    [schoolId]
  );

  for (const badge of autoBadges) {
    try {
      const crit = badge.criteria;
      let earned = false;

      if (crit.type === 'attendance_rate') {
        const { rows } = await query(
          `SELECT ROUND(100.0*COUNT(*) FILTER (WHERE status='present')/NULLIF(COUNT(*),0),1) as rate
           FROM attendance_records WHERE student_id=$1 AND school_id=$2`,
          [studentId, schoolId]
        );
        earned = parseFloat(rows[0]?.rate || 0) >= (crit.threshold || 90);
      } else if (crit.type === 'points_milestone') {
        const { rows } = await query(
          'SELECT SUM(points) as total FROM student_points WHERE student_id=$1 AND school_id=$2',
          [studentId, schoolId]
        );
        earned = parseInt(rows[0]?.total || 0) >= (crit.threshold || 100);
      } else if (crit.type === 'zero_incidents') {
        const { rows } = await query(
          'SELECT COUNT(*) as cnt FROM discipline_incidents WHERE student_id=$1 AND school_id=$2 AND resolved=false',
          [studentId, schoolId]
        );
        earned = parseInt(rows[0]?.cnt || 0) === 0;
      }

      if (earned) {
        await query(
          `INSERT INTO student_badges(school_id, student_id, badge_id, academic_year)
           VALUES($1,$2,$3,$4) ON CONFLICT(student_id, badge_id, academic_year) DO NOTHING`,
          [schoolId, studentId, badge.id, new Date().getFullYear()]
        );
      }
    } catch (e) { /* ignore individual badge errors */ }
  }
};

module.exports = { awardPoints, getStudentPoints, getLeaderboard, getBadges, createBadge };
