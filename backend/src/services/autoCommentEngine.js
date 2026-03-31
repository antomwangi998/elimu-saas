// ============================================================
// Auto Comment Engine — Performance-based comment generation
// Handles both 8-4-4 (marks/grades) and CBC (performance levels)
// ============================================================
const { query } = require('../config/database');

// ── KNEC 8-4-4 Grade Scale ────────────────────────────────────
const KNEC_SCALE = [
  { grade: 'A',   min: 75, max: 100, points: 12, label: 'Excellent' },
  { grade: 'A-',  min: 70, max: 74,  points: 11, label: 'Very Good' },
  { grade: 'B+',  min: 65, max: 69,  points: 10, label: 'Good' },
  { grade: 'B',   min: 60, max: 64,  points: 9,  label: 'Good' },
  { grade: 'B-',  min: 55, max: 59,  points: 8,  label: 'Above Average' },
  { grade: 'C+',  min: 50, max: 54,  points: 7,  label: 'Average' },
  { grade: 'C',   min: 45, max: 49,  points: 6,  label: 'Average' },
  { grade: 'C-',  min: 40, max: 44,  points: 5,  label: 'Below Average' },
  { grade: 'D+',  min: 35, max: 39,  points: 4,  label: 'Poor' },
  { grade: 'D',   min: 30, max: 34,  points: 3,  label: 'Poor' },
  { grade: 'D-',  min: 25, max: 29,  points: 2,  label: 'Very Poor' },
  { grade: 'E',   min: 0,  max: 24,  points: 1,  label: 'Fail' },
];

// ── CBC Performance Level Scale ───────────────────────────────
const CBC_LEVELS = {
  EE: { score: 4, label: 'Exceeding Expectations',    min: 3.5, max: 4.0 },
  ME: { score: 3, label: 'Meeting Expectations',       min: 2.5, max: 3.4 },
  AE: { score: 2, label: 'Approaching Expectations',   min: 1.5, max: 2.4 },
  BE: { score: 1, label: 'Below Expectations',          min: 1.0, max: 1.4 },
};

// ── CBC Default Auto Comments ─────────────────────────────────
const CBC_AUTO_COMMENTS = [
  {
    min: 3.5, max: 4.0, level: 'EE',
    general: 'Exceptional performance across all learning areas. Shows outstanding creativity, critical thinking and application of skills.',
    improvement: 'Continue to explore advanced concepts and mentor peers.',
  },
  {
    min: 2.5, max: 3.4, level: 'ME',
    general: 'Satisfactory performance. Demonstrates good understanding and application of most learning outcomes.',
    improvement: 'Focus on areas that need more practice to reach the highest level.',
  },
  {
    min: 1.5, max: 2.4, level: 'AE',
    general: 'Approaching expected learning outcomes. Shows effort but requires additional support in some areas.',
    improvement: 'Spend more time practising core skills and seek help from teachers.',
  },
  {
    min: 1.0, max: 1.4, level: 'BE',
    general: 'Below expected outcomes. Requires intensive support and regular intervention from both school and home.',
    improvement: 'Daily practice, extra tuition and parental involvement are strongly recommended.',
  },
];

// ── 8-4-4 Default Auto Comments ──────────────────────────────
const GRADE_AUTO_COMMENTS = [
  {
    minPts: 11, maxPts: 12, grades: ['A', 'A-'],
    general: 'Outstanding academic performance. An excellent result that reflects hard work and dedication.',
    improvement: 'Maintain this standard and challenge yourself with more complex problem-solving.',
  },
  {
    minPts: 9, maxPts: 10, grades: ['B+', 'B'],
    general: 'Very good performance. You have shown commendable effort and understanding.',
    improvement: 'With consistent revision and attention to detail, you can reach the top grade.',
  },
  {
    minPts: 7, maxPts: 8, grades: ['B-', 'C+'],
    general: 'Good performance. You are on the right track. Keep working hard.',
    improvement: 'Increase study hours and focus on practising past papers.',
  },
  {
    minPts: 5, maxPts: 6, grades: ['C', 'C-'],
    general: 'Average performance. There is clear room for improvement.',
    improvement: 'Seek guidance from your teachers, improve on revision and complete all assignments.',
  },
  {
    minPts: 3, maxPts: 4, grades: ['D+', 'D'],
    general: 'Below average performance. Immediate attention and effort are required.',
    improvement: 'Dedicate more time to studies, attend extra tuition and discuss challenges with your class teacher.',
  },
  {
    minPts: 1, maxPts: 2, grades: ['D-', 'E'],
    general: 'Very poor performance. This result is a cause for serious concern.',
    improvement: 'Urgent parental involvement, counselling and intensive coaching are strongly recommended.',
  },
];

