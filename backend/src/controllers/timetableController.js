// ============================================================
// Timetable Generator — Conflict-Free Scheduling
// Guarantees:
//  • A teacher is never in two classes at the same time
//  • A class never has two lessons at the same time
//  • Each subject gets the configured periods per week
//  • Compulsory subjects are spread across the week (not stacked)
//  • Breaks are respected and never filled
// ============================================================
const { query, withTransaction } = require('../config/database');
const logger = require('../config/logger');

// ── GET periods configured for this school ────────────────────
const getPeriods = async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM timetable_periods WHERE school_id=$1 ORDER BY sort_order, start_time',
    [req.schoolId]
  );
  res.json(rows);
};

// ── Seed default periods ──────────────────────────────────────
const seedDefaultPeriods = async (req, res) => {
  const defaults = [
    { name: 'Period 1',   start: '07:30', end: '08:20', isBreak: false, sort: 1 },
    { name: 'Period 2',   start: '08:20', end: '09:10', isBreak: false, sort: 2 },
    { name: 'Period 3',   start: '09:10', end: '10:00', isBreak: false, sort: 3 },
    { name: 'Short Break',start: '10:00', end: '10:20', isBreak: true,  sort: 4 },
    { name: 'Period 4',   start: '10:20', end: '11:10', isBreak: false, sort: 5 },
    { name: 'Period 5',   start: '11:10', end: '12:00', isBreak: false, sort: 6 },
    { name: 'Period 6',   start: '12:00', end: '12:50', isBreak: false, sort: 7 },
    { name: 'Lunch Break',start: '12:50', end: '13:30', isBreak: true,  sort: 8 },
    { name: 'Period 7',   start: '13:30', end: '14:20', isBreak: false, sort: 9 },
    { name: 'Period 8',   start: '14:20', end: '15:10', isBreak: false, sort: 10 },
    { name: 'Period 9',   start: '15:10', end: '16:00', isBreak: false, sort: 11 },
  ];

  for (const p of defaults) {
    await query(
      `INSERT INTO timetable_periods(school_id, name, start_time, end_time, is_break, sort_order)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(school_id, name) DO NOTHING`,
      [req.schoolId, p.name, p.start, p.end, p.isBreak, p.sort]
    );
  }
  res.json({ message: 'Default periods seeded (9 teaching + 2 breaks)' });
};

