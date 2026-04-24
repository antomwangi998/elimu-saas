// ============================================================
// studentDocumentsController — Student file uploads & documents
// ============================================================
const { query } = require('../config/database');

// Check if documents table exists, create if not
const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS student_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      school_id UUID NOT NULL REFERENCES schools(id),
      document_type VARCHAR(50) NOT NULL DEFAULT 'other',
      name VARCHAR(200) NOT NULL,
      file_url TEXT,
      file_data TEXT, -- base64 for small files
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_docs_school ON student_documents(school_id);
  `);
};

exports.getAll = async (req, res) => {
  try {
    await ensureTable();
    const { studentId, type } = req.query;
    let sql = `SELECT id, student_id, document_type, name, file_url, file_size, mime_type, uploaded_by, created_at,
                      u.first_name||' '||u.last_name as uploaded_by_name
               FROM student_documents sd LEFT JOIN users u ON u.id=sd.uploaded_by
               WHERE sd.school_id=$1`;
    const params = [req.schoolId];
    let i = 2;
    if (studentId) { sql += ` AND sd.student_id=$${i++}`; params.push(studentId); }
    if (type)      { sql += ` AND sd.document_type=$${i++}`; params.push(type); }
    sql += ' ORDER BY sd.created_at DESC';
    const { rows } = await query(sql, params);
    res.json({ data: rows, total: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    await ensureTable();
    const { rows } = await query(
      'SELECT * FROM student_documents WHERE id=$1 AND school_id=$2',
      [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Document not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    await ensureTable();
    const { studentId, documentType, name, fileUrl, fileData, fileSize, mimeType } = req.body;
    if (!studentId || !name) return res.status(400).json({ error: 'studentId and name required' });
    const { rows } = await query(
      `INSERT INTO student_documents(student_id, school_id, document_type, name, file_url, file_data, file_size, mime_type, uploaded_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, name, document_type, created_at`,
      [studentId, req.schoolId, documentType||'other', name, fileUrl||null, fileData||null, fileSize||null, mimeType||null, req.user.id]);
    res.status(201).json({ message: 'Document uploaded', ...rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { name, documentType } = req.body;
    const { rows } = await query(
      `UPDATE student_documents SET name=COALESCE($1,name), document_type=COALESCE($2,document_type)
       WHERE id=$3 AND school_id=$4 RETURNING id`,
      [name||null, documentType||null, req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    await query('DELETE FROM student_documents WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
