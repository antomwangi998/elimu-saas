const { query } = require('../config/database');
exports.getPolls = async (req,res) => {
  try {
    const {rows}=await query(`SELECT sp.*,u.first_name||' '||u.last_name AS created_by_name,(SELECT COUNT(*) FROM poll_votes WHERE poll_id=sp.id) AS total_votes,EXISTS(SELECT 1 FROM poll_votes WHERE poll_id=sp.id AND user_id=$2) AS has_voted FROM school_polls sp LEFT JOIN users u ON sp.created_by=u.id WHERE sp.school_id=$1 AND sp.is_active=true AND (sp.end_date IS NULL OR sp.end_date>NOW()) ORDER BY sp.created_at DESC`,[req.schoolId,req.user.id]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createPoll = async (req,res) => {
  try {
    const {title,description,pollType,options,targetRoles,isAnonymous,endDate}=req.body;
    const {rows}=await query(`INSERT INTO school_polls(school_id,title,description,poll_type,options,target_roles,is_anonymous,end_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[req.schoolId,title,description,pollType||'opinion',JSON.stringify(options||[]),targetRoles||['parent'],isAnonymous!==false,endDate||null,req.user.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.vote = async (req,res) => {
  try {
    const {id}=req.params;
    const {optionIndex}=req.body;
    await query(`INSERT INTO poll_votes(poll_id,user_id,option_index) VALUES($1,$2,$3) ON CONFLICT(poll_id,user_id) DO UPDATE SET option_index=$3,voted_at=NOW()`,[id,req.user.id,optionIndex]);
    const {rows}=await query(`SELECT option_index,COUNT(*) AS count FROM poll_votes WHERE poll_id=$1 GROUP BY option_index ORDER BY option_index`,[id]);
    res.json({success:true,results:rows});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getResults = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows:p}=await query(`SELECT * FROM school_polls WHERE id=$1 AND school_id=$2`,[id,req.schoolId]);
    if(!p.length) return res.status(404).json({error:'Poll not found'});
    const {rows:v}=await query(`SELECT option_index,COUNT(*) AS count FROM poll_votes WHERE poll_id=$1 GROUP BY option_index ORDER BY option_index`,[id]);
    const total=v.reduce((a,r)=>a+parseInt(r.count),0);
    res.json({...p[0],results:v,totalVotes:total});
  } catch(e){res.status(500).json({error:e.message});}
};