// ── KNEC Grade Lookup ─────────────────────────────────────────
const getKnecGrade = (marks, customScale = null) => {
  const scale = customScale || KNEC_SCALE;
  const m = parseFloat(marks);
  if (isNaN(m)) return { grade: '-', points: 0, label: '-' };
  const found = scale.find(s => m >= s.min && m <= s.max);
  return found || { grade: 'E', points: 1, label: 'Fail' };
};

// ── CBC Level Lookup (from mean score) ───────────────────────
const getCbcLevel = (meanScore) => {
  const s = parseFloat(meanScore);
  if (s >= 3.5) return { level: 'EE', score: 4, label: 'Exceeding Expectations' };
  if (s >= 2.5) return { level: 'ME', score: 3, label: 'Meeting Expectations' };
  if (s >= 1.5) return { level: 'AE', score: 2, label: 'Approaching Expectations' };
  return { level: 'BE', score: 1, label: 'Below Expectations' };
};

// ── Auto Comment for 8-4-4 (by mean points) ──────────────────
const get844Comment = async (schoolId, meanPoints) => {
  // Try school-specific comments first
  const { rows } = await query(
    `SELECT comment FROM auto_comment_templates
     WHERE school_id=$1 AND curriculum='844' AND $2 >= min_score AND $2 <= max_score
     ORDER BY min_score DESC LIMIT 1`,
    [schoolId, meanPoints]
  ).catch(() => ({ rows: [] }));

  if (rows.length) return rows[0].comment;

  // Fall back to built-in
  const pts = parseFloat(meanPoints);
  const template = GRADE_AUTO_COMMENTS.find(c => pts >= c.minPts && pts <= c.maxPts);
  return template ? template.general : 'Performance recorded.';
};

// ── Auto Comment for CBC (by mean performance level) ─────────
const getCbcComment = async (schoolId, meanLevel) => {
  const { rows } = await query(
    `SELECT comment FROM auto_comment_templates
     WHERE school_id=$1 AND curriculum='cbc' AND $2 >= min_score AND $2 <= max_score
     ORDER BY min_score DESC LIMIT 1`,
    [schoolId, meanLevel]
  ).catch(() => ({ rows: [] }));

  if (rows.length) return rows[0].comment;

  const lvl = parseFloat(meanLevel);
  const template = CBC_AUTO_COMMENTS.find(c => lvl >= c.min && lvl <= c.max);
  return template ? template.general : 'Performance recorded.';
};

// ── Seed KNEC scale into a school ────────────────────────────
const seedKnecScale = async (schoolId, client) => {
  const db = client || require('../config/database');
  const fn = client ? client.query.bind(client) : db.query;
  for (const s of KNEC_SCALE) {
    await fn(
      `INSERT INTO knec_grade_scale(school_id, grade, min_marks, max_marks, points, remarks)
       VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(school_id,grade) DO NOTHING`,
      [schoolId, s.grade, s.min, s.max, s.points, s.label]
    );
  }
};

// ── Seed default auto comments into a school ─────────────────
const seedAutoComments = async (schoolId, client) => {
  const db = client || require('../config/database');
  const fn = client ? client.query.bind(client) : db.query;
  for (const c of GRADE_AUTO_COMMENTS) {
    await fn(
      `INSERT INTO auto_comment_templates(school_id, curriculum, min_score, max_score, grade_label, comment, comment_type)
       VALUES($1,'844',$2,$3,$4,$5,'performance') ON CONFLICT DO NOTHING`,
      [schoolId, c.minPts, c.maxPts, c.grades.join('/'), c.general]
    );
  }
  for (const c of CBC_AUTO_COMMENTS) {
    await fn(
      `INSERT INTO auto_comment_templates(school_id, curriculum, min_score, max_score, grade_label, comment, comment_type)
       VALUES($1,'cbc',$2,$3,$4,$5,'performance') ON CONFLICT DO NOTHING`,
      [schoolId, c.min, c.max, c.level, c.general]
    );
  }
};

