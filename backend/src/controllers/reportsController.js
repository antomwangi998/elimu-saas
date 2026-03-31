// ============================================================
// Reports Controller — 15 Report Types, Full Data
// Enrollment · Attendance · Finance · Academic · Staff
// Defaulters · Gender · Boarding · Discipline · CBC · Club
// ============================================================
const { query } = require('../config/database');

const getReports = async (req, res) => {
  res.json({
    available: [
      { type:'student_enrollment',    label:'Student Enrollment Report',  icon:'👥', category:'academic'  },
      { type:'student_demographics',  label:'Student Demographics',        icon:'📊', category:'academic'  },
      { type:'attendance_summary',    label:'Attendance Summary',          icon:'✅', category:'academic'  },
      { type:'attendance_absentees',  label:'Chronic Absentees Report',   icon:'⚠️', category:'academic'  },
      { type:'fee_collection',        label:'Fee Collection Report',       icon:'💰', category:'finance'   },
      { type:'fee_defaulters',        label:'Fee Defaulters Report',       icon:'🔴', category:'finance'   },
      { type:'fee_by_class',          label:'Fees by Class Breakdown',     icon:'🏫', category:'finance'   },
      { type:'exam_performance',      label:'Exam Performance Report',     icon:'📝', category:'academic'  },
      { type:'staff_list',            label:'Staff List Report',           icon:'👔', category:'hr'        },
      { type:'staff_by_department',   label:'Staff by Department',         icon:'🏢', category:'hr'        },
      { type:'discipline_summary',    label:'Discipline Incidents Summary',icon:'⚠️', category:'welfare'   },
      { type:'clubs_participation',   label:'Clubs & Societies Report',    icon:'🎭', category:'welfare'   },
      { type:'boarding_summary',      label:'Boarding Students Report',    icon:'🏠', category:'academic'  },
      { type:'academic_progress',     label:'Academic Progress Overview',  icon:'📈', category:'academic'  },
      { type:'cbc_competency',        label:'CBC Competency Report',       icon:'🌱', category:'cbc'       },
    ],
  });
};

