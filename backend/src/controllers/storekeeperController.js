// ============================================================
// Storekeeper Controller — Full Inventory Management
// ============================================================
const { query, getClient } = require('../config/database');

// ── Categories ────────────────────────────────────────────────
const getCategories = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, COUNT(i.id) FILTER (WHERE i.is_active) AS item_count
       FROM store_categories c
       LEFT JOIN store_items i ON i.category_id = c.id
       WHERE c.school_id = $1
       GROUP BY c.id ORDER BY c.name`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await query(
      `INSERT INTO store_categories (school_id, name, description, parent_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.schoolId, name, description, parentId || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Items ─────────────────────────────────────────────────────
const getItems = async (req, res) => {
  try {
    const { categoryId, search, lowStock, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = ['i.school_id = $1', 'i.is_active = TRUE'];
    const params = [req.schoolId];
    let p = 2;

    if (categoryId) { where.push(`i.category_id = $${p++}`); params.push(categoryId); }
    if (search)     { where.push(`(i.name ILIKE $${p} OR i.code ILIKE $${p})`); params.push(`%${search}%`); p++; }
    if (lowStock === 'true') where.push('i.current_stock <= i.reorder_level');

    const { rows } = await query(
      `SELECT i.*, c.name AS category_name,
              CASE WHEN i.current_stock <= i.minimum_stock THEN 'critical'
                   WHEN i.current_stock <= i.reorder_level THEN 'low' ELSE 'ok' END AS stock_status
       FROM store_items i
       LEFT JOIN store_categories c ON c.id = i.category_id
       WHERE ${where.join(' AND ')}
       ORDER BY i.name
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    );

    const { rows: cnt } = await query(
      `SELECT COUNT(*) FROM store_items i WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({
      data: rows,
      pagination: { total: parseInt(cnt[0].count), page: +page, limit: +limit,
                    pages: Math.ceil(cnt[0].count / limit) }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getItem = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, c.name AS category_name,
              (SELECT COALESCE(SUM(CASE WHEN t.transaction_type='receive' THEN t.quantity ELSE -t.quantity END),0)
               FROM store_transactions t WHERE t.item_id = i.id) AS computed_stock
       FROM store_items i
       LEFT JOIN store_categories c ON c.id = i.category_id
       WHERE i.id = $1 AND i.school_id = $2`,
      [req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });

    // Recent transactions
    const { rows: txns } = await query(
      `SELECT t.*, u.first_name, u.last_name
       FROM store_transactions t
       LEFT JOIN users u ON u.id = t.issued_by
       WHERE t.item_id = $1
       ORDER BY t.created_at DESC LIMIT 20`,
      [req.params.id]
    );

    res.json({ ...rows[0], recentTransactions: txns });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createItem = async (req, res) => {
  try {
    const { name, code, categoryId, description, unit, unitCost,
            reorderLevel, minimumStock, location, supplier, initialStock } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name required' });

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO store_items (school_id, name, code, category_id, description, unit,
           unit_cost, reorder_level, minimum_stock, location, supplier, current_stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [req.schoolId, name, code, categoryId || null, description, unit || 'pieces',
         unitCost || 0, reorderLevel || 10, minimumStock || 5, location, supplier,
         initialStock || 0]
      );

      if (initialStock && initialStock > 0) {
        await client.query(
          `INSERT INTO store_transactions (school_id, item_id, transaction_type, quantity,
             unit_cost, total_value, purpose, issued_by, balance_after)
           VALUES ($1,$2,'receive',$3,$4,$5,'Opening stock',$6,$3)`,
          [req.schoolId, rows[0].id, initialStock, unitCost || 0,
           (initialStock * (unitCost || 0)), req.user.id]
        );
      }

      await client.query('COMMIT');
      res.status(201).json(rows[0]);
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateItem = async (req, res) => {
  try {
    const { name, code, categoryId, description, unit, unitCost,
            reorderLevel, minimumStock, location, supplier } = req.body;
    const { rows } = await query(
      `UPDATE store_items SET name=$1, code=$2, category_id=$3, description=$4,
         unit=$5, unit_cost=$6, reorder_level=$7, minimum_stock=$8,
         location=$9, supplier=$10
       WHERE id=$11 AND school_id=$12 RETURNING *`,
      [name, code, categoryId || null, description, unit || 'pieces', unitCost || 0,
       reorderLevel || 10, minimumStock || 5, location, supplier, req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteItem = async (req, res) => {
  try {
    await query(`UPDATE store_items SET is_active=FALSE WHERE id=$1 AND school_id=$2`,
      [req.params.id, req.schoolId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Transactions ──────────────────────────────────────────────
const getTransactions = async (req, res) => {
  try {
    const { itemId, type, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = ['t.school_id = $1'];
    const params = [req.schoolId];
    let p = 2;

    if (itemId) { where.push(`t.item_id = $${p++}`); params.push(itemId); }
    if (type)   { where.push(`t.transaction_type = $${p++}`); params.push(type); }
    if (from)   { where.push(`t.transaction_date >= $${p++}`); params.push(from); }
    if (to)     { where.push(`t.transaction_date <= $${p++}`); params.push(to); }

    const { rows } = await query(
      `SELECT t.*, i.name AS item_name, i.unit, i.code AS item_code,
              u.first_name || ' ' || u.last_name AS issued_by_name
       FROM store_transactions t
       JOIN store_items i ON i.id = t.item_id
       LEFT JOIN users u ON u.id = t.issued_by
       WHERE ${where.join(' AND ')}
       ORDER BY t.created_at DESC
       LIMIT $${p} OFFSET $${p + 1}`,
      [...params, limit, offset]
    );

    const { rows: cnt } = await query(
      `SELECT COUNT(*) FROM store_transactions t WHERE ${where.join(' AND ')}`, params
    );

    res.json({ data: rows, pagination: { total: parseInt(cnt[0].count), page: +page } });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createTransaction = async (req, res) => {
  try {
    const { itemId, type, quantity, unitCost, issuedTo, receivedFrom,
            purpose, notes, referenceNumber, transactionDate } = req.body;

    if (!itemId || !type || !quantity) {
      return res.status(400).json({ error: 'Item, type, and quantity required' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Get current stock
      const { rows: item } = await client.query(
        'SELECT current_stock, name, unit_cost FROM store_items WHERE id=$1 AND school_id=$2 FOR UPDATE',
        [itemId, req.schoolId]
      );
      if (!item.length) throw new Error('Item not found');

      const currentStock = item[0].current_stock;
      const effectiveUnitCost = unitCost || item[0].unit_cost;

      // Calculate new stock
      let newStock = currentStock;
      if (['receive', 'return'].includes(type)) newStock += parseInt(quantity);
      else if (['issue', 'write_off', 'transfer'].includes(type)) {
        if (currentStock < quantity) throw new Error(`Insufficient stock. Available: ${currentStock} ${item[0].unit}`);
        newStock -= parseInt(quantity);
      } else if (type === 'adjust') {
        newStock = parseInt(quantity);
      }

      // Update stock
      await client.query(
        `UPDATE store_items SET current_stock=$1, last_restocked_at=CASE WHEN $2='receive' THEN NOW() ELSE last_restocked_at END WHERE id=$3`,
        [newStock, type, itemId]
      );

      // Record transaction
      const { rows } = await client.query(
        `INSERT INTO store_transactions (school_id, item_id, transaction_type, quantity,
           unit_cost, total_value, reference_number, issued_to, issued_by, received_from,
           purpose, notes, balance_after, transaction_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [req.schoolId, itemId, type, quantity, effectiveUnitCost,
         quantity * effectiveUnitCost, referenceNumber, issuedTo, req.user.id,
         receivedFrom, purpose, notes, newStock,
         transactionDate || new Date().toISOString().split('T')[0]]
      );

      await client.query('COMMIT');
      res.status(201).json({ ...rows[0], newStock, previousStock: currentStock });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (e) { res.status(400).json({ error: e.message }); }
};

// ── Reports ───────────────────────────────────────────────────
const getStockReport = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, c.name AS category_name,
              COALESCE(issued.total_issued, 0) AS total_issued_month,
              COALESCE(received.total_received, 0) AS total_received_month,
              i.current_stock * i.unit_cost AS stock_value
       FROM store_items i
       LEFT JOIN store_categories c ON c.id = i.category_id
       LEFT JOIN (
         SELECT item_id, SUM(quantity) AS total_issued
         FROM store_transactions
         WHERE transaction_type = 'issue'
           AND transaction_date >= date_trunc('month', CURRENT_DATE)
         GROUP BY item_id
       ) issued ON issued.item_id = i.id
       LEFT JOIN (
         SELECT item_id, SUM(quantity) AS total_received
         FROM store_transactions
         WHERE transaction_type = 'receive'
           AND transaction_date >= date_trunc('month', CURRENT_DATE)
         GROUP BY item_id
       ) received ON received.item_id = i.id
       WHERE i.school_id = $1 AND i.is_active = TRUE
       ORDER BY c.name, i.name`,
      [req.schoolId]
    );

    const summary = {
      totalItems: rows.length,
      totalValue: rows.reduce((s, r) => s + parseFloat(r.stock_value || 0), 0),
      lowStockItems: rows.filter(r => r.current_stock <= r.reorder_level).length,
      criticalItems: rows.filter(r => r.current_stock <= r.minimum_stock).length,
    };

    res.json({ items: rows, summary });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT i.*, c.name AS category_name,
              CASE WHEN i.current_stock <= i.minimum_stock THEN 'critical'
                   ELSE 'low' END AS alert_level
       FROM store_items i
       LEFT JOIN store_categories c ON c.id = i.category_id
       WHERE i.school_id = $1 AND i.is_active = TRUE
         AND i.current_stock <= i.reorder_level
       ORDER BY i.current_stock ASC`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Purchase Orders ───────────────────────────────────────────
const getPurchaseOrders = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT po.*, u.first_name || ' ' || u.last_name AS requested_by_name
       FROM store_purchase_orders po
       LEFT JOIN users u ON u.id = po.requested_by
       WHERE po.school_id = $1
       ORDER BY po.created_at DESC`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, supplierContact, items, notes, expectedDate } = req.body;
    if (!supplier || !items?.length) return res.status(400).json({ error: 'Supplier and items required' });

    const totalAmount = items.reduce((s, i) => s + (i.qty * i.unitCost), 0);
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const { rows } = await query(
      `INSERT INTO store_purchase_orders (school_id, po_number, supplier, supplier_contact,
         items, total_amount, requested_by, expected_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.schoolId, poNumber, supplier, supplierContact, JSON.stringify(items),
       totalAmount, req.user.id, expectedDate, notes]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const approvePurchaseOrder = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE store_purchase_orders SET status='approved', approved_by=$1
       WHERE id=$2 AND school_id=$3 RETURNING *`,
      [req.user.id, req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'PO not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const receivePurchaseOrder = async (req, res) => {
  try {
    const { rows: po } = await query(
      'SELECT * FROM store_purchase_orders WHERE id=$1 AND school_id=$2',
      [req.params.id, req.schoolId]
    );
    if (!po.length) return res.status(404).json({ error: 'PO not found' });

    const client = await getClient();
    try {
      await client.query('BEGIN');
      const items = po[0].items || [];

      for (const item of items) {
        if (!item.item_id) continue;
        const { rows: curr } = await client.query(
          'SELECT current_stock FROM store_items WHERE id=$1 FOR UPDATE', [item.item_id]
        );
        if (!curr.length) continue;
        const newStock = curr[0].current_stock + item.qty;

        await client.query(
          'UPDATE store_items SET current_stock=$1, last_restocked_at=NOW() WHERE id=$2',
          [newStock, item.item_id]
        );
        await client.query(
          `INSERT INTO store_transactions (school_id, item_id, transaction_type, quantity,
             unit_cost, total_value, reference_number, received_from, purpose, issued_by, balance_after)
           VALUES ($1,$2,'receive',$3,$4,$5,$6,$7,'Purchase Order',$8,$9)`,
          [req.schoolId, item.item_id, item.qty, item.unitCost, item.qty * item.unitCost,
           po[0].po_number, po[0].supplier, req.user.id, newStock]
        );
      }

      await client.query(
        `UPDATE store_purchase_orders SET status='received', received_date=CURRENT_DATE WHERE id=$1`,
        [req.params.id]
      );

      await client.query('COMMIT');
      res.json({ success: true, message: 'Purchase order received and stock updated' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getCategories, createCategory,
  getItems, getItem, createItem, updateItem, deleteItem,
  getTransactions, createTransaction,
  getStockReport, getLowStockAlerts,
  getPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder,
};
