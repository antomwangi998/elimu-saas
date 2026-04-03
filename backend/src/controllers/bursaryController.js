const { query } = require('../config/database');
exports.getSchemes = async (req,res) => {
  try {
    const {rows}=await query(`SELECT bs.*,(SELECT COUNT(*) FROM bursary_applications WHERE scheme_id=bs.id) AS applications,(SELECT COUNT(*) FROM bursary_applications WHERE scheme_id=bs.id AND status='approved') AS approved,(SELECT COALESCE(SUM(amount_awarded),0) FROM bursary_applications WHERE scheme_id=bs.id AND status='approved') AS total_awarded FROM bursary_schemes bs WHERE bs.school_id=$1 ORDER BY bs.created_at DESC`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createScheme = async (req,res) => {
  try {
    const {name,funder,funderType,totalAmount,amountPerStudent,academicYear,term,maxStudents,eligibilityCriteria,applicationDeadline}=req.body;
    const {rows}=await query(`INSERT INTO bursary_schemes(school_id,name,funder,funder_type,total_amount,amount_per_student,academic_year,term,max_students,eligibility_criteria,application_deadline) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.schoolId,name,funder,funderType||'government',totalAmount||0,amountPerStudent||null,academicYear,term,maxStudents||null,eligibilityCriteria,applicationDeadline||null]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getApplications = async (req,res) => {
  try {
    const {schemeId,status}=req.query;
    let sql=`SELECT ba.*,u.first_name,u.last_name,u.admission_number,c.name AS class_name,bs.name AS scheme_name FROM bursary_applications ba JOIN users u ON ba.student_id=u.id LEFT JOIN classes c ON u.class_id=c.id JOIN bursary_schemes bs ON ba.scheme_id=bs.id WHERE ba.school_id=$1`;
    const params=[req.schoolId];
    if(schemeId){params.push(schemeId);sql+=` AND ba.scheme_id=$${params.length}`;}
    if(status){params.push(status);sql+=` AND ba.status=$${params.length}`;}
    sql+=' ORDER BY u.last_name';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.apply = async (req,res) => {
  try {
    const {schemeId,studentId,amountRequested,justification,householdIncome,dependants}=req.body;
    const {rows}=await query(`INSERT INTO bursary_applications(school_id,scheme_id,student_id,amount_requested,justification,household_income,dependants) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.schoolId,schemeId,studentId,amountRequested,justification,householdIncome||null,dependants||null]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.reviewApplication = async (req,res) => {
  try {
    const {id}=req.params;
    const {status,amountAwarded,reviewNotes}=req.body;
    const {rows}=await query(`UPDATE bursary_applications SET status=$1,amount_awarded=$2,review_notes=$3,reviewed_by=$4,award_date=CASE WHEN $1='approved' THEN CURRENT_DATE ELSE null END WHERE id=$5 AND school_id=$6 RETURNING *`,[status,amountAwarded||null,reviewNotes,req.user.id,id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
