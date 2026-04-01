// ============================================================
// Documents Controller
// ============================================================
const { query, paginatedQuery } = require('../config/database');

const getDocuments = async (req, res) => {
  const { page = 1, limit = 20, category, classId, search } = req.query;
  let sql = `SELECT d.*, u.first_name || ' ' || u.last_name as uploaded_by_name
             FROM documents d JOIN users u ON d.uploaded_by=u.id
             WHERE d.school_id=$1`;
  const params = [req.schoolId];
  let i = 2;
  if (category) { sql += ` AND d.category=$${i++}`; params.push(category); }
  if (classId) { sql += ` AND (d.class_id=$${i++} OR d.class_id IS NULL)`; params.push(classId); }
  if (search) { sql += ` AND d.title ILIKE $${i++}`; params.push(`%${search}%`); }
  sql += ' ORDER BY d.created_at DESC';
  const result = await paginatedQuery(sql, params, parseInt(page), parseInt(limit));
  res.json(result);
};

const uploadDocument = async (req, res) => {
  const { title, category, classId, subjectId, description, fileUrl, fileSize, mimeType } = req.body;
  if (!title || !fileUrl) return res.status(400).json({ error: 'title and fileUrl required' });
  const { rows } = await query(
    `INSERT INTO documents(school_id, title, category, class_id, subject_id, description,
       file_url, file_size, mime_type, uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.schoolId, title, category || 'other', classId, subjectId, description, fileUrl, fileSize, mimeType, req.user.id]
  );
  res.status(201).json(rows[0]);
};

const deleteDocument = async (req, res) => {
  await query('DELETE FROM documents WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
  res.json({ message: 'Document deleted' });
};

module.exports = { getDocuments, uploadDocument, deleteDocument };
