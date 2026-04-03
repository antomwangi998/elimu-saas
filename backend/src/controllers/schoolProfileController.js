// ============================================================
// School Profile Controller
// Branding, gallery, profile, principal message, alumni showcase
// Used by document generation for watermarks + signatures
// ============================================================
const { query, withTransaction } = require('../config/database');
const { cache } = require('../config/redis');

// ── GET /api/school-profile ───────────────────────────────────
const getProfile = async (req, res) => {
  const cacheKey = `school-profile:${req.schoolId}`;
  const cached = await cache.get(cacheKey).catch(() => null);
  if (cached) return res.json(cached);

  const { rows: profileRows } = await query(
    'SELECT * FROM school_profile WHERE school_id=$1', [req.schoolId]
  );
  const { rows: schoolRows } = await query(
    `SELECT s.*, COUNT(st.id) FILTER (WHERE st.is_active=true) as student_count,
            COUNT(sf.id) FILTER (WHERE sf.is_active=true) as staff_count
     FROM schools s
     LEFT JOIN students st ON st.school_id=s.id
     LEFT JOIN staff sf ON sf.school_id=s.id
     WHERE s.id=$1 GROUP BY s.id`,
    [req.schoolId]
  );
  const { rows: gallery } = await query(
    'SELECT * FROM school_gallery WHERE school_id=$1 ORDER BY is_featured DESC, sort_order, created_at DESC LIMIT 20',
    [req.schoolId]
  );

  const result = {
    school: schoolRows[0] || null,
    profile: profileRows[0] || null,
    gallery,
  };
  await cache.set(cacheKey, result, 300).catch(() => {});
  res.json(result);
};

// ── PUT /api/school-profile ───────────────────────────────────
const updateProfile = async (req, res) => {
  const {
    vision, mission, coreValues, history, achievements,
    principalName, principalMessage,
    facebookUrl, twitterUrl, instagramUrl, youtubeUrl,
    primaryColour, secondaryColour, accentColour,
    principalSignatureUrl, principalSignatureName,
    deputySignatureUrl, bursarSignatureUrl, bursarSignatureName,
    stampUrl, letterheadUrl, watermarkText, watermarkOpacity,
  } = req.body;

  const { rows } = await query(
    `INSERT INTO school_profile(
       school_id, vision, mission, core_values, history, achievements,
       principal_name, principal_message,
       facebook_url, twitter_url, instagram_url, youtube_url,
       primary_colour, secondary_colour, accent_colour,
       principal_signature_url, principal_signature_name,
       deputy_signature_url, bursar_signature_url, bursar_signature_name,
       stamp_url, letterhead_url, watermark_text, watermark_opacity
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     ON CONFLICT(school_id) DO UPDATE SET
       vision=$2, mission=$3, core_values=$4, history=$5, achievements=$6,
       principal_name=$7, principal_message=$8,
       facebook_url=$9, twitter_url=$10, instagram_url=$11, youtube_url=$12,
       primary_colour=$13, secondary_colour=$14, accent_colour=$15,
       principal_signature_url=$16, principal_signature_name=$17,
       deputy_signature_url=$18, bursar_signature_url=$19, bursar_signature_name=$20,
       stamp_url=$21, letterhead_url=$22, watermark_text=$23, watermark_opacity=$24,
       updated_at=NOW()
     RETURNING *`,
    [req.schoolId, vision, mission, coreValues||[], history, achievements||[],
     principalName, principalMessage,
     facebookUrl, twitterUrl, instagramUrl, youtubeUrl,
     primaryColour||'#1a365d', secondaryColour||'#3b82f6', accentColour||'#d4af37',
     principalSignatureUrl, principalSignatureName,
     deputySignatureUrl, bursarSignatureUrl, bursarSignatureName,
     stampUrl, letterheadUrl, watermarkText, watermarkOpacity||0.07]
  );

  // Also update school base fields
  await query(
    'UPDATE schools SET updated_at=NOW() WHERE id=$1', [req.schoolId]
  );

  // Invalidate cache
  await cache.del(`school-profile:${req.schoolId}`).catch(() => {});
  res.json(rows[0]);
};

// ── GALLERY ───────────────────────────────────────────────────
const getGallery = async (req, res) => {
  const { category, featured } = req.query;
  let sql = 'SELECT * FROM school_gallery WHERE school_id=$1';
  const params = [req.schoolId]; let i = 2;
  if (category) { sql += ` AND category=$${i++}`; params.push(category); }
  if (featured === 'true') sql += ' AND is_featured=true';
  sql += ' ORDER BY is_featured DESC, sort_order, created_at DESC';
  const { rows } = await query(sql, params);
  res.json(rows);
};

