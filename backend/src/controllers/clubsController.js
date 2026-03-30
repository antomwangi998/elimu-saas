// ============================================================
// Clubs & Co-curricular Controller
// ============================================================
const { query, withTransaction } = require('../config/database');

const getClubs = async (req, res) => {
  const { rows } = await query(
    `SELECT cl.*, u.first_name||' '||u.last_name as patron_name,
             COUNT(cm.id) FILTER (WHERE cm.is_active=true) as member_count
     FROM clubs cl
     LEFT JOIN users u ON cl.patron_id=u.id
     LEFT JOIN club_memberships cm ON cm.club_id=cl.id
     WHERE cl.school_id=$1 AND cl.is_active=true
     GROUP BY cl.id, u.first_name, u.last_name ORDER BY cl.category,cl.name`,
    [req.schoolId]
  );
  res.json(rows);
};

const getClub = async (req, res) => {
  const { rows } = await query(
    `SELECT cl.*, u.first_name||' '||u.last_name as patron_name
     FROM clubs cl LEFT JOIN users u ON cl.patron_id=u.id
     WHERE cl.id=$1 AND cl.school_id=$2`,
    [req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Club not found' });

  const { rows: members } = await query(
    `SELECT cm.role, cm.joined_date,
             s.id, s.admission_number, s.first_name||' '||s.last_name as name,
             c.name as class_name
     FROM club_memberships cm
     JOIN students s ON cm.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE cm.club_id=$1 AND cm.is_active=true
     ORDER BY cm.role,s.first_name`,
    [req.params.id]
  );

  const { rows: events } = await query(
    'SELECT * FROM club_events WHERE club_id=$1 ORDER BY event_date DESC LIMIT 10',
    [req.params.id]
  );

  res.json({ ...rows[0], members, events });
};

const createClub = async (req, res) => {
  const { name, code, category, description, patronId, meetingDay, meetingTime, meetingVenue } = req.body;
  const { rows } = await query(
    `INSERT INTO clubs(school_id,name,code,category,description,patron_id,meeting_day,meeting_time,meeting_venue)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.schoolId, name, code, category || 'clubs', description, patronId, meetingDay, meetingTime, meetingVenue]
  );
  res.status(201).json(rows[0]);
};

const addMember = async (req, res) => {
  const { clubId } = req.params;
  const { studentId, role } = req.body;
  const { rows } = await query(
    `INSERT INTO club_memberships(club_id,student_id,school_id,role)
     VALUES($1,$2,$3,$4) ON CONFLICT(club_id,student_id)
     DO UPDATE SET is_active=true, role=$4 RETURNING *`,
    [clubId, studentId, req.schoolId, role || 'member']
  );
  res.status(201).json(rows[0]);
};

const removeMember = async (req, res) => {
  const { clubId, studentId } = req.params;
  await query(
    'UPDATE club_memberships SET is_active=false,left_date=CURRENT_DATE WHERE club_id=$1 AND student_id=$2',
    [clubId, studentId]
  );
  res.json({ message: 'Member removed' });
};

const addEvent = async (req, res) => {
  const { clubId } = req.params;
  const { name, description, eventDate, venue, result, position, participants } = req.body;
  const { rows } = await query(
    `INSERT INTO club_events(club_id,school_id,name,description,event_date,venue,result,position,participants,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [clubId, req.schoolId, name, description, eventDate, venue, result, position, participants || [], req.user.id]
  );
  res.status(201).json(rows[0]);
};

module.exports = { getClubs, getClub, createClub, addMember, removeMember, addEvent };
