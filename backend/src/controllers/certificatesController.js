// ============================================================
// Certificates Controller — Full Implementation
// ============================================================
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const getCertificates = async (req, res) => {
  try {
    const {studentId,type,limit=100} = req.query;
    let sql = `SELECT c.*,u.first_name||' '||u.last_name AS student_name,u.admission_number,
                      ib.first_name||' '||ib.last_name AS issued_by_name
               FROM certificates c JOIN users u ON c.student_id=u.id
               LEFT JOIN users ib ON c.issued_by=ib.id
               WHERE c.school_id=$1`;
    const params=[req.schoolId];
    if(studentId){params.push(studentId);sql+=` AND c.student_id=$${params.length}`;}
    if(type){params.push(type);sql+=` AND c.type=$${params.length}`;}
    sql+=` AND (c.is_revoked IS NULL OR c.is_revoked=false) ORDER BY c.created_at DESC LIMIT ${parseInt(limit)}`;
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const issueCertificate = async (req, res) => {
  try {
    const {studentId,type,title,description,issuedFor,position,signedBy,countersignedBy,issuedDate,templateId='standard'} = req.body;
    if(!studentId||!type||!title) return res.status(400).json({error:'Student, type and title required'});
    const {rows:u}=await query(`SELECT * FROM users WHERE id=$1 AND school_id=$2`,[studentId,req.schoolId]);
    if(!u.length) return res.status(404).json({error:'Student not found'});
    const {rows:s}=await query(`SELECT * FROM schools WHERE id=$1`,[req.schoolId]);
    const school=s[0]||{};
    const certNum=`CERT-${req.schoolId.slice(0,4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const student=u[0];
    const html=buildCertHtml(school,student,{type,title,description,issuedFor,position,signedBy:signedBy||school.principal_name||'Principal',countersignedBy,certNum,issuedDate:issuedDate||new Date().toISOString().split('T')[0],templateId});
    const {rows}=await query(
      `INSERT INTO certificates(school_id,student_id,type,title,description,issued_for,position,
        signed_by,countersigned_by,issued_date,issued_by,certificate_number,html_content,template_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.schoolId,studentId,type,title,description,issuedFor,position,
       signedBy,countersignedBy,issuedDate||new Date().toISOString().split('T')[0],
       req.user.id,certNum,html,templateId]);
    res.json({...rows[0],html});
  } catch(e){res.status(500).json({error:e.message});}
};

const batchIssueCertificates = async (req, res) => {
  try {
    const {studentIds,type,title,description,issuedFor,signedBy,templateId='standard'} = req.body;
    if(!Array.isArray(studentIds)||!studentIds.length) return res.status(400).json({error:'studentIds array required'});
    const {rows:s}=await query(`SELECT * FROM schools WHERE id=$1`,[req.schoolId]);
    const school=s[0]||{};
    let issued=0,skipped=0;
    for(const sid of studentIds){
      try {
        const {rows:u}=await query(`SELECT * FROM users WHERE id=$1 AND school_id=$2`,[sid,req.schoolId]);
        if(!u.length){skipped++;continue;}
        const student=u[0];
        const certNum=`CERT-${req.schoolId.slice(0,4).toUpperCase()}-${Date.now().toString().slice(-4)}-${issued}`;
        const html=buildCertHtml(school,student,{type,title,description,issuedFor,signedBy:signedBy||'Principal',certNum,issuedDate:new Date().toISOString().split('T')[0],templateId});
        await query(
          `INSERT INTO certificates(school_id,student_id,type,title,description,issued_for,signed_by,issued_by,certificate_number,html_content,template_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [req.schoolId,sid,type,title,description,issuedFor,signedBy||'Principal',req.user.id,certNum,html,templateId]);
        issued++;
      } catch{skipped++;}
    }
    res.json({issued,skipped,total:studentIds.length});
  } catch(e){res.status(500).json({error:e.message});}
};

const getCertificate = async (req, res) => {
  try {
    const {id}=req.params;
    const {rows}=await query(
      `SELECT c.*,u.first_name||' '||u.last_name AS student_name,u.admission_number
       FROM certificates c JOIN users u ON c.student_id=u.id
       WHERE c.id=$1 AND c.school_id=$2`,[id,req.schoolId]);
    if(!rows.length) return res.status(404).json({error:'Certificate not found'});
    // If no html, rebuild
    if(!rows[0].html_content){
      const {rows:s}=await query(`SELECT * FROM schools WHERE id=$1`,[req.schoolId]);
      const {rows:u}=await query(`SELECT * FROM users WHERE id=$1`,[rows[0].student_id]);
      rows[0].html_content=buildCertHtml(s[0]||{},u[0]||{},rows[0]);
    }
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const revokeCertificate = async (req, res) => {
  try {
    const {id}=req.params;
    const {reason}=req.body;
    await query(`UPDATE certificates SET is_revoked=true,revoked_reason=$1,revoked_at=NOW() WHERE id=$2 AND school_id=$3`,[reason,id,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};

const getStats = async (req,res) => {
  try {
    const {rows}=await query(
      `SELECT type,COUNT(*) AS count FROM certificates WHERE school_id=$1 AND (is_revoked IS NULL OR is_revoked=false) GROUP BY type ORDER BY count DESC`,[req.schoolId]);
    const {rows:total}=await query(`SELECT COUNT(*) AS total FROM certificates WHERE school_id=$1`,[req.schoolId]);
    res.json({byType:rows,total:parseInt(total[0].total)});
  } catch(e){res.status(500).json({error:e.message});}
};

function buildCertHtml(school,student,cert){
  const templates={
    standard:`
    <div style="font-family:'Times New Roman',serif;border:12px double gold;padding:40px;text-align:center;background:#fffdf4;min-height:500px;position:relative">
      <div style="border:3px solid #b8860b;padding:28px;height:100%">
        <div style="font-size:13px;letter-spacing:3px;color:#666;text-transform:uppercase;margin-bottom:8px">Certificate of ${cert.type||'Achievement'}</div>
        <div style="font-size:26px;font-weight:700;color:#1a1a1a;margin-bottom:6px">${school.name||'School Name'}</div>
        <div style="font-size:11px;color:#888;margin-bottom:24px">${school.address||''}</div>
        <div style="font-size:15px;color:#555;margin-bottom:12px">This is to certify that</div>
        <div style="font-size:32px;font-weight:800;color:#b8860b;margin:12px 0;font-style:italic;border-bottom:2px solid #b8860b;padding-bottom:8px;display:inline-block;padding-left:24px;padding-right:24px">${student.first_name||''} ${student.last_name||''}</div>
        <div style="font-size:13px;color:#666;margin:10px 0">${student.admission_number||''}</div>
        <div style="font-size:16px;color:#333;margin:16px 0;font-weight:600">${cert.title}</div>
        ${cert.description?`<div style="font-size:13px;color:#555;margin:10px auto;max-width:500px;line-height:1.6">${cert.description}</div>`:''}
        ${cert.position?`<div style="font-size:18px;font-weight:700;color:#b8860b;margin:12px 0">Position: ${cert.position}</div>`:''}
        <div style="font-size:12px;color:#777;margin:20px 0">Issued on ${new Date(cert.issuedDate||cert.issued_date||Date.now()).toLocaleDateString('en-KE',{dateStyle:'long'})}</div>
        <div style="display:flex;justify-content:space-around;margin-top:40px;font-size:11px">
          <div style="text-align:center"><div style="border-top:1px solid #333;width:160px;padding-top:4px">${cert.signedBy||cert.signed_by||'Principal'}<br>Principal</div></div>
          ${cert.countersignedBy||cert.countersigned_by?`<div style="text-align:center"><div style="border-top:1px solid #333;width:160px;padding-top:4px">${cert.countersignedBy||cert.countersigned_by}<br>Countersignature</div></div>`:''}
        </div>
        <div style="font-size:9px;color:#aaa;margin-top:16px">Certificate No: ${cert.certNum||cert.certificate_number||'—'}</div>
      </div>
    </div>`,
    modern:`
    <div style="font-family:Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:40px;text-align:center;min-height:500px">
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);padding:32px;border-radius:12px">
        <div style="font-size:11px;letter-spacing:4px;color:#a78bfa;text-transform:uppercase;margin-bottom:12px">Certificate of ${cert.type||'Achievement'}</div>
        <div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:4px">${school.name||'School Name'}</div>
        <div style="color:#94a3b8;font-size:12px;margin-bottom:32px">${school.address||''}</div>
        <div style="font-size:14px;color:#94a3b8;margin-bottom:8px">Proudly awarded to</div>
        <div style="font-size:36px;font-weight:800;color:#a78bfa;margin:12px 0">${student.first_name||''} ${student.last_name||''}</div>
        <div style="font-size:16px;font-weight:600;color:#e2e8f0;margin:16px 0">${cert.title}</div>
        ${cert.description?`<div style="font-size:13px;color:#94a3b8;margin:12px auto;max-width:480px">${cert.description}</div>`:''}
        <div style="margin-top:40px;font-size:11px;color:#64748b">${new Date(cert.issuedDate||cert.issued_date||Date.now()).toLocaleDateString('en-KE',{dateStyle:'long'})} | ${cert.certNum||cert.certificate_number||'—'}</div>
      </div>
    </div>`,
  };
  return templates[cert.templateId||cert.template_id||'standard']||templates.standard;
}

module.exports = {getCertificates,issueCertificate,batchIssueCertificates,getCertificate,revokeCertificate,getStats};
