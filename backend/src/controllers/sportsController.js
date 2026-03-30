// ============================================================
// Sports & Games Controller
// Teams, fixtures, results, inter-house, sports day
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');

// ── TEAMS ─────────────────────────────────────────────────────
const getTeams = async (req, res) => {
  const { sport, gender, category } = req.query;
  let sql = `
    SELECT t.*,
           u.first_name || ' ' || u.last_name as coach_name,
           s.first_name || ' ' || s.last_name as captain_name,
           COUNT(DISTINCT ss.id) FILTER (WHERE ss.is_active=true) as player_count,
           COUNT(DISTINCT se.id) as events_played,
           COUNT(DISTINCT se.id) FILTER (WHERE se.result='win') as wins,
           COUNT(DISTINCT se.id) FILTER (WHERE se.result='loss') as losses,
           COUNT(DISTINCT se.id) FILTER (WHERE se.result='draw') as draws
    FROM sports_teams t
    LEFT JOIN users u ON t.coach_id=u.id
    LEFT JOIN students s ON t.captain_id=s.id
    LEFT JOIN student_sports ss ON ss.team_id=t.id
    LEFT JOIN sports_events se ON se.team_id=t.id
    WHERE t.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (sport) { sql += ` AND t.sport=$${i++}`; params.push(sport); }
  if (gender) { sql += ` AND t.gender=$${i++}`; params.push(gender); }
  if (category) { sql += ` AND t.category=$${i++}`; params.push(category); }
  sql += ' GROUP BY t.id, u.first_name, u.last_name, s.first_name, s.last_name ORDER BY t.sport, t.name';
  const { rows } = await query(sql, params);
  res.json(rows);
};

const createTeam = async (req, res) => {
  const { name, sport, category, gender, coachId, captainId, kitColours } = req.body;
  if (!name || !sport) return res.status(400).json({ error: 'name and sport required' });
  const { rows } = await query(
    `INSERT INTO sports_teams(school_id, name, sport, category, gender, coach_id, captain_id, kit_colours)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.schoolId, name, sport, category || 'open', gender || 'mixed', coachId, captainId, kitColours]
  );
  res.status(201).json(rows[0]);
};

