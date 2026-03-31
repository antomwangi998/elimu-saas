// ============================================================
// Parent Portal Controller — Full Implementation
// ============================================================
const { query } = require('../config/database');

const getMyChildren = async (req, res) => {
  try {
    // Get via parent_student_links (primary) or users.parent_id (fallback)
    const {rows} = await query(
      `SELECT u.id,u.first_name,u.last_name,u.admission_number,u.profile_photo,u.phone,
              c.name AS class_name,
              psl.relationship,psl.is_primary,
              (SELECT AVG(marks) FROM student_marks WHERE student_id=u.id) AS avg_marks,
              (SELECT COUNT(*) FROM attendance_records WHERE student_id=u.id AND status='present' 
               AND date>=NOW()-INTERVAL '30 days') AS present_30d,
              (SELECT COUNT(*) FROM attendance_records WHERE student_id=u.id AND date>=NOW()-INTERVAL '30 days') AS total_30d,
              (SELECT COALESCE(SUM(amount_due)-SUM(amount_paid),0) FROM billing_invoices WHERE student_id=u.id AND status!='paid') AS fee_balance
       FROM parent_student_links psl
       JOIN users u ON psl.student_id=u.id
       LEFT JOIN classes c ON u.class_id=c.id
       WHERE psl.parent_id=$1 AND psl.school_id=$2
       ORDER BY psl.is_primary DESC, u.first_name`,
      [req.user.id,req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const linkChild = async (req, res) => {
  try {
    const {studentId,relationship='parent',isPrimary=false} = req.body;
    const {rows:s}=await query(`SELECT * FROM users WHERE id=$1 AND school_id=$2`,[studentId,req.schoolId]);
    if(!s.length) return res.status(404).json({error:'Student not found'});
    const {rows}=await query(
      `INSERT INTO parent_student_links(school_id,parent_id,student_id,relationship,is_primary)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(school_id,parent_id,student_id) DO UPDATE SET relationship=$4,is_primary=$5 RETURNING *`,
      [req.schoolId,req.user.id,studentId,relationship,isPrimary]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const getChildGrades = async (req, res) => {
  try {
    const {studentId}=req.params;
    await verifyParentChild(req.user.id,studentId,req.schoolId);
    const {rows}=await query(
      `SELECT sm.*,s.name AS subject_name,es.name AS exam_name,es.term,es.year
       FROM student_marks sm
       JOIN subjects s ON sm.subject_id=s.id
       JOIN exam_series es ON sm.exam_series_id=es.id
       WHERE sm.student_id=$1 ORDER BY es.year DESC,es.term DESC,s.name`,
      [studentId]);
    res.json(rows);
  } catch(e){res.status(e.message==='Unauthorized'?403:500).json({error:e.message});}
};

const getChildAttendance = async (req, res) => {
  try {
    const {studentId}=req.params;
    const {from,to}=req.query;
    await verifyParentChild(req.user.id,studentId,req.schoolId);
    let sql=`SELECT ar.*,u.first_name||' '||u.last_name AS marked_by_name
             FROM attendance_records ar LEFT JOIN users u ON ar.marked_by=u.id
             WHERE ar.student_id=$1`;
    const params=[studentId];
    if(from){params.push(from);sql+=` AND ar.date>=$${params.length}`;}
    if(to){params.push(to);sql+=` AND ar.date<=$${params.length}`;}
    sql+=' ORDER BY ar.date DESC LIMIT 90';
    const {rows}=await query(sql,params);
    const present=rows.filter(r=>r.status==='present').length;
    res.json({records:rows,summary:{total:rows.length,present,absent:rows.length-present,rate:rows.length?((present/rows.length)*100).toFixed(1):0}});
  } catch(e){res.status(500).json({error:e.message});}
};

const getChildFees = async (req, res) => {
  try {
    const {studentId}=req.params;
    await verifyParentChild(req.user.id,studentId,req.schoolId);
    const {rows:invoices}=await query(
      `SELECT bi.*,u.first_name||' '||u.last_name AS student_name
       FROM billing_invoices bi LEFT JOIN users u ON bi.student_id=u.id
       WHERE bi.student_id=$1 AND bi.school_id=$2 ORDER BY bi.created_at DESC`,[studentId,req.schoolId]);
    const {rows:payments}=await query(
      `SELECT * FROM fee_payments WHERE student_id=$1 AND school_id=$2 ORDER BY payment_date DESC LIMIT 20`,[studentId,req.schoolId]);
    const balance=invoices.reduce((a,i)=>a+(parseFloat(i.amount_due)-parseFloat(i.amount_paid||0)),0);
    res.json({invoices,payments,balance});
  } catch(e){res.status(500).json({error:e.message});}
};

const getChildDiscipline = async (req, res) => {
  try {
    const {studentId}=req.params;
    await verifyParentChild(req.user.id,studentId,req.schoolId);
    const {rows}=await query(
      `SELECT incident_type,severity,incident_date,description,action_taken,resolved
       FROM discipline_incidents WHERE student_id=$1 AND school_id=$2 ORDER BY incident_date DESC LIMIT 20`,
      [studentId,req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const getChildTimetable = async (req, res) => {
  try {
    const {studentId}=req.params;
    await verifyParentChild(req.user.id,studentId,req.schoolId);
    const {rows:u}=await query(`SELECT class_id FROM users WHERE id=$1`,[studentId]);
    if(!u.length||!u[0].class_id) return res.json([]);
    const {rows}=await query(
      `SELECT tp.*,s.name AS subject_name,u.first_name||' '||u.last_name AS teacher_name
       FROM timetable_periods tp
       JOIN subjects s ON tp.subject_id=s.id
       LEFT JOIN users u ON tp.teacher_id=u.id
       WHERE tp.class_id=$1 AND tp.school_id=$2 ORDER BY tp.day_of_week,tp.period_number`,
      [u[0].class_id,req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const requestMeeting = async (req, res) => {
  try {
    const {studentId,teacherId,subject,message,preferredDate,preferredTime}=req.body;
    const {rows}=await query(
      `INSERT INTO parent_meeting_requests(school_id,parent_id,student_id,teacher_id,subject,message,preferred_date,preferred_time)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.schoolId,req.user.id,studentId,teacherId||null,subject,message,preferredDate||null,preferredTime||null]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const getMeetingRequests = async (req, res) => {
  try {
    const {rows}=await query(
      `SELECT pmr.*,p.first_name||' '||p.last_name AS parent_name,
              s.first_name||' '||s.last_name AS student_name,
              t.first_name||' '||t.last_name AS teacher_name
       FROM parent_meeting_requests pmr
       JOIN users p ON pmr.parent_id=p.id
       JOIN users s ON pmr.student_id=s.id
       LEFT JOIN users t ON pmr.teacher_id=t.id
       WHERE pmr.school_id=$1 ORDER BY pmr.created_at DESC`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const getParentDashboard = async (req, res) => {
  try {
    const children = await (async()=>{
      const {rows}=await query(
        `SELECT u.id,u.first_name,u.last_name,u.admission_number,c.name AS class_name
         FROM parent_student_links psl JOIN users u ON psl.student_id=u.id
         LEFT JOIN classes c ON u.class_id=c.id WHERE psl.parent_id=$1 AND psl.school_id=$2`,
        [req.user.id,req.schoolId]);
      return rows;
    })();
    const alerts=[];
    for(const child of children){
      const {rows:od}=await query(
        `SELECT COUNT(*) FROM attendance_records WHERE student_id=$1 AND status='absent' AND date>=NOW()-INTERVAL '7 days'`,[child.id]);
      if(parseInt(od[0].count)>=3) alerts.push({type:'attendance',studentId:child.id,studentName:`${child.first_name} ${child.last_name}`,message:`${od[0].count} absences in the last 7 days`});
      const {rows:bal}=await query(
        `SELECT COALESCE(SUM(amount_due)-SUM(amount_paid),0) AS balance FROM billing_invoices WHERE student_id=$1 AND school_id=$2`,[child.id,req.schoolId]);
      if(parseFloat(bal[0].balance)>0) alerts.push({type:'fees',studentId:child.id,studentName:`${child.first_name} ${child.last_name}`,message:`Outstanding fees: KES ${parseFloat(bal[0].balance).toLocaleString()}`});
    }
    res.json({children,alerts});
  } catch(e){res.status(500).json({error:e.message});}
};

// Helpers
async function verifyParentChild(parentId,studentId,schoolId){
  const {rows}=await query(
    `SELECT id FROM parent_student_links WHERE parent_id=$1 AND student_id=$2 AND school_id=$3`,[parentId,studentId,schoolId]);
  if(!rows.length) throw new Error('Unauthorized');
}

module.exports = {getMyChildren,linkChild,getChildGrades,getChildAttendance,getChildFees,getChildDiscipline,getChildTimetable,requestMeeting,getMeetingRequests,getParentDashboard};