const addGalleryImage = async (req, res) => {
  const { title, description, imageUrl, category, isFeatured, sortOrder } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });
  const { rows } = await query(
    `INSERT INTO school_gallery(school_id, title, description, image_url, category, is_featured, sort_order, uploaded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.schoolId, title, description, imageUrl, category||'general', isFeatured||false, sortOrder||0, req.user.id]
  );
  await cache.del(`school-profile:${req.schoolId}`).catch(() => {});
  res.status(201).json(rows[0]);
};

const updateGalleryImage = async (req, res) => {
  const { title, description, category, isFeatured, sortOrder } = req.body;
  const { rows } = await query(
    `UPDATE school_gallery SET title=$1, description=$2, category=$3, is_featured=$4, sort_order=$5
     WHERE id=$6 AND school_id=$7 RETURNING *`,
    [title, description, category, isFeatured, sortOrder, req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Image not found' });
  await cache.del(`school-profile:${req.schoolId}`).catch(() => {});
  res.json(rows[0]);
};

const deleteGalleryImage = async (req, res) => {
  await query('DELETE FROM school_gallery WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
  await cache.del(`school-profile:${req.schoolId}`).catch(() => {});
  res.json({ message: 'Image removed' });
};

// ── PUBLIC SCHOOL PROFILE (no auth required) ─────────────────
const getPublicProfile = async (req, res) => {
  const { schoolCode } = req.params;
  const { rows: schoolRows } = await query(
    'SELECT id, name, logo_url, address, county, phone, email, website, motto, type FROM schools WHERE school_code=$1 AND is_active=true',
    [schoolCode.toUpperCase()]
  );
  if (!schoolRows.length) return res.status(404).json({ error: 'School not found' });
  const school = schoolRows[0];

  const { rows: profileRows } = await query('SELECT vision, mission, core_values, history, achievements, principal_name, principal_message, facebook_url, twitter_url, instagram_url, youtube_url, primary_colour, secondary_colour FROM school_profile WHERE school_id=$1', [school.id]);
  const { rows: gallery } = await query('SELECT image_url, title, category FROM school_gallery WHERE school_id=$1 AND is_featured=true ORDER BY sort_order LIMIT 12', [school.id]);
  const { rows: stats } = await query(
    `SELECT COUNT(s.id) FILTER (WHERE s.is_active=true) as students, COUNT(sf.id) FILTER (WHERE sf.is_active=true) as staff
     FROM schools sch LEFT JOIN students s ON s.school_id=sch.id LEFT JOIN staff sf ON sf.school_id=sch.id WHERE sch.id=$1 GROUP BY sch.id`,
    [school.id]
  );

  res.json({ school, profile: profileRows[0]||{}, gallery, stats: stats[0]||{} });
};

// ── ALUMNI SHOWCASE ───────────────────────────────────────────
const getAlumniShowcase = async (req, res) => {
  const { rows } = await query(
    `SELECT id, first_name, last_name, graduation_year, kcse_grade,
            current_occupation, employer, university, course_studied,
            showcase_quote, showcase_image_url, awards, notable_facts,
            social_links, photo_url, is_verified
     FROM alumni
     WHERE school_id=$1 AND is_showcase=true AND is_active=true
     ORDER BY graduation_year DESC, first_name`,
    [req.schoolId]
  );
  res.json(rows);
};

const updateAlumniShowcase = async (req, res) => {
  const { isShowcase, showcaseQuote, showcaseImageUrl, awards, notableFacts, socialLinks } = req.body;
  const { rows } = await query(
    `UPDATE alumni SET is_showcase=$1, showcase_quote=$2, showcase_image_url=$3,
       awards=$4, notable_facts=$5, social_links=$6::jsonb
     WHERE id=$7 AND school_id=$8 RETURNING *`,
    [isShowcase, showcaseQuote, showcaseImageUrl, awards||[], notableFacts, JSON.stringify(socialLinks||{}), req.params.alumniId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Alumni not found' });
  res.json(rows[0]);
};

// ── GET branding for document generation ─────────────────────
const getBrandingForDocs = async (schoolId) => {
  const cacheKey = `branding:${schoolId}`;
  const cached = await cache.get(cacheKey).catch(() => null);
  if (cached) return cached;

  const { rows } = await query(
    `SELECT sp.*, s.name as school_name, s.logo_url, s.address, s.phone, s.email, s.motto
     FROM school_profile sp
     RIGHT JOIN schools s ON sp.school_id=s.id
     WHERE s.id=$1`,
    [schoolId]
  );
  const branding = rows[0] || { school_name: 'School', primary_colour: '#1a365d' };
  await cache.set(cacheKey, branding, 600).catch(() => {});
  return branding;
};

module.exports = {
  getProfile, updateProfile,
  getGallery, addGalleryImage, updateGalleryImage, deleteGalleryImage,
  getPublicProfile, getAlumniShowcase, updateAlumniShowcase,
  getBrandingForDocs,
};