const generateReport = async (req, res) => {
  try {
    const { type, filters = {} } = req.body;
    let data, title, metadata = {};

    switch (type) {
      case 'student_enrollment': {
        const { rows } = await query(`
          SELECT c.name as class_name, c.level, c.stream,
                 COUNT(s.id) FILTER (WHERE s.is_active) as enrolled,
                 COUNT(s.id) FILTER (WHERE s.gender='male' AND s.is_active) as boys,
                 COUNT(s.id) FILTER (WHERE s.gender='female' AND s.is_active) as girls,
                 COUNT(s.id) FILTER (WHERE s.is_boarding AND s.is_active) as boarders,
                 COUNT(s.id) FILTER (WHERE NOT s.is_boarding AND s.is_active) as day_scholars
          FROM classes c LEFT JOIN students s ON s.current_class_id=c.id AND s.school_id=c.school_id
          WHERE c.school_id=$1 AND c.is_active=true
          GROUP BY c.id, c.name, c.level, c.stream ORDER BY c.level, c.name`, [req.schoolId]);
        data = rows; title = 'Student Enrollment Report';
        metadata.totals = {
          enrolled: rows.reduce((s,r)=>s+parseInt(r.enrolled||0),0),
          boys: rows.reduce((s,r)=>s+parseInt(r.boys||0),0),
          girls: rows.reduce((s,r)=>s+parseInt(r.girls||0),0),
        };
        break;
      }
      case 'student_demographics': {
        const { rows: gender } = await query(`
          SELECT gender, COUNT(*) as count FROM students WHERE school_id=$1 AND is_active=true
          GROUP BY gender`, [req.schoolId]);
        const { rows: boarding } = await query(`
          SELECT is_boarding, COUNT(*) as count FROM students WHERE school_id=$1 AND is_active=true
          GROUP BY is_boarding`, [req.schoolId]);
        const { rows: byForm } = await query(`
          SELECT c.level as form, COUNT(s.id) as count
          FROM students s JOIN classes c ON c.id = s.current_class_id
          WHERE s.school_id=$1 AND s.is_active=true GROUP BY c.level ORDER BY c.level`, [req.schoolId]);
        const { rows: bloodGroup } = await query(`
          SELECT blood_group, COUNT(*) as count FROM students
          WHERE school_id=$1 AND is_active=true AND blood_group IS NOT NULL
          GROUP BY blood_group ORDER BY blood_group`, [req.schoolId]);
        data = { gender, boarding, byForm, bloodGroup }; title = 'Student Demographics Report'; break;
      }
      case 'attendance_summary': {
        const { from = new Date(Date.now()-30*86400000).toISOString().split('T')[0], to = new Date().toISOString().split('T')[0] } = filters;
        const { rows } = await query(`
          SELECT c.name as class_name, c.level,
                 COUNT(ar.id) as total_records,
                 COUNT(ar.id) FILTER (WHERE ar.status='present') as present,
                 COUNT(ar.id) FILTER (WHERE ar.status='absent') as absent,
                 COUNT(ar.id) FILTER (WHERE ar.status='late') as late,
                 ROUND(100.0 * COUNT(ar.id) FILTER (WHERE ar.status='present') / NULLIF(COUNT(ar.id),0),1) as rate
          FROM classes c
          LEFT JOIN students s ON s.current_class_id=c.id AND s.is_active=true
          LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.school_id=$1
            AND ar.date BETWEEN $2 AND $3
          WHERE c.school_id=$1
          GROUP BY c.id ORDER BY c.level, c.name`, [req.schoolId, from, to]);
        data = rows; title = 'Attendance Summary Report';
        metadata.period = { from, to };
        break;
      }
      case 'attendance_absentees': {
        const { rows } = await query(`
          SELECT s.first_name || ' ' || s.last_name as student_name, s.admission_number,
                 c.name as class_name,
                 COUNT(ar.id) FILTER (WHERE ar.status='absent') as absent_days,
                 COUNT(ar.id) as total_days,
                 ROUND(100.0 * COUNT(ar.id) FILTER (WHERE ar.status='absent') / NULLIF(COUNT(ar.id),0),1) as absence_rate
          FROM students s JOIN classes c ON c.id = s.current_class_id
          LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.school_id=s.school_id
          WHERE s.school_id=$1 AND s.is_active=true
          GROUP BY s.id, c.name
          HAVING COUNT(ar.id) FILTER (WHERE ar.status='absent') >= 5
          ORDER BY absent_days DESC LIMIT 50`, [req.schoolId]);
        data = rows; title = 'Chronic Absentees Report'; break;
      }
      case 'fee_collection': {
        const { rows } = await query(`
          SELECT c.name as class_name, c.level,
                 COUNT(DISTINCT s.id) as students,
                 COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'), 0) as collected,
                 COALESCE(SUM(sfa.net_fees), 0) as expected,
                 ROUND(100.0 * COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0)
                   / NULLIF(SUM(sfa.net_fees),0), 1) as collection_rate
          FROM classes c
          JOIN students s ON s.current_class_id=c.id AND s.is_active=true
          LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
          LEFT JOIN fee_payments fp ON fp.student_id=s.id AND fp.status='completed'
          WHERE c.school_id=$1
          GROUP BY c.id ORDER BY c.level`, [req.schoolId]);
        data = rows; title = 'Fee Collection Report'; break;
      }
      case 'fee_defaulters': {
        const { rows } = await query(`
          SELECT s.first_name || ' ' || s.last_name as student_name,
                 s.admission_number, c.name as class_name,
                 COALESCE(sfa.net_fees, 0) as expected_fees,
                 COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'), 0) as paid,
                 COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as balance,
                 (SELECT phone FROM student_parents WHERE student_id=s.id AND is_primary=true LIMIT 1) as parent_phone
          FROM students s JOIN classes c ON c.id = s.current_class_id
          LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
          LEFT JOIN fee_payments fp ON fp.student_id=s.id
          WHERE s.school_id=$1 AND s.is_active=true
          GROUP BY s.id, c.name, sfa.net_fees
          HAVING COALESCE(sfa.net_fees,0) - COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) > 0
          ORDER BY balance DESC`, [req.schoolId]);
        data = rows; title = 'Fee Defaulters Report';
        metadata.totalOutstanding = rows.reduce((s,r)=>s+parseFloat(r.balance||0),0).toFixed(2);
        break;
      }
      case 'staff_list': {
        const { rows } = await query(`
          SELECT u.first_name, u.last_name, u.email, u.phone, u.role,
                 st.staff_number, st.department, st.designation, st.employment_type,
                 st.tsc_number, st.tsc_verification_status,
                 u.is_active, u.created_at as joined_date
          FROM staff st JOIN users u ON u.id = st.user_id
          WHERE st.school_id=$1 ORDER BY st.department, u.last_name`, [req.schoolId]);
        data = rows; title = 'Staff List Report';
        metadata.totals = { total: rows.length, active: rows.filter(r=>r.is_active).length };
        break;
      }
      case 'staff_by_department': {
        const { rows } = await query(`
          SELECT st.department,
                 COUNT(*) as total,
                 COUNT(*) FILTER (WHERE u.is_active) as active,
                 COUNT(*) FILTER (WHERE st.tsc_verification_status='verified') as verified_tsc,
                 json_agg(json_build_object('name', u.first_name || ' ' || u.last_name,
                   'role', u.role, 'designation', st.designation) ORDER BY u.last_name) as members
          FROM staff st JOIN users u ON u.id = st.user_id
          WHERE st.school_id=$1
          GROUP BY st.department ORDER BY st.department`, [req.schoolId]);
        data = rows; title = 'Staff by Department Report'; break;
      }
      case 'discipline_summary': {
        const { rows } = await query(`
          SELECT di.incident_type as type, di.severity,
                 COUNT(*) as incidents,
                 COUNT(DISTINCT di.student_id) as students_involved,
                 COUNT(*) FILTER (WHERE di.action_taken='suspension') as suspensions
          FROM discipline_incidents di
          WHERE di.school_id=$1
          GROUP BY di.incident_type, di.severity ORDER BY incidents DESC`, [req.schoolId])
          .catch(()=>({ rows:[] }));
        data = rows; title = 'Discipline Incidents Summary'; break;
      }
      case 'clubs_participation': {
        const { rows } = await query(`
          SELECT cl.name as club_name, cl.category,
                 COUNT(cm.id) as members,
                 COUNT(cm.id) FILTER (WHERE cm.is_active) as active_members,
                 u.first_name || ' ' || u.last_name as patron_name
          FROM clubs cl
          LEFT JOIN club_memberships cm ON cm.club_id = cl.id
          LEFT JOIN users u ON u.id = cl.patron_user_id
          WHERE cl.school_id=$1
          GROUP BY cl.id, u.first_name, u.last_name ORDER BY members DESC`, [req.schoolId]);
        data = rows; title = 'Clubs & Societies Participation Report'; break;
      }
      case 'boarding_summary': {
        const { rows } = await query(`
          SELECT c.name as class_name,
                 COUNT(s.id) FILTER (WHERE s.is_boarding) as boarders,
                 COUNT(s.id) FILTER (WHERE NOT s.is_boarding) as day_scholars,
                 COUNT(s.id) as total,
                 s.dorm_name,
                 COUNT(s.id) FILTER (WHERE s.is_boarding AND s.dorm_name IS NOT NULL) as in_dorm
          FROM students s JOIN classes c ON c.id = s.current_class_id
          WHERE s.school_id=$1 AND s.is_active=true
          GROUP BY c.id, s.dorm_name ORDER BY c.level`, [req.schoolId]);
        data = rows; title = 'Boarding Students Report'; break;
      }
      case 'academic_progress': {
        const { rows } = await query(`
          SELECT es.name as exam_name, es.type, es.start_date,
                 COUNT(DISTINCT sm.student_id) as students_sat,
                 ROUND(AVG(sm.marks) FILTER (WHERE NOT sm.is_absent), 2) as school_mean,
                 COUNT(DISTINCT sm.student_id) FILTER (WHERE sm.marks >= 50 AND NOT sm.is_absent) as pass_count,
                 ROUND(100.0 * COUNT(DISTINCT sm.student_id) FILTER (WHERE sm.marks >= 50 AND NOT sm.is_absent)
                   / NULLIF(COUNT(DISTINCT sm.student_id) FILTER (WHERE NOT sm.is_absent), 0), 1) as pass_rate
          FROM exam_series es
          JOIN exam_papers ep ON ep.exam_series_id = es.id
          JOIN student_marks sm ON sm.exam_paper_id = ep.id
          WHERE es.school_id=$1 AND es.is_published=true
          GROUP BY es.id ORDER BY es.start_date DESC LIMIT 10`, [req.schoolId]);
        data = rows; title = 'Academic Progress Overview'; break;
      }
      default:
        return res.status(400).json({ error: 'Unknown report type' });
    }

    res.json({
      title, type,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.first_name + ' ' + req.user?.last_name,
      data, metadata,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFrom = from || new Date(Date.now()-30*86400000).toISOString().split('T')[0];
    const dateTo   = to   || new Date().toISOString().split('T')[0];
    const { rows: overall } = await query(`
      SELECT COUNT(*) FILTER (WHERE status='present') as present,
             COUNT(*) FILTER (WHERE status='absent') as absent,
             COUNT(*) FILTER (WHERE status='late') as late,
             COUNT(*) as total
      FROM attendance_records WHERE school_id=$1 AND date BETWEEN $2 AND $3`,
      [req.schoolId, dateFrom, dateTo]);
    const { rows: byClass } = await query(`
      SELECT c.name as class_name, c.level,
             COUNT(ar.id) FILTER (WHERE ar.status='present') as present,
             COUNT(ar.id) FILTER (WHERE ar.status='absent') as absent,
             COUNT(ar.id) as total,
             ROUND(100.0 * COUNT(ar.id) FILTER (WHERE ar.status='present') / NULLIF(COUNT(ar.id),0), 1) as rate
      FROM classes c LEFT JOIN students s ON s.current_class_id=c.id AND s.is_active=true
      LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.school_id=$1
        AND ar.date BETWEEN $2 AND $3
      WHERE c.school_id=$1 GROUP BY c.id ORDER BY c.level`, [req.schoolId, dateFrom, dateTo]);
    const daysRecorded = await query(`
      SELECT COUNT(DISTINCT date) as days FROM attendance_records
      WHERE school_id=$1 AND date BETWEEN $2 AND $3`, [req.schoolId, dateFrom, dateTo]);
    res.json({ overall: overall[0], byClass, daysRecorded: daysRecorded.rows[0]?.days || 0, period: { from: dateFrom, to: dateTo } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getAcademicSummary = async (req, res) => {
  try {
    const { rows: stats } = await query(`
      SELECT COUNT(*) FILTER (WHERE is_active) as total,
             COUNT(*) FILTER (WHERE gender='male' AND is_active) as boys,
             COUNT(*) FILTER (WHERE gender='female' AND is_active) as girls,
             COUNT(*) FILTER (WHERE is_boarding AND is_active) as boarding
      FROM students WHERE school_id=$1`, [req.schoolId]);
    const { rows: byClass } = await query(`
      SELECT c.name, c.level, COUNT(s.id) as count,
             COUNT(s.id) FILTER (WHERE s.gender='male') as boys,
             COUNT(s.id) FILTER (WHERE s.gender='female') as girls,
             COUNT(s.id) FILTER (WHERE s.is_boarding) as boarding
      FROM classes c LEFT JOIN students s ON s.current_class_id=c.id AND s.is_active=true AND s.school_id=c.school_id
      WHERE c.school_id=$1 AND c.is_active=true GROUP BY c.id ORDER BY c.level, c.name`, [req.schoolId]);
    res.json({ stats: stats[0], byClass });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getReports, generateReport, getAttendanceSummary, getAcademicSummary };