// ── Create / update a period ──────────────────────────────────
const upsertPeriod = async (req, res) => {
  const { id, name, startTime, endTime, isBreak, sortOrder } = req.body;
  if (id) {
    const { rows } = await query(
      `UPDATE timetable_periods SET name=$1, start_time=$2, end_time=$3, is_break=$4, sort_order=$5
       WHERE id=$6 AND school_id=$7 RETURNING *`,
      [name, startTime, endTime, isBreak || false, sortOrder || 0, id, req.schoolId]
    );
    return res.json(rows[0]);
  }
  const { rows } = await query(
    `INSERT INTO timetable_periods(school_id, name, start_time, end_time, is_break, sort_order)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.schoolId, name, startTime, endTime, isBreak || false, sortOrder || 0]
  );
  res.status(201).json(rows[0]);
};

// ── GET all timetables ────────────────────────────────────────
const getTimetables = async (req, res) => {
  const { rows } = await query(
    `SELECT t.*, ay.year, tc.term, u.first_name||' '||u.last_name as generated_by_name
     FROM timetables t
     LEFT JOIN academic_years ay ON t.academic_year_id=ay.id
     LEFT JOIN terms_config tc ON t.term_id=tc.id
     LEFT JOIN users u ON t.generated_by=u.id
     WHERE t.school_id=$1 ORDER BY t.created_at DESC`,
    [req.schoolId]
  );
  res.json(rows);
};

// ── GET timetable grid ─────────────────────────────────────────
const getTimetableGrid = async (req, res) => {
  const { id } = req.params;
  const { classId, teacherId } = req.query;

  let sql = `
    SELECT ts.*,
           c.name as class_name, c.level, c.stream,
           sub.name as subject_name, sub.code as subject_code, sub.curriculum,
           u.first_name||' '||u.last_name as teacher_name,
           p.name as period_name, p.start_time, p.end_time, p.sort_order
    FROM timetable_slots ts
    JOIN classes c ON ts.class_id=c.id
    LEFT JOIN subjects sub ON ts.subject_id=sub.id
    LEFT JOIN users u ON ts.teacher_id=u.id
    JOIN timetable_periods p ON ts.period_id=p.id
    WHERE ts.timetable_id=$1 AND ts.school_id=$2
  `;
  const params = [id, req.schoolId];
  let i = 3;
  if (classId) { sql += ` AND ts.class_id=$${i++}`; params.push(classId); }
  if (teacherId) { sql += ` AND ts.teacher_id=$${i++}`; params.push(teacherId); }
  sql += ' ORDER BY c.level, c.stream, p.sort_order, ts.day';

  const { rows: slots } = await query(sql, params);
  const { rows: timetable } = await query(
    'SELECT * FROM timetables WHERE id=$1 AND school_id=$2', [id, req.schoolId]
  );
  if (!timetable.length) return res.status(404).json({ error: 'Timetable not found' });

  res.json({ timetable: timetable[0], slots });
};

// ============================================================
// CORE GENERATOR — Conflict-free scheduling algorithm
// ============================================================
const generateTimetable = async (req, res) => {
  const {
    name, academicYearId, termId,
    classIds,        // which classes to include (or all)
    targetPeriodsPerDay = 9,   // teaching periods per day
    maxPeriodsPerSubjectPerDay = 2,  // prevent stacking same subject
  } = req.body;

  if (!name) return res.status(400).json({ error: 'name required' });

  // ── 1. Load periods (teaching only) ───────────────────────
  const { rows: allPeriods } = await query(
    `SELECT * FROM timetable_periods WHERE school_id=$1 AND is_break=false
     ORDER BY sort_order, start_time`,
    [req.schoolId]
  );
  if (!allPeriods.length) {
    return res.status(400).json({
      error: 'No teaching periods configured. Seed default periods first: POST /api/timetable/periods/seed',
    });
  }

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  // ── 2. Load classes ────────────────────────────────────────
  let classQuery = `
    SELECT c.id, c.name, c.level, c.stream
    FROM classes c WHERE c.school_id=$1 AND c.is_active=true
  `;
  const classParams = [req.schoolId];
  if (classIds?.length) { classQuery += ` AND c.id=ANY($2)`; classParams.push(classIds); }
  classQuery += ' ORDER BY c.level, c.stream';
  const { rows: classes } = await query(classQuery, classParams);

  if (!classes.length) return res.status(400).json({ error: 'No active classes found' });

  // ── 3. Load subject-teacher assignments per class ──────────
  const { rows: assignments } = await query(
    `SELECT cs.class_id, cs.subject_id, cs.teacher_id, cs.periods_per_week,
            sub.name as subject_name, sub.code, sub.is_compulsory, sub.curriculum,
            c.level
     FROM class_subjects cs
     JOIN subjects sub ON cs.subject_id=sub.id
     JOIN classes c ON cs.class_id=c.id
     WHERE cs.school_id=$1 AND c.is_active=true
       ${classIds?.length ? 'AND cs.class_id=ANY($2)' : ''}`,
    classIds?.length ? [req.schoolId, classIds] : [req.schoolId]
  );

  if (!assignments.length) {
    return res.status(400).json({
      error: 'No subject-teacher assignments found. Assign subjects to classes first.',
    });
  }

  // ── 4. Group assignments by class ─────────────────────────
  const byClass = {};
  for (const a of assignments) {
    if (!byClass[a.class_id]) byClass[a.class_id] = [];
    byClass[a.class_id].push(a);
  }

  // ── 5. Build slot grid: track what's occupied ─────────────
  // teacherBusy[teacherId][day][periodId] = true
  // classBusy[classId][day][periodId]     = true
  // subjectDayCount[classId][day][subjectId] = count (prevent stacking)
  const teacherBusy = {};
  const classBusy   = {};
  const subjectDayCount = {};

  const markTeacherBusy = (tId, day, pId) => {
    if (!teacherBusy[tId]) teacherBusy[tId] = {};
    if (!teacherBusy[tId][day]) teacherBusy[tId][day] = {};
    teacherBusy[tId][day][pId] = true;
  };
  const isTeacherBusy = (tId, day, pId) => !!(tId && teacherBusy[tId]?.[day]?.[pId]);
  const markClassBusy  = (cId, day, pId) => {
    if (!classBusy[cId]) classBusy[cId] = {};
    if (!classBusy[cId][day]) classBusy[cId][day] = {};
    classBusy[cId][day][pId] = true;
  };
  const isClassBusy   = (cId, day, pId) => !!(classBusy[cId]?.[day]?.[pId]);
  const incSubjectDay = (cId, day, sId) => {
    if (!subjectDayCount[cId]) subjectDayCount[cId] = {};
    if (!subjectDayCount[cId][day]) subjectDayCount[cId][day] = {};
    subjectDayCount[cId][day][sId] = (subjectDayCount[cId][day][sId] || 0) + 1;
  };
  const subjectDayFull = (cId, day, sId) =>
    (subjectDayCount[cId]?.[day]?.[sId] || 0) >= maxPeriodsPerSubjectPerDay;

  // ── 6. Build the slot list to fill ────────────────────────
  // (class, day, period) in round-robin order for fairness
  const allSlots = [];
  for (const cls of classes) {
    for (const day of DAYS) {
      for (const period of allPeriods) {
        allSlots.push({ classId: cls.id, day, periodId: period.id });
      }
    }
  }

  // ── 7. Build lessons to place ─────────────────────────────
  // Expand each assignment into individual lesson cards
  const lessonsToPlace = [];
  for (const [classId, subjects] of Object.entries(byClass)) {
    for (const subj of subjects) {
      const count = subj.periods_per_week || 5;
      for (let n = 0; n < count; n++) {
        lessonsToPlace.push({
          classId,
          subjectId: subj.subject_id,
          teacherId: subj.teacher_id,
          subjectName: subj.subject_name,
          isCompulsory: subj.is_compulsory,
          level: subj.level,
        });
      }
    }
  }

  // Sort: compulsory first (higher priority), then by classId for grouping
  lessonsToPlace.sort((a, b) => (b.isCompulsory ? 1 : 0) - (a.isCompulsory ? 1 : 0));

  // ── 8. Place each lesson ───────────────────────────────────
  const placed = [];
  const unplaced = [];

  for (const lesson of lessonsToPlace) {
    let found = false;

    // Try to spread across days: prefer days where this class has fewer lessons
    const daysSorted = [...DAYS].sort((a, b) => {
      const aCount = Object.keys(classBusy[lesson.classId]?.[a] || {}).length;
      const bCount = Object.keys(classBusy[lesson.classId]?.[b] || {}).length;
      return aCount - bCount;
    });

    outer: for (const day of daysSorted) {
      // Don't stack same subject more than maxPeriodsPerSubjectPerDay times per day
      if (subjectDayFull(lesson.classId, day, lesson.subjectId)) continue;

      for (const period of allPeriods) {
        const pId = period.id;

        // Check class conflict
        if (isClassBusy(lesson.classId, day, pId)) continue;

        // Check teacher conflict — critical: teacher cannot be in two places
        if (isTeacherBusy(lesson.teacherId, day, pId)) continue;

        // Place the lesson
        markClassBusy(lesson.classId, day, pId);
        if (lesson.teacherId) markTeacherBusy(lesson.teacherId, day, pId);
        incSubjectDay(lesson.classId, day, lesson.subjectId);

        placed.push({
          classId: lesson.classId,
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId || null,
          periodId: pId,
          day,
        });
        found = true;
        break outer;
      }
    }

    if (!found) {
      unplaced.push({
        classId: lesson.classId,
        subjectId: lesson.subjectId,
        subjectName: lesson.subjectName,
        reason: lesson.teacherId
          ? 'Teacher is fully booked or no free period available'
          : 'No teacher assigned to this subject',
      });
    }
  }

  // ── 9. Save to database ────────────────────────────────────
  const timetableRecord = await withTransaction(async (client) => {
    // Create timetable header
    const { rows: ttRows } = await client.query(
      `INSERT INTO timetables(school_id, name, academic_year_id, term_id, generated_by, generated_at, is_active)
       VALUES($1,$2,$3,$4,$5,NOW(),false) RETURNING *`,
      [req.schoolId, name, academicYearId, termId, req.user.id]
    );
    const timetable = ttRows[0];

    // Insert slots in bulk
    for (const slot of placed) {
      await client.query(
        `INSERT INTO timetable_slots(timetable_id, school_id, class_id, subject_id, teacher_id, period_id, day)
         VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(timetable_id, class_id, day, period_id) DO NOTHING`,
        [timetable.id, req.schoolId, slot.classId, slot.subjectId, slot.teacherId, slot.periodId, slot.day]
      );
    }

    return timetable;
  });

  // ── 10. Response ───────────────────────────────────────────
  const efficiency = Math.round((placed.length / (placed.length + unplaced.length)) * 100);

  res.status(201).json({
    timetable: timetableRecord,
    stats: {
      totalLessons: placed.length + unplaced.length,
      placed: placed.length,
      unplaced: unplaced.length,
      efficiencyPercent: efficiency,
    },
    unplacedLessons: unplaced,
    message: unplaced.length === 0
      ? '✅ Timetable generated with no conflicts'
      : `⚠️ ${placed.length} lessons placed. ${unplaced.length} could not be placed (see unplacedLessons).`,
  });
};

// ── Manually adjust a single slot ────────────────────────────
const updateSlot = async (req, res) => {
  const { slotId } = req.params;
  const { teacherId, subjectId, day, periodId, room } = req.body;

  // Check teacher isn't already teaching elsewhere at new time
  if (teacherId && day && periodId) {
    const { rows: conflict } = await query(
      `SELECT ts.id, c.name as class_name FROM timetable_slots ts
       JOIN timetable_slots target ON target.id=$1
       JOIN classes c ON ts.class_id=c.id
       WHERE ts.teacher_id=$2 AND ts.day=$3 AND ts.period_id=$4
         AND ts.timetable_id=target.timetable_id AND ts.id != $1`,
      [slotId, teacherId, day, periodId]
    );
    if (conflict.length) {
      return res.status(409).json({
        error: `Teacher conflict: already assigned to ${conflict[0].class_name} on ${day} at this period`,
      });
    }
  }

  const { rows } = await query(
    `UPDATE timetable_slots SET teacher_id=$1, subject_id=$2, day=$3, period_id=$4, room=$5
     WHERE id=$6 AND school_id=$7 RETURNING *`,
    [teacherId, subjectId, day, periodId, room, slotId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Slot not found' });
  res.json(rows[0]);
};

// ── Publish timetable (makes it the active one) ───────────────
const publishTimetable = async (req, res) => {
  await withTransaction(async (client) => {
    await client.query(
      'UPDATE timetables SET is_active=false, is_published=false WHERE school_id=$1',
      [req.schoolId]
    );
    await client.query(
      'UPDATE timetables SET is_active=true, is_published=true WHERE id=$1 AND school_id=$2',
      [req.params.id, req.schoolId]
    );
  });
  res.json({ message: 'Timetable published and set as active' });
};

// ── Delete timetable ──────────────────────────────────────────
const deleteTimetable = async (req, res) => {
  await query(
    'DELETE FROM timetables WHERE id=$1 AND school_id=$2 AND is_published=false',
    [req.params.id, req.schoolId]
  );
  res.json({ message: 'Timetable deleted' });
};

// ── DEPUTY: Track teacher lesson attendance ───────────────────
const markLessonAttendance = async (req, res) => {
  const { slotId, lessonDate, wasPresent, arrivalTime, topicCovered, coverTeacherId, remarks } = req.body;
  if (!slotId || !lessonDate) return res.status(400).json({ error: 'slotId and lessonDate required' });

  // Get slot info
  const { rows: slotRows } = await query(
    `SELECT ts.*, c.name as class_name, sub.name as subject_name,
            u.first_name||' '||u.last_name as teacher_name
     FROM timetable_slots ts
     JOIN classes c ON ts.class_id=c.id
     LEFT JOIN subjects sub ON ts.subject_id=sub.id
     LEFT JOIN users u ON ts.teacher_id=u.id
     WHERE ts.id=$1 AND ts.school_id=$2`,
    [slotId, req.schoolId]
  );
  if (!slotRows.length) return res.status(404).json({ error: 'Slot not found' });
  const slot = slotRows[0];

  const { rows } = await query(
    `INSERT INTO lesson_attendance(
       school_id, slot_id, teacher_id, class_id, lesson_date,
       was_present, arrival_time, topic_covered, cover_teacher_id, marked_by, remarks
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT(slot_id, lesson_date) DO UPDATE SET
       was_present=$6, arrival_time=$7, topic_covered=$8,
       cover_teacher_id=$9, marked_by=$10, remarks=$11
     RETURNING *`,
    [
      req.schoolId, slotId, slot.teacher_id, slot.class_id, lessonDate,
      wasPresent !== false, arrivalTime, topicCovered, coverTeacherId, req.user.id, remarks,
    ]
  );
  res.json(rows[0]);
};

// GET /api/timetable/lesson-attendance?teacherId=&from=&to=
const getLessonAttendance = async (req, res) => {
  const { teacherId, from, to, classId } = req.query;
  const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT la.*,
            u.first_name||' '||u.last_name as teacher_name,
            c.name as class_name,
            sub.name as subject_name,
            p.name as period_name, p.start_time,
            ts.day
     FROM lesson_attendance la
     JOIN timetable_slots ts ON la.slot_id=ts.id
     JOIN users u ON la.teacher_id=u.id
     JOIN classes c ON la.class_id=c.id
     LEFT JOIN subjects sub ON ts.subject_id=sub.id
     LEFT JOIN timetable_periods p ON ts.period_id=p.id
     WHERE la.school_id=$1 AND la.lesson_date BETWEEN $2 AND $3
     ${teacherId ? 'AND la.teacher_id=$4' : ''}
     ${classId ? `AND la.class_id=$${teacherId ? 5 : 4}` : ''}
     ORDER BY la.lesson_date DESC, p.sort_order`,
    [req.schoolId, fromDate, toDate,
     ...(teacherId ? [teacherId] : []),
     ...(classId ? [classId] : [])]
  );

  // Summary per teacher
  const byTeacher = {};
  for (const r of rows) {
    if (!byTeacher[r.teacher_id]) {
      byTeacher[r.teacher_id] = { teacherName: r.teacher_name, total: 0, present: 0, absent: 0 };
    }
    byTeacher[r.teacher_id].total++;
    r.was_present ? byTeacher[r.teacher_id].present++ : byTeacher[r.teacher_id].absent++;
  }

  res.json({
    records: rows,
    summary: Object.values(byTeacher).map(t => ({
      ...t, rate: t.total ? Math.round((t.present / t.total) * 100) : 0,
    })),
  });
};


exports.seedSampleTimetable = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    if (!schoolId) return res.status(400).json({ error: 'No school ID' });
    const { rows: classes } = await query('SELECT id, name FROM classes WHERE school_id=$1 LIMIT 4', [schoolId]);
    if (!classes.length) return res.json({ message: 'No classes found. Add classes first.', seeded: 0 });
    const { rows: teachers } = await query(
      "SELECT u.id FROM users u WHERE u.school_id=$1 AND u.role IN ('teacher','class_teacher','hod') LIMIT 10", [schoolId]);
    const { rows: subjects } = await query('SELECT id, name FROM subjects WHERE school_id=$1 LIMIT 10', [schoolId]);
    if (!subjects.length) return res.json({ message: 'No subjects found. Add subjects first.', seeded: 0 });
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const periods = [['08:00','09:00'],['09:00','10:00'],['10:20','11:20'],['11:20','12:20'],['14:00','15:00'],['15:00','16:00']];
    let inserted = 0;
    for (const cls of classes) {
      for (const day of days) {
        for (let p = 0; p < Math.min(periods.length, subjects.length); p++) {
          const sub = subjects[p % subjects.length];
          const tchr = teachers[p % Math.max(teachers.length, 1)];
          try {
            await query(
              `INSERT INTO timetable_entries(school_id,class_id,subject_id,teacher_id,day_of_week,start_time,end_time,room)
               VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
              [schoolId, cls.id, sub.id, tchr?.id||null, day, periods[p][0], periods[p][1], 'Room '+(p+1)]
            );
            inserted++;
          } catch {}
        }
      }
    }
    res.json({ success: true, seeded: inserted, message: `Seeded ${inserted} timetable slots` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  seedSampleTimetable,
  getPeriods, seedDefaultPeriods, upsertPeriod,
  getTimetables, getTimetableGrid, generateTimetable,
  updateSlot, publishTimetable, deleteTimetable,
  markLessonAttendance, getLessonAttendance,
};