const updateTeam = async (req, res) => {
  const { name, sport, coachId, captainId, isActive, achievements, kitColours } = req.body;
  const { rows } = await query(
    `UPDATE sports_teams SET name=$1, sport=$2, coach_id=$3, captain_id=$4,
       is_active=$5, achievements=$6, kit_colours=$7 WHERE id=$8 AND school_id=$9 RETURNING *`,
    [name, sport, coachId, captainId, isActive, achievements, kitColours, req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Team not found' });
  res.json(rows[0]);
};

// ── TEAM PLAYERS ──────────────────────────────────────────────
const getTeamPlayers = async (req, res) => {
  const { rows } = await query(
    `SELECT ss.*, s.first_name, s.last_name, s.admission_number, s.gender,
            s.photo_url, c.name as class_name
     FROM student_sports ss
     JOIN students s ON ss.student_id=s.id
     LEFT JOIN classes c ON s.current_class_id=c.id
     WHERE ss.team_id=$1 AND ss.school_id=$2 AND ss.is_active=true
     ORDER BY s.first_name`,
    [req.params.teamId, req.schoolId]
  );
  res.json(rows);
};

const addPlayerToTeam = async (req, res) => {
  const { studentId, position, jerseyNumber } = req.body;
  const { rows } = await query(
    `INSERT INTO student_sports(school_id, student_id, team_id, position, jersey_number)
     VALUES($1,$2,$3,$4,$5) ON CONFLICT(student_id, team_id) DO UPDATE
       SET position=$4, jersey_number=$5, is_active=true, left_date=NULL
     RETURNING *`,
    [req.schoolId, studentId, req.params.teamId, position, jerseyNumber]
  );
  res.status(201).json(rows[0]);
};

const removePlayerFromTeam = async (req, res) => {
  await query(
    'UPDATE student_sports SET is_active=false, left_date=CURRENT_DATE WHERE student_id=$1 AND team_id=$2 AND school_id=$3',
    [req.params.studentId, req.params.teamId, req.schoolId]
  );
  res.json({ message: 'Player removed from team' });
};

// ── EVENTS / FIXTURES ─────────────────────────────────────────
const getEvents = async (req, res) => {
  const { page = 1, limit = 30, teamId, sport, result, from, to, level } = req.query;
  let sql = `
    SELECT se.*, t.name as team_name, t.sport as team_sport,
           s.first_name || ' ' || s.last_name as mvp_name
    FROM sports_events se
    LEFT JOIN sports_teams t ON se.team_id=t.id
    LEFT JOIN students s ON se.mvp_student_id=s.id
    WHERE se.school_id=$1
  `;
  const params = [req.schoolId]; let i = 2;
  if (teamId) { sql += ` AND se.team_id=$${i++}`; params.push(teamId); }
  if (sport) { sql += ` AND se.sport=$${i++}`; params.push(sport); }
  if (result) { sql += ` AND se.result=$${i++}`; params.push(result); }
  if (level) { sql += ` AND se.competition_level=$${i++}`; params.push(level); }
  if (from) { sql += ` AND se.event_date >= $${i++}`; params.push(from); }
  if (to) { sql += ` AND se.event_date <= $${i++}`; params.push(to); }
  sql += ' ORDER BY se.event_date DESC';
  const result2 = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result2);
};

const createEvent = async (req, res) => {
  const {
    teamId, name, sport, competitionLevel, opponentName, opponentSchool,
    eventDate, venue, isHome, notes,
  } = req.body;
  if (!name || !eventDate) return res.status(400).json({ error: 'name and eventDate required' });
  const { rows } = await query(
    `INSERT INTO sports_events(school_id, team_id, name, sport, competition_level, opponent_name, opponent_school,
       event_date, venue, is_home, result, notes, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12) RETURNING *`,
    [req.schoolId, teamId, name, sport, competitionLevel || 'inter_school', opponentName, opponentSchool,
     eventDate, venue, isHome !== false, notes, req.user.id]
  );
  res.status(201).json(rows[0]);
};

const updateEventResult = async (req, res) => {
  const { ourScore, opponentScore, result, positionAchieved, mvpStudentId, scorers, notes, photos } = req.body;
  const { rows } = await query(
    `UPDATE sports_events SET
       our_score=$1, opponent_score=$2, result=$3, position_achieved=$4,
       mvp_student_id=$5, scorers=$6, notes=$7, photos=$8
     WHERE id=$9 AND school_id=$10 RETURNING *`,
    [ourScore, opponentScore, result, positionAchieved, mvpStudentId,
     JSON.stringify(scorers || []), notes, JSON.stringify(photos || []),
     req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Event not found' });
  res.json(rows[0]);
};

// ── SCHOOL HOUSES ─────────────────────────────────────────────
const getHouses = async (req, res) => {
  const { rows } = await query(
    `SELECT h.*,
            u.first_name || ' ' || u.last_name as patron_name,
            s.first_name || ' ' || s.last_name as captain_name,
            COALESCE(SUM(he.points_awarded), 0) as total_points
     FROM school_houses h
     LEFT JOIN users u ON h.patron_id=u.id
     LEFT JOIN students s ON h.captain_id=s.id
     LEFT JOIN house_events he ON he.house_id=h.id
     WHERE h.school_id=$1
     GROUP BY h.id, u.first_name, u.last_name, s.first_name, s.last_name
     ORDER BY total_points DESC`,
    [req.schoolId]
  );
  res.json(rows);
};

const createHouse = async (req, res) => {
  const { name, colour, patronId, captainId } = req.body;
  const { rows } = await query(
    `INSERT INTO school_houses(school_id, name, colour, patron_id, captain_id)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.schoolId, name, colour, patronId, captainId]
  );
  res.status(201).json(rows[0]);
};

const logHouseEvent = async (req, res) => {
  const { houseId, eventName, eventDate, category, position, pointsAwarded, participantIds } = req.body;
  const { rows } = await query(
    `INSERT INTO house_events(school_id, house_id, event_name, event_date, category, position, points_awarded, participant_ids)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.schoolId, houseId, eventName, eventDate, category, position, pointsAwarded || 0, participantIds || []]
  );
  res.status(201).json(rows[0]);
};

// ── SPORTS STATS ──────────────────────────────────────────────
const getSportsStats = async (req, res) => {
  const [teamsRes, eventsRes, winsRes] = await Promise.allSettled([
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active=true) as active FROM sports_teams WHERE school_id=$1`, [req.schoolId]),
    query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE result='win') as wins,
                  COUNT(*) FILTER (WHERE result='loss') as losses, COUNT(*) FILTER (WHERE result='draw') as draws
           FROM sports_events WHERE school_id=$1`, [req.schoolId]),
    query(`SELECT sport, COUNT(*) FILTER (WHERE result='win') as wins, COUNT(*) as played
           FROM sports_events WHERE school_id=$1 GROUP BY sport ORDER BY wins DESC`, [req.schoolId]),
  ]);

  res.json({
    teams: teamsRes.status === 'fulfilled' ? teamsRes.value.rows[0] : {},
    events: eventsRes.status === 'fulfilled' ? eventsRes.value.rows[0] : {},
    bySport: winsRes.status === 'fulfilled' ? winsRes.value.rows : [],
  });
};

// ── Student's sports profile ──────────────────────────────────
const getStudentSports = async (req, res) => {
  const { rows: teams } = await query(
    `SELECT ss.*, t.name as team_name, t.sport, t.category, t.gender
     FROM student_sports ss JOIN sports_teams t ON ss.team_id=t.id
     WHERE ss.student_id=$1 AND ss.school_id=$2`,
    [req.params.studentId, req.schoolId]
  );
  const { rows: achievements } = await query(
    `SELECT se.name, se.event_date, se.competition_level, se.position_achieved,
            se.our_score, se.result, t.sport
     FROM sports_events se
     JOIN sports_teams t ON se.team_id=t.id
     WHERE $1=ANY(se.players) AND se.school_id=$2
     ORDER BY se.event_date DESC`,
    [req.params.studentId, req.schoolId]
  );
  res.json({ teams, achievements });
};

module.exports = {
  getTeams, createTeam, updateTeam,
  getTeamPlayers, addPlayerToTeam, removePlayerFromTeam,
  getEvents, createEvent, updateEventResult,
  getHouses, createHouse, logHouseEvent,
  getSportsStats, getStudentSports,
};
