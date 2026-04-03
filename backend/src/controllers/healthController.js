const { query } = require('../config/database');
exports.getRecords = async (req,res) => {
  try {
    const {studentId,from,to,limit=100}=req.query;
    let sql=`SELECT hr.*,u.first_name,u.last_name,u.admission_number,a.first_name||' '||a.last_name AS attended_by_name FROM health_records hr JOIN users u ON hr.student_id=u.id LEFT JOIN users a ON hr.attended_by=a.id WHERE hr.school_id=$1`;
    const params=[req.schoolId];
    if(studentId){params.push(studentId);sql+=` AND hr.student_id=$${params.length}`;}
    if(from){params.push(from);sql+=` AND hr.visit_date>=$${params.length}`;}
    if(to){params.push(to);sql+=` AND hr.visit_date<=$${params.length}`;}
    sql+=` ORDER BY hr.visit_date DESC LIMIT ${parseInt(limit)}`;
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createRecord = async (req,res) => {
  try {
    const {studentId,complaint,diagnosis,treatment,medication,temperature,bloodPressure,weight,height,referred,referralHospital,admitted}=req.body;
    const {rows}=await query(`INSERT INTO health_records(school_id,student_id,complaint,diagnosis,treatment,medication,temperature,blood_pressure,weight,height,referred,referral_hospital,admitted,attended_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[req.schoolId,studentId,complaint,diagnosis,treatment,medication,temperature||null,bloodPressure,weight||null,height||null,referred||false,referralHospital,admitted||false,req.user.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getMedicalInfo = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {rows}=await query(`SELECT * FROM student_medical_info WHERE student_id=$1 AND school_id=$2`,[studentId,req.schoolId]);
    res.json(rows[0]||{});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.saveMedicalInfo = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {bloodGroup,allergies,chronicConditions,emergencyContact,emergencyPhone,nhifNumber,nhifName,specialNeeds,doctorName,doctorPhone}=req.body;
    const {rows}=await query(`INSERT INTO student_medical_info(school_id,student_id,blood_group,allergies,chronic_conditions,emergency_contact,emergency_phone,nhif_number,nhif_name,special_needs,doctor_name,doctor_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(school_id,student_id) DO UPDATE SET blood_group=$3,allergies=$4,chronic_conditions=$5,emergency_contact=$6,emergency_phone=$7,nhif_number=$8,nhif_name=$9,special_needs=$10,doctor_name=$11,doctor_phone=$12,updated_at=NOW() RETURNING *`,[req.schoolId,studentId,bloodGroup,allergies,chronicConditions,emergencyContact,emergencyPhone,nhifNumber,nhifName,specialNeeds,doctorName,doctorPhone]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getSickBay = async (req,res) => {
  try {
    const {rows}=await query(`SELECT hr.*,u.first_name,u.last_name,u.admission_number FROM health_records hr JOIN users u ON hr.student_id=u.id WHERE hr.school_id=$1 AND hr.admitted=true AND hr.discharge_date IS NULL ORDER BY hr.admission_date`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.discharge = async (req,res) => {
  try {
    const {id}=req.params;
    await query(`UPDATE health_records SET discharge_date=CURRENT_DATE WHERE id=$1 AND school_id=$2`,[id,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getStats = async (req,res) => {
  try {
    const {rows}=await query(`SELECT COUNT(*) AS total_visits,COUNT(CASE WHEN referred THEN 1 END) AS referred,COUNT(CASE WHEN admitted THEN 1 END) AS admitted,COUNT(CASE WHEN admitted AND discharge_date IS NULL THEN 1 END) AS currently_admitted FROM health_records WHERE school_id=$1 AND visit_date>=NOW()-INTERVAL '30 days'`,[req.schoolId]);
    const {rows:common}=await query(`SELECT complaint,COUNT(*) AS count FROM health_records WHERE school_id=$1 AND visit_date>=NOW()-INTERVAL '30 days' GROUP BY complaint ORDER BY count DESC LIMIT 5`,[req.schoolId]);
    res.json({...rows[0],commonComplaints:common});
  } catch(e){res.status(500).json({error:e.message});}
};
