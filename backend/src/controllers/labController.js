// ============================================================
// Lab Inventory Controller
// ============================================================
const { query } = require('../config/database');

exports.getCategories = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT lc.*, COUNT(li.id) AS item_count
       FROM lab_categories lc LEFT JOIN lab_items li ON li.category_id=lc.id
       WHERE lc.school_id=$1 GROUP BY lc.id ORDER BY lc.name`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const { rows } = await query(
      `INSERT INTO lab_categories(school_id,name,description) VALUES($1,$2,$3) RETURNING *`,
      [req.schoolId, name, description]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getItems = async (req, res) => {
  try {
    const { categoryId, type, condition, q } = req.query;
    let sql = `SELECT li.*, lc.name AS category_name
               FROM lab_items li LEFT JOIN lab_categories lc ON li.category_id=lc.id
               WHERE li.school_id=$1`;
    const params = [req.schoolId];
    if (categoryId) { params.push(categoryId); sql += ` AND li.category_id=$${params.length}`; }
    if (type) { params.push(type); sql += ` AND li.item_type=$${params.length}`; }
    if (condition) { params.push(condition); sql += ` AND li.condition=$${params.length}`; }
    if (q) { params.push(`%${q}%`); sql += ` AND (li.name ILIKE $${params.length} OR li.code ILIKE $${params.length})`; }
    sql += ' ORDER BY li.name';
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT li.*, lc.name AS category_name FROM lab_items li
       LEFT JOIN lab_categories lc ON li.category_id=lc.id
       WHERE li.id=$1 AND li.school_id=$2`,
      [id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    const { rows: txns } = await query(
      `SELECT lt.*, u.first_name||' '||u.last_name AS handled_by_name
       FROM lab_transactions lt LEFT JOIN users u ON lt.handled_by=u.id
       WHERE lt.item_id=$1 ORDER BY lt.transaction_date DESC LIMIT 20`,
      [id]
    );
    res.json({ ...rows[0], transactions: txns });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createItem = async (req, res) => {
  try {
    const { name, code, categoryId, description, itemType='equipment', quantity=0, unit='pieces',
            condition='good', location, supplier, purchaseDate, purchaseCost,
            lastServiced, nextServiceDue, isHazardous=false, safetyNotes } = req.body;
    const { rows } = await query(
      `INSERT INTO lab_items(school_id,name,code,category_id,description,item_type,quantity,unit,
        condition,location,supplier,purchase_date,purchase_cost,last_serviced,next_service_due,is_hazardous,safety_notes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [req.schoolId, name, code, categoryId||null, description, itemType, quantity, unit,
       condition, location, supplier, purchaseDate||null, purchaseCost||null,
       lastServiced||null, nextServiceDue||null, isHazardous, safetyNotes]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, condition, location, quantity, nextServiceDue, isHazardous, safetyNotes } = req.body;
    const { rows } = await query(
      `UPDATE lab_items SET name=$1,condition=$2,location=$3,quantity=$4,next_service_due=$5,
        is_hazardous=$6,safety_notes=$7,updated_at=NOW()
       WHERE id=$8 AND school_id=$9 RETURNING *`,
      [name, condition, location, quantity, nextServiceDue||null, isHazardous, safetyNotes, id, req.schoolId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.issueItem = async (req, res) => {
  try {
    const { itemId, quantity, issuedTo, issuedToId, classId, purpose, experimentName, returnDate } = req.body;
    // Check stock
    const { rows: item } = await query(
      `SELECT * FROM lab_items WHERE id=$1 AND school_id=$2`, [itemId, req.schoolId]
    );
    if (!item.length) return res.status(404).json({ error: 'Item not found' });
    if (item[0].quantity < quantity) return res.status(400).json({ error: `Only ${item[0].quantity} available` });

    await query(`UPDATE lab_items SET quantity=quantity-$1 WHERE id=$2`, [quantity, itemId]);
    const { rows } = await query(
      `INSERT INTO lab_transactions(school_id,item_id,transaction_type,quantity,issued_to,issued_to_id,
        class_id,purpose,experiment_name,return_date,handled_by)
       VALUES($1,$2,'issue',$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.schoolId, itemId, quantity, issuedTo, issuedToId||null, classId||null,
       purpose, experimentName, returnDate||null, req.user.id]
    );
    res.json({ transaction: rows[0], newQuantity: item[0].quantity - quantity });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.returnItem = async (req, res) => {
  try {
    const { transactionId, returnedQuantity, conditionAfter='good', notes } = req.body;
    const { rows: txn } = await query(
      `SELECT * FROM lab_transactions WHERE id=$1 AND school_id=$2`, [transactionId, req.schoolId]
    );
    if (!txn.length) return res.status(404).json({ error: 'Transaction not found' });
    await query(
      `UPDATE lab_transactions SET returned_quantity=$1,condition_after=$2,notes=$3,return_date=CURRENT_DATE WHERE id=$4`,
      [returnedQuantity, conditionAfter, notes, transactionId]
    );
    // Return to stock (only good/fair condition)
    if (['good','fair'].includes(conditionAfter)) {
      await query(`UPDATE lab_items SET quantity=quantity+$1 WHERE id=$2`, [returnedQuantity, txn[0].item_id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getExperiments = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT le.*, u.first_name||' '||u.last_name AS conducted_by_name
       FROM lab_experiments le LEFT JOIN users u ON le.conducted_by=u.id
       WHERE le.school_id=$1 ORDER BY le.scheduled_date DESC`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createExperiment = async (req, res) => {
  try {
    const { name, subjectId, classId, description, objectives, procedure,
            requiredItems=[], scheduledDate, conductedBy } = req.body;
    const { rows } = await query(
      `INSERT INTO lab_experiments(school_id,name,subject_id,class_id,description,objectives,
        procedure,required_items,scheduled_date,conducted_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.schoolId, name, subjectId||null, classId||null, description, objectives,
       procedure, JSON.stringify(requiredItems), scheduledDate||null, conductedBy||req.user.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getAlerts = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT li.*, lc.name AS category_name
       FROM lab_items li LEFT JOIN lab_categories lc ON li.category_id=lc.id
       WHERE li.school_id=$1 AND (li.quantity < 3 OR li.condition IN ('poor','broken')
         OR (li.next_service_due IS NOT NULL AND li.next_service_due <= CURRENT_DATE + 7))
       ORDER BY li.condition`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getReport = async (req, res) => {
  try {
    const { rows: items } = await query(
      `SELECT li.*, lc.name AS category_name,
              COALESCE((SELECT SUM(quantity) FROM lab_transactions WHERE item_id=li.id AND transaction_type='issue' 
                AND transaction_date >= NOW() - INTERVAL '30 days'),0) AS issued_month
       FROM lab_items li LEFT JOIN lab_categories lc ON li.category_id=lc.id
       WHERE li.school_id=$1 ORDER BY li.name`,
      [req.schoolId]
    );
    const { rows: summary } = await query(
      `SELECT COUNT(*) AS total_items,
              SUM(CASE WHEN condition='good' THEN 1 ELSE 0 END) AS good_condition,
              SUM(CASE WHEN condition IN ('poor','broken') THEN 1 ELSE 0 END) AS needs_attention,
              SUM(CASE WHEN is_hazardous=true THEN 1 ELSE 0 END) AS hazardous_items,
              SUM(purchase_cost * quantity) AS total_value
       FROM lab_items WHERE school_id=$1`,
      [req.schoolId]
    );
    res.json({ items, summary: summary[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
