const { query } = require('../config/database');
exports.getItems = async (req,res) => {
  try {
    const {studentId,type,featured}=req.query;
    const sid=studentId||req.user.id;
    let sql=`SELECT pi.*,u.first_name,u.last_name FROM portfolio_items pi JOIN users u ON pi.student_id=u.id WHERE pi.school_id=$1 AND pi.student_id=$2`;
    const params=[req.schoolId,sid];
    if(type){params.push(type);sql+=` AND pi.item_type=$${params.length}`;}
    if(featured==='true') sql+=' AND pi.featured=true';
    sql+=' ORDER BY pi.created_at DESC';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.addItem = async (req,res) => {
  try {
    const {title,description,itemType,subject,fileUrl,thumbnailUrl,tags,isPublic}=req.body;
    const studentId=req.body.studentId||req.user.id;
    const {rows}=await query(`INSERT INTO portfolio_items(school_id,student_id,title,description,item_type,subject,file_url,thumbnail_url,tags,is_public) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[req.schoolId,studentId,title,description,itemType||'project',subject,fileUrl,thumbnailUrl,tags||[],isPublic||false]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.addFeedback = async (req,res) => {
  try {
    const {id}=req.params;
    const {feedback}=req.body;
    const {rows}=await query(`UPDATE portfolio_items SET teacher_feedback=$1,teacher_id=$2 WHERE id=$3 AND school_id=$4 RETURNING *`,[feedback,req.user.id,id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.togglePublic = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows}=await query(`UPDATE portfolio_items SET is_public=NOT is_public WHERE id=$1 AND school_id=$2 AND student_id=$3 RETURNING is_public`,[id,req.schoolId,req.user.id]);
    res.json({isPublic:rows[0]?.is_public});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.deleteItem = async (req,res) => {
  try {
    await query(`DELETE FROM portfolio_items WHERE id=$1 AND school_id=$2 AND (student_id=$3 OR $4=true)`,[req.params.id,req.schoolId,req.user.id,['teacher','principal','school_admin'].includes(req.user.role)]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};
