const { query } = require('../config/database');
const fetch = require('node-fetch');

exports.getPredictions = async (req,res) => {
  try {
    const {studentId,type}=req.query;
    let sql=`SELECT ap.*,u.first_name,u.last_name FROM ai_predictions ap JOIN users u ON ap.student_id=u.id WHERE ap.school_id=$1 AND ap.expires_at>NOW()`;
    const params=[req.schoolId];
    if(studentId){params.push(studentId);sql+=` AND ap.student_id=$${params.length}`;}
    if(type){params.push(type);sql+=` AND ap.prediction_type=$${params.length}`;}
    sql+=' ORDER BY ap.generated_at DESC LIMIT 100';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

exports.predictGrades = async (req,res) => {
  try {
    const {classId,examSeriesId}=req.body;
    const {rows:students}=await query(`SELECT u.id,u.first_name,u.last_name,u.admission_number,AVG(sm.marks) AS avg_marks,COUNT(sm.id) AS exam_count FROM users u LEFT JOIN student_marks sm ON sm.student_id=u.id WHERE u.class_id=$1 AND u.school_id=$2 GROUP BY u.id,u.first_name,u.last_name,u.admission_number`,[classId,req.schoolId]);
    const results=[];
    for(const s of students){
      const avg=parseFloat(s.avg_marks||0);
      // Simple KNEC grade prediction based on historical average
      const grade=avg>=80?'A':avg>=75?'A-':avg>=70?'B+':avg>=65?'B':avg>=60?'B-':avg>=55?'C+':avg>=50?'C':avg>=45?'C-':avg>=40?'D+':avg>=35?'D':avg>=30?'D-':'E';
      const confidence=Math.min(95,50+(parseInt(s.exam_count)||0)*5);
      await query(`INSERT INTO ai_predictions(school_id,student_id,prediction_type,predicted_value,confidence_score,supporting_data) VALUES($1,$2,'predicted_grade',$3,$4,$5) ON CONFLICT DO NOTHING`,[req.schoolId,s.id,grade,confidence,JSON.stringify({avgMarks:avg,examCount:s.exam_count})]).catch(()=>{});
      results.push({...s,predictedGrade:grade,confidence});
    }
    res.json({predictions:results,count:results.length});
  } catch(e){res.status(500).json({error:e.message});}
};

exports.predictDropouts = async (req,res) => {
  try {
    const {rows}=await query(`SELECT u.id,u.first_name,u.last_name,u.admission_number,c.name AS class_name,
      (SELECT COUNT(*) FROM attendance_records WHERE student_id=u.id AND status='absent' AND date>=NOW()-INTERVAL '30 days') AS absences_30d,
      (SELECT COUNT(*) FROM attendance_records WHERE student_id=u.id AND date>=NOW()-INTERVAL '30 days') AS total_30d,
      (SELECT AVG(marks) FROM student_marks WHERE student_id=u.id) AS avg_marks,
      (SELECT COALESCE(SUM(amount_due)-SUM(amount_paid),0) FROM billing_invoices WHERE student_id=u.id AND school_id=$1) AS fee_balance
      FROM users u LEFT JOIN classes c ON u.class_id=c.id
      WHERE u.school_id=$1 AND u.role='student' AND u.is_active=true`,[req.schoolId]);
    const atRisk=rows.map(s=>{
      const attRate=s.total_30d>0?(1-(s.absences_30d/s.total_30d))*100:100;
      const marks=parseFloat(s.avg_marks||50);
      const feeRisk=parseFloat(s.fee_balance||0)>5000?20:0;
      const attRisk=attRate<70?30:attRate<85?15:0;
      const markRisk=marks<40?30:marks<50?15:0;
      const risk=Math.min(100,attRisk+markRisk+feeRisk);
      return {...s,riskScore:risk,riskLevel:risk>=60?'high':risk>=30?'medium':'low',factors:{attendance:attRate.toFixed(1),marks:marks.toFixed(1),fees:s.fee_balance}};
    }).filter(s=>s.riskScore>=20).sort((a,b)=>b.riskScore-a.riskScore);
    res.json(atRisk);
  } catch(e){res.status(500).json({error:e.message});}
};

exports.predictFeeDefaults = async (req,res) => {
  try {
    const {rows}=await query(`SELECT u.id,u.first_name,u.last_name,u.admission_number,c.name AS class_name,COALESCE(SUM(bi.amount_due),0) AS total_due,COALESCE(SUM(bi.amount_paid),0) AS total_paid,COALESCE(SUM(bi.amount_due)-SUM(bi.amount_paid),0) AS balance,COUNT(bi.id) AS invoices FROM users u LEFT JOIN billing_invoices bi ON bi.student_id=u.id AND bi.school_id=$1 LEFT JOIN classes c ON u.class_id=c.id WHERE u.school_id=$1 AND u.role='student' GROUP BY u.id,u.first_name,u.last_name,u.admission_number,c.name HAVING COALESCE(SUM(bi.amount_due)-SUM(bi.amount_paid),0)>0 ORDER BY balance DESC LIMIT 50`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

exports.compareWithCounty = async (req,res) => {
  try {
    const {classId,examSeriesId}=req.query;
    const {rows:school}=await query(`SELECT AVG(sm.marks) AS school_avg,MAX(sm.marks) AS school_high,MIN(sm.marks) AS school_low FROM student_marks sm WHERE sm.school_id=$1 AND sm.exam_series_id=$2`,[req.schoolId,examSeriesId]);
    // In production: fetch from aggregated national database
    const national={avg:52.4,high:98,low:12,schools:2847};
    const county={avg:50.1,high:96,low:10,schools:342};
    res.json({school:school[0],county,national,rank:{county:'Top 30%',national:'Top 35%'}});
  } catch(e){res.status(500).json({error:e.message});}
};

exports.getUsageAnalytics = async (req,res) => {
  try {
    const {rows:events}=await query(`SELECT event_type,COUNT(*) AS count FROM usage_events WHERE school_id=$1 AND created_at>=NOW()-INTERVAL '30 days' GROUP BY event_type ORDER BY count DESC LIMIT 20`,[req.schoolId]);
    const {rows:daily}=await query(`SELECT DATE(created_at) AS date,COUNT(DISTINCT user_id) AS active_users FROM usage_events WHERE school_id=$1 AND created_at>=NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`,[req.schoolId]);
    const {rows:top}=await query(`SELECT u.role,COUNT(DISTINCT ue.user_id) AS users FROM usage_events ue JOIN users u ON ue.user_id=u.id WHERE ue.school_id=$1 AND ue.created_at>=NOW()-INTERVAL '7 days' GROUP BY u.role ORDER BY users DESC`,[req.schoolId]);
    res.json({topEvents:events,dailyActiveUsers:daily,byRole:top});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.trackEvent = async (req,res) => {
  try {
    const {eventType,page,details}=req.body;
    await query(`INSERT INTO usage_events(school_id,user_id,event_type,page,details) VALUES($1,$2,$3,$4,$5)`,[req.schoolId,req.user.id,eventType,page,JSON.stringify(details||{})]);
    res.json({success:true});
  } catch(e){res.status(200).json({success:true});} // never fail tracking
};

exports.generateAIExamQuestions = async (req,res) => {
  try {
    const {subject,topic,form,questionType,count,difficulty}=req.body;
    const prompt=`Generate ${count||5} ${difficulty||'medium'} difficulty ${questionType||'multiple choice'} questions for ${subject} Form ${form||'3'} on the topic: "${topic}". Format as JSON array: [{question,options:[],answer,explanation}]. Align with Kenya 8-4-4 curriculum.`;
    const apiRes=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]})});
    const data=await apiRes.json();
    const text=data.content?.[0]?.text||'[]';
    const clean=text.replace(/```json|```/g,'').trim();
    try{res.json({questions:JSON.parse(clean),topic,subject,form});}
    catch{res.json({questions:[],raw:text,error:'Parse error'});}
  } catch(e){res.status(500).json({error:e.message});}
};
