const router = require('express').Router();
const c = require('../controllers/academicsController');
const { requireMinRole } = require('../middleware/auth');
const staff = requireMinRole('teacher');
const admin = requireMinRole('principal');
router.get('/classes', staff, c.getClasses);
router.post('/classes', admin, c.createClass);
router.put('/classes/:id', admin, c.updateClass);
router.get('/subjects', staff, c.getSubjects);
router.post('/subjects', admin, c.createSubject);
router.get('/exam-series', staff, c.getExamSeries);
router.post('/exam-series', admin, c.createExamSeries);
router.get('/papers/:id', staff, c.getExamPaper);
router.post('/papers/:id/marks', staff, c.saveMarks);
router.post('/papers/:id/submit', staff, c.submitPaper);
router.post('/papers/:id/approve', admin, c.approvePaper);
router.post('/papers/:id/lock', admin, c.lockPaper);
router.get('/broadsheet', staff, c.getBroadsheet);
router.get('/report-card/:studentId', staff, c.getReportCard);

router.put('/years/:id/set-current', (req, res, next) => require('../middleware/auth').requireMinRole('principal')(req, res, next), async (req, res) => {
  try {
    const { query } = require('../config/database');
    await query('UPDATE academic_years SET is_current=false WHERE school_id=$1', [req.schoolId]);
    const { rows } = await query('UPDATE academic_years SET is_current=true WHERE id=$1 AND school_id=$2 RETURNING *', [req.params.id, req.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});


router.get('/years', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { rows } = await query('SELECT * FROM academic_years WHERE school_id=$1 ORDER BY year DESC', [req.schoolId]);
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.post('/years', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { year, startDate, endDate, label } = req.body;
    const { rows } = await query(
      'INSERT INTO academic_years(school_id,year,label,start_date,end_date) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.schoolId, year, label||String(year), startDate, endDate]
    );
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
router.get('/terms', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { rows } = await query(
      'SELECT tc.*, ay.year FROM terms_config tc JOIN academic_years ay ON ay.id=tc.academic_year_id WHERE tc.school_id=$1 ORDER BY ay.year DESC, tc.term',
      [req.schoolId]
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;