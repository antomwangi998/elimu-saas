// ============================================================
// Leave-Out Controller — Full Multi-Step Approval
// ============================================================
const { query } = require('../config/database');

const createLeaveRequest = async (req, res) => {
  try {
    const { studentId, destination, reason, departureDatetime, expectedReturnDatetime,
            escortName, escortPhone, escortRelationship, emergencyContact } = req.body;
    if(!studentId||!destination) return res.status(400).json({error:'Student and destination required'});
    const {rows} = await query(
      `INSERT INTO leave_out_requests(school_id,student_id,destination,reason,departure_datetime,
        expected_return_datetime,escort_name,escort_phone,escort_relationship,emergency_contact,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending') RETURNING *`,
      [req.schoolId,studentId,destination,reason,departureDatetime,expectedReturnDatetime,
       escortName,escortPhone,escortRelationship,emergencyContact]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const getLeaveRequests = async (req, res) => {
  try {
    const { status, studentId, pending } = req.query;
    let sql = `SELECT lr.*, u.first_name||' '||u.last_name AS student_name, u.admission_number,
                      c.name AS class_name
               FROM leave_out_requests lr
               JOIN users u ON lr.student_id=u.id
               LEFT JOIN classes c ON u.class_id=c.id
               WHERE lr.school_id=$1`;
    const params=[req.schoolId];
    if(status){params.push(status);sql+=` AND lr.status=$${params.length}`;}
    if(studentId){params.push(studentId);sql+=` AND lr.student_id=$${params.length}`;}
    if(pending==='true') sql+=" AND lr.status='pending'";
    sql+=' ORDER BY lr.created_at DESC LIMIT 100';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

const approveLeaveRequest = async (req, res) => {
  try {
    const {id} = req.params;
    const {action, remarks} = req.body;
    const role = req.user.role;
    const approved = action==='approve';
    let updateSql, newStatus;

    if(['teacher','hod','class_teacher'].includes(role)) {
      updateSql = `class_teacher_approved=$3, class_teacher_id=$4, class_teacher_approved_at=NOW()`;
      newStatus = approved ? 'class_teacher_approved' : 'rejected';
    } else if(['dean_of_studies','deputy_principal'].includes(role)) {
      updateSql = `dean_approved=$3, dean_id=$4, dean_approved_at=NOW()`;
      newStatus = approved ? 'dean_approved' : 'rejected';
    } else if(['principal','school_admin','super_admin'].includes(role)) {
      updateSql = `dean_approved=$3, dean_id=$4, dean_approved_at=NOW()`;
      newStatus = approved ? 'approved' : 'rejected';
    } else {
      return res.status(403).json({error:'Insufficient permissions'});
    }

    const {rows} = await query(
      `UPDATE leave_out_requests SET ${updateSql}, status=$5 WHERE id=$1 AND school_id=$2 RETURNING *`,
      [id, req.schoolId, approved, req.user.id, newStatus]);
    if(!rows.length) return res.status(404).json({error:'Leave request not found'});
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const gateCleared = async (req, res) => {
  try {
    const {id} = req.params;
    const {rows} = await query(
      `UPDATE leave_out_requests SET gate_cleared=true,gate_cleared_at=NOW(),gate_cleared_by=$1,status='departed'
       WHERE id=$2 AND school_id=$3 AND status='approved' RETURNING *`,
      [req.user.id, id, req.schoolId]);
    if(!rows.length) return res.status(404).json({error:'Request not found or not approved'});
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};

const recordReturn = async (req, res) => {
  try {
    const {id} = req.params;
    const {rows:lr} = await query(`SELECT expected_return_datetime FROM leave_out_requests WHERE id=$1`,[id]);
    const isLate = lr[0] && new Date(lr[0].expected_return_datetime) < new Date();
    await query(
      `UPDATE leave_out_requests SET actual_return=NOW(), status=$2 WHERE id=$1`,
      [id, isLate?'returned_late':'returned']);
    res.json({success:true, isLate, message: isLate?'Student returned LATE':'Return recorded ✅'});
  } catch(e){res.status(500).json({error:e.message});}
};

const printLeaveSheet = async (req, res) => {
  try {
    const {id} = req.params;
    const {rows} = await query(
      `SELECT lr.*, u.first_name||' '||u.last_name AS student_name, u.admission_number,
              c.name AS class_name, s.name AS school_name, s.address AS school_address, s.phone AS school_phone
       FROM leave_out_requests lr
       JOIN users u ON lr.student_id=u.id
       LEFT JOIN classes c ON u.class_id=c.id
       JOIN schools s ON lr.school_id=s.id
       WHERE lr.id=$1 AND lr.school_id=$2`,[id,req.schoolId]);
    if(!rows.length) return res.status(404).json({error:'Not found'});
    const lr=rows[0];
    res.json({...lr, printHtml: `
      <div style="font-family:Georgia,serif;max-width:700px;margin:auto;padding:24px">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:12px">
          <h2 style="margin:0">${lr.school_name}</h2>
          <p style="margin:4px 0;font-size:12px">${lr.school_address||''} | ${lr.school_phone||''}</p>
          <h3 style="margin:8px 0;text-transform:uppercase;letter-spacing:1px">LEAVE-OUT PERMISSION FORM</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Student:</b> ${lr.student_name}</td><td style="border:1px solid #ccc;padding:7px"><b>Adm No:</b> ${lr.admission_number}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Class:</b> ${lr.class_name||'—'}</td><td style="border:1px solid #ccc;padding:7px"><b>Date:</b> ${new Date().toLocaleDateString('en-KE')}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Destination:</b> ${lr.destination}</td><td style="border:1px solid #ccc;padding:7px"><b>Reason:</b> ${lr.reason||'—'}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Departure:</b> ${lr.departure_datetime?new Date(lr.departure_datetime).toLocaleString('en-KE'):'—'}</td><td style="border:1px solid #ccc;padding:7px"><b>Expected Return:</b> ${lr.expected_return_datetime?new Date(lr.expected_return_datetime).toLocaleString('en-KE'):'—'}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Escort:</b> ${lr.escort_name||'—'}</td><td style="border:1px solid #ccc;padding:7px"><b>Escort Phone:</b> ${lr.escort_phone||'—'}</td></tr>
          <tr><td style="border:1px solid #ccc;padding:7px"><b>Relationship:</b> ${lr.escort_relationship||'—'}</td><td style="border:1px solid #ccc;padding:7px"><b>Emergency Contact:</b> ${lr.emergency_contact||'—'}</td></tr>
        </table>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:30px;font-size:11px;text-align:center">
          ${['Class Teacher','Dean of Students','Principal','Gate Guard'].map(r=>`<div><div style="height:40px"></div><div style="border-top:1px solid #333;padding-top:4px">${r}<br>Sign: _________ Date: ______</div></div>`).join('')}
        </div>
      </div>`});
  } catch(e){res.status(500).json({error:e.message});}
};

const getStats = async (req,res) => {
  try {
    const {rows} = await query(
      `SELECT status,COUNT(*) AS count FROM leave_out_requests WHERE school_id=$1 GROUP BY status`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};

module.exports = {createLeaveRequest,getLeaveRequests,approveLeaveRequest,gateCleared,recordReturn,printLeaveSheet,getStats};
