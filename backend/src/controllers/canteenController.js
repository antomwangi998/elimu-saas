const { query } = require('../config/database');
exports.getItems = async (req,res) => {
  try {
    const {rows}=await query(`SELECT * FROM canteen_items WHERE school_id=$1 ORDER BY category,name`,[req.schoolId]);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.saveItem = async (req,res) => {
  try {
    const {name,category,price,stock,isAvailable}=req.body;
    const {rows}=await query(`INSERT INTO canteen_items(school_id,name,category,price,stock,is_available) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[req.schoolId,name,category||'food',price,stock||0,isAvailable!==false]);
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getWallet = async (req,res) => {
  try {
    const {studentId}=req.params;
    const {rows}=await query(`SELECT cw.*,u.first_name,u.last_name,u.admission_number FROM canteen_wallets cw JOIN users u ON cw.student_id=u.id WHERE cw.student_id=$1 AND cw.school_id=$2`,[studentId,req.schoolId]);
    if(!rows.length){
      const {rows:r}=await query(`INSERT INTO canteen_wallets(school_id,student_id) VALUES($1,$2) ON CONFLICT(school_id,student_id) DO UPDATE SET balance=canteen_wallets.balance RETURNING *`,[req.schoolId,studentId]);
      return res.json(r[0]);
    }
    res.json(rows[0]);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.topUp = async (req,res) => {
  try {
    const {studentId,amount,reference}=req.body;
    if(parseFloat(amount)<=0) return res.status(400).json({error:'Amount must be positive'});
    const {rows}=await query(`INSERT INTO canteen_wallets(school_id,student_id,balance) VALUES($1,$2,$3) ON CONFLICT(school_id,student_id) DO UPDATE SET balance=canteen_wallets.balance+$3 RETURNING *`,[req.schoolId,studentId,amount]);
    await query(`INSERT INTO canteen_transactions(school_id,student_id,transaction_type,amount,balance_after,reference,served_by) VALUES($1,$2,'topup',$3,$4,$5,$6)`,[req.schoolId,studentId,amount,rows[0].balance,reference,req.user.id]);
    res.json({success:true,balance:rows[0].balance});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.purchase = async (req,res) => {
  try {
    const {studentId,items}=req.body;
    const total=items.reduce((s,i)=>s+(parseFloat(i.price)*parseInt(i.qty)),0);
    const {rows:w}=await query(`SELECT * FROM canteen_wallets WHERE student_id=$1 AND school_id=$2`,[studentId,req.schoolId]);
    if(!w.length||parseFloat(w[0].balance)<total) return res.status(400).json({error:`Insufficient balance. Have KES ${w[0]?.balance||0}, need KES ${total}`});
    const {rows}=await query(`UPDATE canteen_wallets SET balance=balance-$1 WHERE student_id=$2 AND school_id=$3 RETURNING *`,[total,studentId,req.schoolId]);
    await query(`INSERT INTO canteen_transactions(school_id,student_id,transaction_type,amount,balance_after,items,served_by) VALUES($1,$2,'purchase',$3,$4,$5,$6)`,[req.schoolId,studentId,total,rows[0].balance,JSON.stringify(items),req.user.id]);
    res.json({success:true,balance:rows[0].balance,total});
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getTransactions = async (req,res) => {
  try {
    const {studentId,from,to}=req.query;
    let sql=`SELECT ct.*,u.first_name||' '||u.last_name AS student_name,u.admission_number FROM canteen_transactions ct JOIN users u ON ct.student_id=u.id WHERE ct.school_id=$1`;
    const params=[req.schoolId];
    if(studentId){params.push(studentId);sql+=` AND ct.student_id=$${params.length}`;}
    if(from){params.push(from);sql+=` AND ct.created_at>=$${params.length}`;}
    if(to){params.push(to);sql+=` AND ct.created_at<=$${params.length}`;}
    sql+=' ORDER BY ct.created_at DESC LIMIT 200';
    const {rows}=await query(sql,params);
    res.json(rows);
  } catch(e){res.status(500).json({error:e.message});}
};
exports.getSales = async (req,res) => {
  try {
    const {rows}=await query(`SELECT DATE(created_at) AS date,SUM(amount) AS total,COUNT(*) AS transactions FROM canteen_transactions WHERE school_id=$1 AND transaction_type='purchase' AND created_at>=NOW()-INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date DESC`,[req.schoolId]);
    const {rows:top}=await query(`SELECT ci.name,SUM((item->>'qty')::int) AS qty_sold FROM canteen_transactions ct,jsonb_array_elements(ct.items) AS item JOIN canteen_items ci ON ci.id=(item->>'id')::uuid WHERE ct.school_id=$1 AND ct.transaction_type='purchase' AND ct.created_at>=NOW()-INTERVAL '30 days' GROUP BY ci.name ORDER BY qty_sold DESC LIMIT 10`,[req.schoolId]).catch(()=>({rows:[]}));
    res.json({daily:rows,topItems:top});
  } catch(e){res.status(500).json({error:e.message});}
};
