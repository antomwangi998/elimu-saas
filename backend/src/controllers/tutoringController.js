const { query } = require('../config/database');
exports.getOffers = async (req,res) => {
  try {
    const {subject}=req.query;
    let sql=`SELECT to2.*,u.first_name,u.last_name,u.admission_number,c.name AS class_name FROM tutoring_offers to2 JOIN users u ON to2.tutor_id=u.id LEFT JOIN classes c ON u.class_id=c.id WHERE to2.school_id=$1 AND to2.is_active=true`;
    const params=[req.schoolId];
    if(subject){params.push(`%${subject}%`);sql+=` AND to2.subjects::text ILIKE $${params.length}`;}
    sql+=' ORDER BY to2.rating DESC,to2.sessions_count DESC';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createOffer = async (req,res) => {
  try {
    const {subjects,availability,experience,minGrade,ratePerHour,isFree}=req.body;
    const {rows}=await query(`INSERT INTO tutoring_offers(school_id,tutor_id,subjects,availability,experience,min_grade,rate_per_hour,is_free) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[req.schoolId,req.user.id,subjects||[],availability,experience,minGrade,ratePerHour||0,isFree!==false]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getSessions = async (req,res) => {
  try {
    const {rows}=await query(`SELECT ts.*,t.first_name||' '||t.last_name AS tutor_name,s.first_name||' '||s.last_name AS student_name FROM tutoring_sessions ts JOIN users t ON ts.tutor_id=t.id JOIN users s ON ts.student_id=s.id WHERE ts.school_id=$1 AND (ts.tutor_id=$2 OR ts.student_id=$2) ORDER BY ts.created_at DESC`,[req.schoolId,req.user.id]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.requestSession = async (req,res) => {
  try {
    const {offerId,subject,scheduledDate,scheduledTime,durationMinutes,location}=req.body;
    const {rows:o}=await query(`SELECT * FROM tutoring_offers WHERE id=$1`,[offerId]);
    if(!o.length) return res.status(404).json({error:'Offer not found'});
    const {rows}=await query(`INSERT INTO tutoring_sessions(school_id,offer_id,tutor_id,student_id,subject,scheduled_date,scheduled_time,duration_minutes,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.schoolId,offerId,o[0].tutor_id,req.user.id,subject,scheduledDate,scheduledTime,durationMinutes||60,location]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.updateSession = async (req,res) => {
  try {
    const {id}=req.params;
    const {status,tutorNotes,studentFeedback,rating}=req.body;
    const {rows}=await query(`UPDATE tutoring_sessions SET status=$1,tutor_notes=$2,student_feedback=$3,rating=$4 WHERE id=$5 AND school_id=$6 RETURNING *`,[status,tutorNotes,studentFeedback,rating||null,id,req.schoolId]);
    if(rating) await query(`UPDATE tutoring_offers SET rating=(SELECT AVG(rating) FROM tutoring_sessions WHERE offer_id=tutoring_offers.id AND rating IS NOT NULL),sessions_count=sessions_count+1 WHERE id=$1`,[(await query(`SELECT offer_id FROM tutoring_sessions WHERE id=$1`,[id])).rows[0]?.offer_id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
