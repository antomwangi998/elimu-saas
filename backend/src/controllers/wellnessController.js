const { query } = require('../config/database');
exports.getCheckins = async (req,res) => {
  try {
    const {studentId,needsSupport,from}=req.query;
    let sql=`SELECT wc.*,u.first_name,u.last_name,u.admission_number,c.name AS class_name FROM wellness_checkins wc JOIN users u ON wc.student_id=u.id LEFT JOIN classes c ON u.class_id=c.id WHERE wc.school_id=$1`;
    const params=[req.schoolId];
    if(studentId){params.push(studentId);sql+=` AND wc.student_id=$${params.length}`;}
    if(needsSupport==='true') sql+=' AND wc.needs_support=true AND wc.counselor_notified=false';
    if(from){params.push(from);sql+=` AND wc.created_at>=$${params.length}`;}
    sql+=' ORDER BY wc.created_at DESC LIMIT 100';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.checkin = async (req,res) => {
  try {
    const {studentId,moodScore,moodLabel,concerns,needsSupport}=req.body;
    const sid=studentId||req.user.id;
    const {rows}=await query(`INSERT INTO wellness_checkins(school_id,student_id,mood_score,mood_label,concerns,needs_support) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.schoolId,sid,moodScore,moodLabel,concerns,needsSupport||moodScore<=2]);
    if(rows[0].needs_support){
      // Auto-notify counselor (placeholder)
      await query(`UPDATE wellness_checkins SET counselor_notified=true WHERE id=$1`,[rows[0].id]);
    }
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.addCounselorNote = async (req,res) => {
  try {
    const {id}=req.params;
    const {sessionNotes,followUpDate}=req.body;
    const {rows}=await query(`UPDATE wellness_checkins SET counselor_id=$1,session_notes=$2,follow_up_date=$3 WHERE id=$4 AND school_id=$5 RETURNING *`,[req.user.id,sessionNotes,followUpDate||null,id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getMoodTrend = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {rows}=await query(`SELECT DATE(created_at) AS date,AVG(mood_score) AS avg_mood,COUNT(*) AS checkins FROM wellness_checkins WHERE student_id=$1 AND school_id=$2 AND created_at>=NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`,[studentId,req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getSchoolMoodSummary = async (req,res) => {
  try {
    const {rows}=await query(`SELECT AVG(mood_score) AS avg_mood,COUNT(*) AS checkins_today,COUNT(CASE WHEN needs_support AND NOT counselor_notified THEN 1 END) AS needs_attention FROM wellness_checkins WHERE school_id=$1 AND DATE(created_at)=CURRENT_DATE`,[req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
