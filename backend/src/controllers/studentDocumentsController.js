// ============================================================
// studentDocumentsController — Student document upload and management
// ============================================================
const { query } = require('../config/database');

// ── Student document upload and management ─────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    res.json({ data: [], total: 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.create = async (req, res) => {
  try {
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ id, updated: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
