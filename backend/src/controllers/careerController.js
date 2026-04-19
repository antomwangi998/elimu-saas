const { query } = require('../config/database');
const fetch = require('node-fetch');

exports.getProfile = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {rows}=await query(`SELECT cp.*,u.first_name,u.last_name FROM career_profiles cp JOIN users u ON cp.student_id=u.id WHERE cp.student_id=$1 AND cp.school_id=$2`,[studentId,req.schoolId]);
    res.json(rows[0]||{});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.saveProfile = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {interests,strengths,careerChoices,dreamCareer,dreamUniversity,dreamCourse,learningStyle}=req.body;
    const {rows}=await query(`INSERT INTO career_profiles(school_id,student_id,interests,strengths,career_choices,dream_career,dream_university,dream_course,learning_style) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(school_id,student_id) DO UPDATE SET interests=$3,strengths=$4,career_choices=$5,dream_career=$6,dream_university=$7,dream_course=$8,learning_style=$9,last_updated=NOW() RETURNING *`,[req.schoolId,studentId,interests||[],strengths||[],careerChoices||[],dreamCareer,dreamUniversity,dreamCourse,learningStyle]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getResources = async (req,res) => {
  try {
    const {career,subject}=req.query;
    let sql=`SELECT * FROM career_resources WHERE (school_id=$1 OR is_public=true)`;
    const params=[req.schoolId];
    if(career){params.push(`%${career}%`);sql+=` AND $${params.length}=ANY(careers) OR careers::text ILIKE $${params.length}`;}
    sql+=' ORDER BY created_at DESC LIMIT 50';
    const {rows}=await query(`SELECT * FROM career_resources WHERE school_id=$1 OR is_public=true ORDER BY created_at DESC LIMIT 50`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.addResource = async (req,res) => {
  try {
    const {title,description,resourceType,url,careers,subjects}=req.body;
    const {rows}=await query(`INSERT INTO career_resources(school_id,title,description,resource_type,url,careers,subjects) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[req.schoolId,title,description,resourceType||'article',url,careers||[],subjects||[]]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getAICareerAdvice = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {rows:p}=await query(`SELECT cp.*,u.first_name FROM career_profiles cp JOIN users u ON cp.student_id=u.id WHERE cp.student_id=$1`,[studentId]);
    const {rows:grades}=await query(`SELECT s.name AS subject,AVG(sm.marks) AS avg FROM student_marks sm JOIN subjects s ON sm.subject_id=s.id WHERE sm.student_id=$1 GROUP BY s.name ORDER BY avg DESC LIMIT 10`,[studentId]);
    const profile=p[0]||{};
    const prompt=`Student profile: Interests: ${(profile.interests||[]).join(', ')}. Strengths: ${(profile.strengths||[]).join(', ')}. Dream career: ${profile.dream_career||'unknown'}. Top subjects by marks: ${grades.map(g=>`${g.subject} (${parseFloat(g.avg||0).toFixed(0)}%)`).join(', ')}. Provide personalized Kenyan career guidance in 3-4 bullet points covering: best career path, required KCSE subjects, university options in Kenya (public and private), and one actionable step. Be specific and practical for a Kenyan student.`;
    const apiRes=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:prompt}]})});
    const data=await apiRes.json();
    const advice=data.content?.[0]?.text||'Career advice unavailable at this time.';
    res.json({advice,studentName:profile.first_name,profile,grades});
  } catch(e){res.status(500).json({error:e.message});}
};
