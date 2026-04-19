const { query, withTransaction } = require('../config/database');

// ── Pricing plans ─────────────────────────────────────────────
const PLANS = {
  starter:    { name:'Starter',    price:3500,  maxStudents:300,  features:{sms:200,storage:2,reports:true,api:false,whatsapp:false,support:'email'} },
  standard:   { name:'Standard',   price:6500,  maxStudents:800,  features:{sms:500,storage:10,reports:true,api:false,whatsapp:false,support:'email'} },
  professional:{ name:'Professional',price:12000,maxStudents:1500, features:{sms:1000,storage:20,reports:true,api:true,whatsapp:true,support:'phone'} },
  enterprise: { name:'Enterprise', price:20000, maxStudents:99999,features:{sms:5000,storage:100,reports:true,api:true,whatsapp:true,support:'dedicated'} },
};

exports.getPlans = (req, res) => {
  res.json({ plans: Object.entries(PLANS).map(([key,p])=>({...p, key})) });
};

exports.getMySubscription = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT s.*, sp.amount as last_payment_amount, sp.paid_at as last_paid_at, sp.payment_method as last_payment_method
       FROM subscriptions s
       LEFT JOIN subscription_payments sp ON sp.subscription_id = s.id
       WHERE s.school_id=$1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.schoolId]
    );
    if (!rows.length) {
      return res.json({ status:'trial', plan:'starter', trialDaysLeft:14, message:'No active subscription' });
    }
    const sub = rows[0];
    const daysLeft = Math.ceil((new Date(sub.end_date)-new Date())/(1000*60*60*24));
    res.json({ ...sub, planDetails: PLANS[sub.plan] || PLANS.starter, daysLeft });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.choosePlan = async (req, res) => {
  try {
    const { plan, paymentMethod, mpesaPhone, mpesaReceipt, bankRef } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan' });
    const p = PLANS[plan];
    const { rows: school } = await query('SELECT * FROM schools WHERE id=$1',[req.schoolId]);
    if (!school.length) return res.status(404).json({ error: 'School not found' });
    const studentCount = school[0].student_count || 0;
    const amount = plan === 'per_student' ? studentCount * 35 : p.price;
    const start = new Date();
    const end   = new Date(start); end.setMonth(end.getMonth()+3); // quarterly
    const grace = new Date(end);   grace.setDate(grace.getDate()+14);

    const result = await withTransaction(async (client) => {
      const { rows: existing } = await client.query(
        `SELECT id FROM subscriptions WHERE school_id=$1 AND status='active' LIMIT 1`,[req.schoolId]);

      let subId;
      if (existing.length) {
        const { rows: updated } = await client.query(
          `UPDATE subscriptions SET plan=$1,status='active',total_amount=$2,start_date=$3,end_date=$4,
           grace_end_date=$5,updated_at=NOW() WHERE id=$6 RETURNING id`,
          [plan,amount,start.toISOString().split('T')[0],end.toISOString().split('T')[0],
           grace.toISOString().split('T')[0],existing[0].id]);
        subId = updated[0].id;
      } else {
        const { rows: newSub } = await client.query(
          `INSERT INTO subscriptions(school_id,plan,status,term,year,student_count,base_price,
           total_amount,amount_paid,start_date,end_date,grace_end_date,next_billing_date,created_by,features)
           VALUES($1,$2,'active','term_1',$3,$4,$5,$6,$6,$7,$8,$9,$8,$10,$11) RETURNING id`,
          [req.schoolId,plan,start.getFullYear(),studentCount,p.price,amount,
           start.toISOString().split('T')[0],end.toISOString().split('T')[0],
           grace.toISOString().split('T')[0],req.user.id,
           JSON.stringify(p.features)]);
        subId = newSub[0].id;
      }

      // Record payment
      if (paymentMethod) {
        await client.query(
          `INSERT INTO subscription_payments(subscription_id,school_id,amount,payment_method,status,
           reference,mpesa_receipt,mpesa_phone,paid_at)
           VALUES($1,$2,$3,$4,'completed',$5,$6,$7,NOW())`,
          [subId,req.schoolId,amount,paymentMethod,bankRef||mpesaReceipt,mpesaReceipt||null,mpesaPhone||null]);
      }

      // Update school subscription_status
      await client.query(`UPDATE schools SET is_active=true WHERE id=$1`,[req.schoolId]);
      return { subId, plan: p.name, amount, endDate: end.toISOString().split('T')[0] };
    });

    res.json({ message:`Subscription activated: ${result.plan}`, ...result });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.recordPayment = async (req, res) => {
  try {
    const { amount, paymentMethod, mpesaReceipt, mpesaPhone, bankRef, notes } = req.body;
    const { rows } = await query(
      `SELECT id FROM subscriptions WHERE school_id=$1 ORDER BY created_at DESC LIMIT 1`,[req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'No subscription found' });
    await query(
      `INSERT INTO subscription_payments(subscription_id,school_id,amount,payment_method,status,reference,mpesa_receipt,mpesa_phone,notes,paid_at)
       VALUES($1,$2,$3,$4,'completed',$5,$6,$7,$8,NOW())`,
      [rows[0].id,req.schoolId,amount,paymentMethod,bankRef||mpesaReceipt,mpesaReceipt||null,mpesaPhone||null,notes||null]);
    await query(`UPDATE subscriptions SET amount_paid=amount_paid+$1,status='active' WHERE id=$2`,[amount,rows[0].id]);
    res.json({ message:'Payment recorded' });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT sp.*,s.plan FROM subscription_payments sp
       JOIN subscriptions s ON s.id=sp.subscription_id
       WHERE sp.school_id=$1 ORDER BY sp.paid_at DESC LIMIT 20`,[req.schoolId]);
    res.json({ data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

// Super admin - all subscriptions
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.*, sc.name as school_name, sc.school_code,
             (SELECT COUNT(*) FROM students st WHERE st.school_id=sc.id) as student_count
      FROM subscriptions s JOIN schools sc ON sc.id=s.school_id
      ORDER BY s.updated_at DESC`);
    res.json({ data: rows });
  } catch(e) { res.status(500).json({ error: e.message }); }
};

exports.updateSubscription = async (req, res) => {
  try {
    const { status, plan, daysExtend } = req.body;
    let sql = 'UPDATE subscriptions SET updated_at=NOW()';
    const params = [];
    if (status) { params.push(status); sql += `,status=$${params.length}`; }
    if (plan)   { params.push(plan);   sql += `,plan=$${params.length}`; }
    if (daysExtend) {
      sql += `,end_date=end_date+INTERVAL '${parseInt(daysExtend)} days'`;
    }
    params.push(req.params.id);
    sql += ` WHERE id=$${params.length} RETURNING id`;
    const { rows } = await query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ message: 'Subscription updated' });
  } catch(e) { res.status(500).json({ error: e.message }); }
};
