// ============================================================
// Templates Controller — Document Templates & Letters
// ============================================================
const { query } = require('../config/database');

const getTemplates = async (req, res) => {
  try {
    const { type, category } = req.query;
    let where = ['t.school_id = $1', 't.is_active = TRUE'];
    const params = [req.schoolId];
    let p = 2;

    if (type)     { where.push(`t.type = $${p++}`); params.push(type); }
    if (category) { where.push(`t.category = $${p++}`); params.push(category); }

    const { rows } = await query(
      `SELECT t.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM document_templates t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE ${where.join(' AND ')}
       ORDER BY t.is_system DESC, t.name`,
      params
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getTemplate = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM document_templates WHERE id=$1 AND school_id=$2`,
      [req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const createTemplate = async (req, res) => {
  try {
    const { name, type, category, contentHtml, placeholders } = req.body;
    if (!name || !contentHtml) return res.status(400).json({ error: 'Name and content required' });

    const { rows } = await query(
      `INSERT INTO document_templates (school_id, name, type, category, content_html,
         placeholders, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.schoolId, name, type || 'letter', category || 'general',
       contentHtml, JSON.stringify(placeholders || []), req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const updateTemplate = async (req, res) => {
  try {
    const { name, contentHtml, category, placeholders } = req.body;
    const { rows } = await query(
      `UPDATE document_templates SET name=$1, content_html=$2, category=$3,
         placeholders=$4, updated_at=NOW()
       WHERE id=$5 AND school_id=$6 RETURNING *`,
      [name, contentHtml, category, JSON.stringify(placeholders || []),
       req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deleteTemplate = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT is_system FROM document_templates WHERE id=$1 AND school_id=$2',
      [req.params.id, req.schoolId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Template not found' });
    if (rows[0].is_system) return res.status(403).json({ error: 'Cannot delete system templates' });

    await query(`UPDATE document_templates SET is_active=FALSE WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const generateDocument = async (req, res) => {
  try {
    const { templateId, variables, recipientId, recipientType } = req.body;

    const { rows: template } = await query(
      'SELECT * FROM document_templates WHERE id=$1 AND school_id=$2',
      [templateId, req.schoolId]
    );
    if (!template.length) return res.status(404).json({ error: 'Template not found' });

    // Get school info
    const { rows: school } = await query(
      'SELECT * FROM schools WHERE id=$1', [req.schoolId]
    );
    const s = school[0] || {};

    // Merge variables with school defaults
    const allVars = {
      school_name: s.name || '',
      school_address: s.address || '',
      school_phone: s.phone || '',
      school_email: s.email || '',
      date: new Date().toLocaleDateString('en-KE', { dateStyle: 'long' }),
      principal_name: s.principal_name || 'The Principal',
      bursar_name: s.bursar_name || 'The Bursar',
      ...variables,
    };

    // Render template — replace {{key}} placeholders
    let renderedHtml = template[0].content_html;
    Object.entries(allVars).forEach(([key, val]) => {
      renderedHtml = renderedHtml.replace(new RegExp(`{{${key}}}`, 'g'), val || '');
    });

    // Save instance
    const title = `${template[0].name} — ${allVars.student_name || allVars.recipients || new Date().toLocaleDateString('en-KE')}`;
    const { rows } = await query(
      `INSERT INTO document_instances (school_id, template_id, title, content_html,
         recipient_type, recipient_id, recipient_name, variables, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.schoolId, templateId, title, renderedHtml, recipientType,
       recipientId || null, allVars.student_name || allVars.recipient_name || '',
       JSON.stringify(allVars), req.user.id]
    );

    res.json({
      instanceId: rows[0].id,
      renderedHtml,
      title,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const getDocumentInstances = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT di.*, dt.name AS template_name, dt.type,
              u.first_name || ' ' || u.last_name AS generated_by_name
       FROM document_instances di
       LEFT JOIN document_templates dt ON dt.id = di.template_id
       LEFT JOIN users u ON u.id = di.generated_by
       WHERE di.school_id = $1
       ORDER BY di.created_at DESC LIMIT 100`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const seedSchoolTemplates = async (req, res) => {
  try {
    await query('SELECT seed_document_templates($1)', [req.schoolId]);
    res.json({ success: true, message: 'Default templates seeded' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = {
  getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  generateDocument, getDocumentInstances, seedSchoolTemplates,
};