// ── Subject Allocation Logic ──────────────────────────────────
const getDefaultSubjectsForLevel = (level) => {
  if (level <= 2) {
    // CBC (Form 1-2 / Junior Secondary)
    return [
      { name: 'Mathematics',                      code: 'MAT', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'English',                          code: 'ENG', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'Kiswahili',                        code: 'KIS', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'Integrated Science',               code: 'SCI', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'Social Studies',                   code: 'SST', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'Religious Education',              code: 'REL', category: 'core',     curriculum: 'cbc', is_compulsory: true },
      { name: 'Creative Arts & Sports',           code: 'CAS', category: 'optional', curriculum: 'cbc', is_compulsory: false },
      { name: 'Agriculture & Nutrition',          code: 'AGN', category: 'optional', curriculum: 'cbc', is_compulsory: false },
      { name: 'Pre-Technical & Pre-Career Edu.',  code: 'PTE', category: 'optional', curriculum: 'cbc', is_compulsory: false },
      { name: 'Business Studies',                 code: 'BST', category: 'optional', curriculum: 'cbc', is_compulsory: false },
    ];
  }
  // 8-4-4 (Form 3-4)
  return [
    { name: 'Mathematics',          code: 'MAT', category: 'compulsory', curriculum: '844', is_compulsory: true,  knec_code: '121' },
    { name: 'English',              code: 'ENG', category: 'compulsory', curriculum: '844', is_compulsory: true,  knec_code: '101' },
    { name: 'Kiswahili',            code: 'KIS', category: 'compulsory', curriculum: '844', is_compulsory: true,  knec_code: '102' },
    { name: 'Biology',              code: 'BIO', category: 'science',    curriculum: '844', is_compulsory: false, knec_code: '231' },
    { name: 'Chemistry',            code: 'CHE', category: 'science',    curriculum: '844', is_compulsory: false, knec_code: '233' },
    { name: 'Physics',              code: 'PHY', category: 'science',    curriculum: '844', is_compulsory: false, knec_code: '232' },
    { name: 'History & Government', code: 'HIS', category: 'humanities', curriculum: '844', is_compulsory: false, knec_code: '311' },
    { name: 'Geography',            code: 'GEO', category: 'humanities', curriculum: '844', is_compulsory: false, knec_code: '312' },
    { name: 'CRE',                  code: 'CRE', category: 'humanities', curriculum: '844', is_compulsory: false, knec_code: '313' },
    { name: 'IRE',                  code: 'IRE', category: 'humanities', curriculum: '844', is_compulsory: false, knec_code: '314' },
    { name: 'Business Studies',     code: 'BST', category: 'technical',  curriculum: '844', is_compulsory: false, knec_code: '565' },
    { name: 'Computer Studies',     code: 'COM', category: 'technical',  curriculum: '844', is_compulsory: false, knec_code: '451' },
    { name: 'Agriculture',          code: 'AGR', category: 'technical',  curriculum: '844', is_compulsory: false, knec_code: '443' },
    { name: 'Home Science',         code: 'HOM', category: 'technical',  curriculum: '844', is_compulsory: false, knec_code: '441' },
    { name: 'Art & Design',         code: 'ART', category: 'arts',       curriculum: '844', is_compulsory: false, knec_code: '531' },
    { name: 'Music',                code: 'MUS', category: 'arts',       curriculum: '844', is_compulsory: false, knec_code: '532' },
    { name: 'French',               code: 'FRE', category: 'languages',  curriculum: '844', is_compulsory: false, knec_code: '122' },
  ];
};

module.exports = {
  KNEC_SCALE,
  CBC_LEVELS,
  getKnecGrade,
  getCbcLevel,
  get844Comment,
  getCbcComment,
  seedKnecScale,
  seedAutoComments,
  getDefaultSubjectsForLevel,
};
