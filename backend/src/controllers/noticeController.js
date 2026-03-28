const { query } = require('../config/database');
exports.getNotices = async (req,res) => {
  try {
    const {audience,pinned}=req.query;
    let sql=`SELECT n.*,u.first_name||' '||u.last_name AS posted_by,EXISTS(SELECT 1 FROM notice_reads WHERE notice_id=n.id AND user_id=$2) AS is_read FROM notices n LEFT JOIN users u ON n.created_by=u.id WHERE n.school_id=$1 AND (n.expiry_date IS NULL OR n.expiry_date>NOW()) AND n.publish_date<=NOW()`;
    const params=[req.schoolId,req.user.id];
    if(pinned==='true') sql+=' AND n.is_pinned=true';
    if(audience){params.push(audience);sql+=` AND (n.target_audience='all' OR n.target_audience=$${params.length})`;}
    sql+=' ORDER BY n.is_pinned DESC,n.publish_date DESC LIMIT 50';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createNotice = async (req,res) => {
  try {
    const {title,content,noticeType,priority,targetAudience,isPinned,publishDate,expiryDate,attachmentUrl}=req.body;
    const {rows}=await query(`INSERT INTO notices(school_id,title,content,notice_type,priority,target_audience,is_pinned,publish_date,expiry_date,attachment_url,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.schoolId,title,content,noticeType||'general',priority||'normal',targetAudience||'all',isPinned||false,publishDate||new Date().toISOString(),expiryDate||null,attachmentUrl,req.user.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.markRead = async (req,res) => {
  try {
    const {id}=req.params;
    await query(`INSERT INTO notice_reads(notice_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[id,req.user.id]);
    await query(`UPDATE notices SET view_count=view_count+1 WHERE id=$1`,[id]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.deleteNotice = async (req,res) => {
  try {
    await query(`DELETE FROM notices WHERE id=$1 AND school_id=$2`,[req.params.id,req.schoolId]);
    res.json({success:true});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.pinNotice = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows}=await query(`UPDATE notices SET is_pinned=NOT is_pinned WHERE id=$1 AND school_id=$2 RETURNING is_pinned`,[id,req.schoolId]);
    res.json({isPinned:rows[0]?.is_pinned});
  } catch(e){res.status(500).json({error:e.message});}
};
