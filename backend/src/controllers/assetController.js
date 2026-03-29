const { query } = require('../config/database');
exports.getAssets = async (req,res) => {
  try {
    const {category,status,q}=req.query;
    let sql=`SELECT a.*,u.first_name||' '||u.last_name AS assigned_to_name FROM assets a LEFT JOIN users u ON a.assigned_to=u.id WHERE a.school_id=$1`;
    const params=[req.schoolId];
    if(category){params.push(category);sql+=` AND a.category=$${params.length}`;}
    if(status){params.push(status);sql+=` AND a.status=$${params.length}`;}
    if(q){params.push(`%${q}%`);sql+=` AND (a.name ILIKE $${params.length} OR a.asset_number ILIKE $${params.length})`;}
    sql+=' ORDER BY a.category,a.name';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.createAsset = async (req,res) => {
  try {
    const {name,assetNumber,category,description,purchaseDate,purchaseCost,location,condition,assignedTo,supplier,warrantyExpiry,serialNumber}=req.body;
    const {rows}=await query(`INSERT INTO assets(school_id,name,asset_number,category,description,purchase_date,purchase_cost,current_value,location,condition,assigned_to,supplier,warranty_expiry,serial_number) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[req.schoolId,name,assetNumber,category,description,purchaseDate||null,purchaseCost||0,location,condition||'good',assignedTo||null,supplier,warrantyExpiry||null,serialNumber]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.updateAsset = async (req,res) => {
  try {
    const {id}=req.params;
    const {condition,location,assignedTo,status,disposalReason}=req.body;
    const {rows}=await query(`UPDATE assets SET condition=$1,location=$2,assigned_to=$3,status=$4,disposal_reason=$5,disposal_date=CASE WHEN $4='disposed' THEN CURRENT_DATE ELSE disposal_date END,updated_at=NOW() WHERE id=$6 AND school_id=$7 RETURNING *`,[condition,location,assignedTo||null,status||'active',disposalReason,id,req.schoolId]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getReport = async (req,res) => {
  try {
    const {rows}=await query(`SELECT category,COUNT(*) AS count,SUM(purchase_cost) AS total_cost,SUM(current_value) AS current_value,COUNT(CASE WHEN condition='poor' OR condition='broken' THEN 1 END) AS needs_attention FROM assets WHERE school_id=$1 AND status='active' GROUP BY category ORDER BY count DESC`,[req.schoolId]);
    const {rows:t}=await query(`SELECT COUNT(*) AS total,SUM(purchase_cost) AS total_cost,SUM(current_value) AS current_value FROM assets WHERE school_id=$1 AND status='active'`,[req.schoolId]);
    res.json({byCategory:rows,...t[0]});
  } catch(e){res.status(500).json({error:e.message});}
};
