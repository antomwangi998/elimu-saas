const { query } = require('../config/database');
exports.getVisitors = async (req,res) => {
  try {
    const {date,status}=req.query;
    let sql=`SELECT v.*,u.first_name||' '||u.last_name AS host_name FROM visitors v LEFT JOIN users u ON v.visiting_who_id=u.id WHERE v.school_id=$1`;
    const params=[req.schoolId];
    if(date){params.push(date);sql+=` AND DATE(v.check_in_time)=$${params.length}`;}
    if(status==='in') sql+=' AND v.check_out_time IS NULL';
    if(status==='out') sql+=' AND v.check_out_time IS NOT NULL';
    sql+=' ORDER BY v.check_in_time DESC LIMIT 100';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.checkIn = async (req,res) => {
  try {
    const {fullName,idNumber,phone,organization,purpose,visitingWho,visitingWhoId,expectedDuration,badgeNumber}=req.body;
    const {rows}=await query(`INSERT INTO visitors(school_id,full_name,id_number,phone,organization,purpose,visiting_who,visiting_who_id,expected_duration,badge_number,cleared_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[req.schoolId,fullName,idNumber,phone,organization,purpose,visitingWho,visitingWhoId||null,expectedDuration,badgeNumber,req.user.id]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.checkOut = async (req,res) => {
  try {
    const {id}=req.params;
    const {rows}=await query(`UPDATE visitors SET check_out_time=NOW() WHERE id=$1 AND school_id=$2 AND check_out_time IS NULL RETURNING *`,[id,req.schoolId]);
    if(!rows.length) return res.status(404).json({error:'Visitor not found or already checked out'});
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getStats = async (req,res) => {
  try {
    const {rows}=await query(`SELECT COUNT(*) AS today,COUNT(CASE WHEN check_out_time IS NULL THEN 1 END) AS currently_in FROM visitors WHERE school_id=$1 AND DATE(check_in_time)=CURRENT_DATE`,[req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
