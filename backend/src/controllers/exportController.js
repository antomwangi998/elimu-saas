// ============================================================
// exportController — CSV exports for students, fees, marks, staff
// ============================================================
const { query } = require('../config/database');

const toCSV = (headers, rows) => {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h.toLowerCase().replace(/\s+/g,'_')]||r[h]||'')).join(','))].join('\n');
};

exports.exportStudents = async (req, res) => {
  try {
    const { classId, format = 'csv' } = req.query;
    let sql = `SELECT s.admission_number,s.first_name,s.last_name,s.other_names,s.gender,
                      s.date_of_birth,c.name as class_name,c.stream,
                      s.is_boarding,s.is_active,s.kcpe_index_number,s.blood_group,
                      s.medical_conditions,s.nationality,s.county,
                      s.admission_date,s.dorm_name
               FROM students s LEFT JOIN classes c ON c.id=s.current_class_id
               WHERE s.school_id=$1`;
    const params = [req.schoolId];
    if (classId) { sql += ' AND s.current_class_id=$2'; params.push(classId); }
    sql += ' ORDER BY c.name,s.first_name,s.last_name';
    const { rows } = await query(sql, params);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="students.csv"');
    const headers = ['Adm No','First Name','Last Name','Other Names','Gender','Date of Birth','Class','Stream','Boarding','Active','KCPE Index','Blood Group','Medical','Nationality','County','Admission Date'];
    const mapped = rows.map(r => ({
      'Adm No':r.admission_number,'First Name':r.first_name,'Last Name':r.last_name,
      'Other Names':r.other_names||'','Gender':r.gender,'Date of Birth':r.date_of_birth?.split('T')[0]||'',
      'Class':r.class_name||'','Stream':r.stream||'','Boarding':r.is_boarding?'Yes':'No',
      'Active':r.is_active?'Yes':'No','KCPE Index':r.kcpe_index_number||'','Blood Group':r.blood_group||'',
      'Medical':r.medical_conditions||'','Nationality':r.nationality||'Kenya','County':r.county||'',
      'Admission Date':r.admission_date?.split('T')[0]||''
    }));
    res.send(toCSV(headers, mapped));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportFees = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.admission_number, s.first_name||' '||s.last_name as name,
             c.name as class_name, c.stream,
             COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as total_paid,
             COALESCE(sfa.total_fees,0) as total_billed,
             COALESCE(sfa.total_fees,0)-COALESCE(SUM(fp.amount) FILTER (WHERE fp.status='completed'),0) as balance
      FROM students s
      LEFT JOIN classes c ON c.id=s.current_class_id
      LEFT JOIN fee_payments fp ON fp.student_id=s.id AND fp.school_id=s.school_id
      LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id AND sfa.school_id=s.school_id
      WHERE s.school_id=$1 AND s.is_active=true
      GROUP BY s.id,s.admission_number,s.first_name,s.last_name,c.name,c.stream,sfa.total_fees
      ORDER BY c.name,s.last_name`, [req.schoolId]);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="fee_report.csv"');
    const headers = ['Adm No','Student Name','Class','Stream','Total Billed','Total Paid','Balance'];
    res.send(toCSV(headers, rows.map(r => ({
      'Adm No':r.admission_number,'Student Name':r.name,'Class':r.class_name||'',
      'Stream':r.stream||'','Total Billed':r.total_billed,'Total Paid':r.total_paid,'Balance':r.balance
    }))));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportMarks = async (req, res) => {
  try {
    const { seriesId, classId } = req.query;
    if (!seriesId) return res.status(400).json({ error: 'seriesId required' });
    const { rows } = await query(`
      SELECT s.admission_number, s.first_name||' '||s.last_name as student_name,
             c.name as class_name, sub.name as subject, sub.code,
             sm.marks, sm.grade, sm.points, sm.is_absent, sm.teacher_remarks,
             es.name as exam_series
      FROM student_marks sm
      JOIN exam_papers ep ON ep.id=sm.exam_paper_id
      JOIN subjects sub ON sub.id=ep.subject_id
      JOIN students s ON s.id=sm.student_id
      JOIN classes c ON c.id=ep.class_id
      JOIN exam_series es ON es.id=ep.exam_series_id
      WHERE ep.exam_series_id=$1 AND sm.school_id=$2
        ${classId ? 'AND ep.class_id=$3' : ''}
      ORDER BY c.name,s.last_name,sub.name`,
      classId ? [seriesId, req.schoolId, classId] : [seriesId, req.schoolId]);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="marks.csv"');
    const headers = ['Adm No','Student Name','Class','Exam Series','Subject','Code','Marks','Grade','Points','Absent','Remarks'];
    res.send(toCSV(headers, rows.map(r => ({
      'Adm No':r.admission_number,'Student Name':r.student_name,'Class':r.class_name,
      'Exam Series':r.exam_series,'Subject':r.subject,'Code':r.code,
      'Marks':r.is_absent?'ABS':(r.marks||''),'Grade':r.grade||'','Points':r.points||'',
      'Absent':r.is_absent?'Yes':'No','Remarks':r.teacher_remarks||''
    }))));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.exportStaff = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.first_name,u.last_name,u.email,u.role,u.phone,
             s.staff_number,s.tsc_number,s.designation,s.department,
             s.salary_grade,s.is_active,s.tsc_verification_status
      FROM users u LEFT JOIN staff s ON s.user_id=u.id
      WHERE u.school_id=$1 AND u.role NOT IN ('student','parent','super_admin')
      ORDER BY u.role,u.last_name`, [req.schoolId]);
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename="staff.csv"');
    const headers = ['First Name','Last Name','Email','Role','Phone','Staff No','TSC No','Designation','Department','Salary Grade','Active','TSC Status'];
    res.send(toCSV(headers, rows.map(r => ({
      'First Name':r.first_name,'Last Name':r.last_name,'Email':r.email,'Role':r.role,
      'Phone':r.phone||'','Staff No':r.staff_number||'','TSC No':r.tsc_number||'',
      'Designation':r.designation||'','Department':r.department||'','Salary Grade':r.salary_grade||'',
      'Active':r.is_active!==false?'Yes':'No','TSC Status':r.tsc_verification_status||''
    }))));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Generic fallback
exports.getAll  = (req, res) => res.json({ formats:['students','fees','marks','staff'], endpoints:['/export/students','/export/fees','/export/marks','/export/staff'] });
exports.getOne  = exports.getAll;
exports.create  = exports.getAll;
exports.update  = exports.getAll;
exports.remove  = exports.getAll;
