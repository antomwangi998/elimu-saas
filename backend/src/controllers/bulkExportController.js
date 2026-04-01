// ============================================================
// Bulk Export Controller
// Export report cards, fee statements, ID cards, certificates
// for entire class or stream in one PDF
// ============================================================
const { query } = require('../config/database');
const documentService = require('../services/documentService');
const { getBrandingForDocs } = require('./schoolProfileController');
const { generatePersonalizedComment } = require('../services/aiEngine');
const { getKnecGrade, getCbcLevel } = require('../services/autoCommentEngine');
const logger = require('../config/logger');

// ── POST /api/bulk-export/report-cards ───────────────────────
const bulkExportReportCards = async (req, res) => {
  const { classId, examSeriesId, streamIds } = req.body;
  if (!classId || !examSeriesId) return res.status(400).json({ error: 'classId and examSeriesId required' });

  // Get school branding
  const branding = await getBrandingForDocs(req.schoolId);

  // Get all active students in class
  const { rows: students } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
            s.date_of_birth, s.photo_url, c.name as class_name, c.level, c.stream,
            u.first_name||' '||u.last_name as class_teacher_name
     FROM students s
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN users u ON c.class_teacher_id=u.id
     WHERE s.school_id=$1 AND s.current_class_id=$2 AND s.is_active=true
     ORDER BY s.first_name`,
    [req.schoolId, classId]
  );

  if (!students.length) return res.status(404).json({ error: 'No students found in class' });

  // Get exam series info
  const { rows: examRows } = await query(
    `SELECT es.*, ay.year, tc.term FROM exam_series es
     LEFT JOIN academic_years ay ON es.academic_year_id=ay.id
     LEFT JOIN terms_config tc ON es.term_id=tc.id
     WHERE es.id=$1`,
    [examSeriesId]
  );
  if (!examRows.length) return res.status(404).json({ error: 'Exam series not found' });
  const exam = examRows[0];
  const curriculum = students[0].level <= 2 ? 'cbc' : '844';

  // Get all marks for the class in one query
  const { rows: allMarks } = await query(
    `SELECT sm.student_id, sm.marks, sm.grade, sm.points, sm.is_absent,
            sub.name as subject, sub.code, sub.category, ep.max_marks
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     JOIN subjects sub ON ep.subject_id=sub.id
     WHERE ep.exam_series_id=$1 AND ep.class_id=$2 AND sm.school_id=$3`,
    [examSeriesId, classId, req.schoolId]
  );

  // Get attendance for all students
  const { rows: allAttendance } = await query(
    `SELECT student_id,
            ROUND(100.0*COUNT(*) FILTER (WHERE status='present')/NULLIF(COUNT(*),0),1) as rate,
            COUNT(*) as total_days,
            COUNT(*) FILTER (WHERE status='absent') as absent_days
     FROM attendance_records WHERE school_id=$1 AND student_id=ANY($2)
     GROUP BY student_id`,
    [req.schoolId, students.map(s => s.id)]
  );
  const attByStudent = {};
  allAttendance.forEach(a => { attByStudent[a.student_id] = a; });

  // Group marks by student
  const marksByStudent = {};
  allMarks.forEach(m => {
    if (!marksByStudent[m.student_id]) marksByStudent[m.student_id] = [];
    marksByStudent[m.student_id].push(m);
  });

  // Calculate ranks
  const rankData = students.map(s => {
    const sMarks = marksByStudent[s.id] || [];
    const valid = sMarks.filter(m => !m.is_absent && m.marks !== null);
    const totalPts = valid.reduce((sum, m) => sum + parseFloat(m.points || 0), 0);
    const meanPts = valid.length ? totalPts / valid.length : 0;
    return { studentId: s.id, meanPts };
  }).sort((a, b) => b.meanPts - a.meanPts);
  const rankMap = {};
  rankData.forEach((r, i) => { rankMap[r.studentId] = i + 1; });

  // Build HTML for all report cards
  let allCardsHtml = '';
  const school = {
    name: branding.school_name, logo_url: branding.logo_url,
    address: branding.address, phone: branding.phone, email: branding.email,
    motto: branding.motto, watermark_text: branding.watermark_text,
    watermark_opacity: branding.watermark_opacity || 0.07,
    principal_signature_url: branding.principal_signature_url,
    stamp_url: branding.stamp_url,
    primary_colour: branding.primary_colour || '#1a365d',
    accent_colour: branding.accent_colour || '#d4af37',
  };

  for (const student of students) {
    const marks = marksByStudent[student.id] || [];
    const att = attByStudent[student.id] || { rate: 0, total_days: 0, absent_days: 0 };
    const rank = rankMap[student.id] || students.length;
    const valid = marks.filter(m => !m.is_absent && m.marks !== null);
    const totalMarks = valid.reduce((s, m) => s + parseFloat(m.marks), 0);
    const meanMarks = valid.length ? (totalMarks / valid.length).toFixed(1) : 0;
    const totalPts = valid.reduce((s, m) => s + parseFloat(m.points || 0), 0);
    const meanPts = valid.length ? (totalPts / valid.length).toFixed(2) : 0;
    const gradeInfo = getKnecGrade(meanMarks);

    // Generate personalized comment
    let comment = '';
    try {
      comment = await generatePersonalizedComment(student.id, req.schoolId, examSeriesId);
    } catch (e) {
      const g = getKnecGrade(meanMarks);
      comment = g.grade >= 'B' ? `${student.first_name} has shown commendable performance this term.` : `${student.first_name} is encouraged to work harder.`;
    }

    allCardsHtml += buildSingleCardHtml(school, student, marks, exam, {
      rank, classSize: students.length, meanMarks, meanPts,
      grade: gradeInfo.grade, att, comment, curriculum,
    });
  }

  const fullHtml = buildBulkWrapper(school, allCardsHtml, `${exam.name} — Class ${students[0].class_name}`);
  const pdf = await documentService.htmlToPdf(fullHtml);

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="report-cards-${classId}-${examSeriesId}.pdf"`);
  res.send(pdf);
};

const buildSingleCardHtml = (school, student, marks, exam, summary) => {
  const gradeColour = g => {
    if (['A','A-'].includes(g)) return '#38a169';
    if (['B+','B','B-'].includes(g)) return '#3b82f6';
    if (['C+','C','C-'].includes(g)) return '#d69e2e';
    return '#e53e3e';
  };

  return `
    <div style="page-break-after:always;padding:16px;max-width:210mm;margin:0 auto;position:relative;font-family:Arial,sans-serif;font-size:10px">
      ${school.watermark_text ? `
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);
          font-size:72px;font-weight:900;color:#000;opacity:${school.watermark_opacity};
          pointer-events:none;z-index:0;white-space:nowrap;text-transform:uppercase">
          ${school.watermark_text}
        </div>` : ''}
      <div style="position:relative;z-index:1">
        <div style="display:flex;align-items:center;border-bottom:4px solid ${school.primary_colour};padding-bottom:12px;margin-bottom:12px">
          ${school.logo_url ? `<img src="${school.logo_url}" style="width:80px;height:80px;object-fit:contain;margin-right:16px">` : ''}
          <div style="flex:1">
            <div style="font-size:20px;font-weight:800;color:${school.primary_colour};text-transform:uppercase">${school.name}</div>
            <div style="font-style:italic;color:#4a5568">${school.motto||''}</div>
            <div style="font-size:9px;color:#718096">${school.address||''} | ${school.phone||''}</div>
          </div>
          <div style="background:${school.primary_colour};color:#fff;padding:8px 14px;border-radius:6px;text-align:center">
            <div style="font-size:9px">ACADEMIC REPORT</div>
            <div style="font-weight:700">${exam.name || ''}</div>
            <div style="font-size:9px">${exam.term||''} ${exam.year||''}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">
          ${[
            ['Student', `${student.first_name} ${student.last_name}`],
            ['Adm No', student.admission_number],
            ['Class', student.class_name],
            ['Position', `${summary.rank} / ${summary.classSize}`],
          ].map(([l,v]) => `
            <div style="background:#f7fafc;padding:6px;border-radius:4px;border-left:3px solid ${school.accent_colour}">
              <div style="font-size:8px;color:#718096;text-transform:uppercase">${l}</div>
              <div style="font-weight:700;color:#2d3748">${v}</div>
            </div>`).join('')}
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
          <thead>
            <tr style="background:${school.primary_colour};color:#fff">
              <th style="padding:6px;text-align:left">Subject</th>
              <th style="padding:6px;text-align:center">Score</th>
              <th style="padding:6px;text-align:center">Max</th>
              <th style="padding:6px;text-align:center">Grade</th>
              <th style="padding:6px;text-align:center">Points</th>
            </tr>
          </thead>
          <tbody>
            ${marks.map((m, i) => `
              <tr style="background:${i%2===0?'#fff':'#f7fafc'}">
                <td style="padding:5px 6px">${m.subject}</td>
                <td style="padding:5px 6px;text-align:center;font-weight:600">${m.is_absent ? 'ABS' : m.marks||'-'}</td>
                <td style="padding:5px 6px;text-align:center;color:#718096">${m.max_marks||100}</td>
                <td style="padding:5px 6px;text-align:center">
                  <span style="background:${gradeColour(m.grade)};color:#fff;padding:1px 8px;border-radius:999px;font-size:9px;font-weight:700">${m.grade||'-'}</span>
                </td>
                <td style="padding:5px 6px;text-align:center">${m.points||'-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;background:${school.primary_colour};padding:10px;border-radius:6px;color:#fff;margin-bottom:12px;text-align:center">
          ${[
            ['Mean Marks', summary.meanMarks+'%'],
            ['Mean Points', summary.meanPts],
            ['Mean Grade', summary.grade],
            ['Attendance', (summary.att.rate||0)+'%'],
          ].map(([l,v]) => `<div><div style="font-size:22px;font-weight:800">${v}</div><div style="font-size:8px;opacity:0.8">${l}</div></div>`).join('')}
        </div>
        <div style="background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:12px">
          <div style="font-weight:700;color:${school.primary_colour};margin-bottom:4px;font-size:11px">Class Teacher's Comment</div>
          <div style="line-height:1.7;color:#2d3748">${summary.comment}</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:20px">
          ${school.principal_signature_url
            ? `<div style="text-align:center"><img src="${school.principal_signature_url}" style="height:40px"><div style="border-top:1px solid #000;width:150px;padding-top:2px;font-size:9px">Principal</div></div>`
            : `<div><div style="border-top:1px solid #000;width:150px;margin-top:50px;padding-top:2px;font-size:9px">Principal</div></div>`}
          ${school.stamp_url
            ? `<img src="${school.stamp_url}" style="width:70px;height:70px;object-fit:contain;opacity:0.7">`
            : `<div style="width:70px;height:70px;border:2px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#718096">STAMP</div>`}
          <div><div style="border-top:1px solid #000;width:150px;margin-top:50px;padding-top:2px;font-size:9px">Parent/Guardian</div></div>
        </div>
      </div>
    </div>`;
};

const buildBulkWrapper = (school, content, title) => `
  <!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { .page-break { page-break-after: always; } }
  </style></head><body>${content}</body></html>`;

// ── POST /api/bulk-export/id-cards ───────────────────────────
const bulkExportIdCards = async (req, res) => {
  const { classId, academicYear } = req.body;
  if (!classId) return res.status(400).json({ error: 'classId required' });

  const year = academicYear || new Date().getFullYear();
  const { rows: students } = await query(
    `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.photo_url,
            s.blood_group, s.gender, s.date_of_birth,
            c.name as class_name, c.level,
            ic.card_number, ic.expiry_date, ic.academic_year,
            sp.phone as parent_phone, sp.first_name as parent_name,
            sch.name as school_name, sch.logo_url, sch.phone as school_phone, sch.address
     FROM students s LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN student_id_cards ic ON ic.student_id=s.id AND ic.academic_year=$1
     LEFT JOIN schools sch ON s.school_id=sch.id
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     WHERE s.school_id=$2 AND s.current_class_id=$3 AND s.is_active=true
     ORDER BY s.first_name`,
    [year, req.schoolId, classId]
  );

  if (!students.length) return res.status(404).json({ error: 'No students found' });

  const studentsWithYear = students.map(s => ({
    ...s, academic_year: year,
    card_number: s.card_number || `ID-${year}-${s.admission_number}`,
    expiry_date: s.expiry_date || `${year + 1}-01-31`,
    valid_until: year + 1, max_books: 3,
  }));

  const pdf = await documentService.generateIdCardsPdf(studentsWithYear);

  await query(
    `UPDATE student_id_cards SET printed=true, printed_at=NOW()
     WHERE student_id=ANY($1) AND academic_year=$2 AND school_id=$3`,
    [students.map(s => s.id), year, req.schoolId]
  );

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="id-cards-${classId}-${year}.pdf"`);
  res.send(pdf);
};

// ── POST /api/bulk-export/fee-statements ─────────────────────
const bulkExportFeeStatements = async (req, res) => {
  const { classId } = req.body;
  const branding = await getBrandingForDocs(req.schoolId);

  const { rows: students } = await query(
    `SELECT s.id, s.first_name, s.last_name, s.admission_number, c.name as class_name,
            COALESCE(SUM(sfa.net_fees),0) as expected,
            COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'),0) as paid
     FROM students s
     LEFT JOIN classes c ON s.current_class_id=c.id
     LEFT JOIN student_fee_assignments sfa ON sfa.student_id=s.id
     WHERE s.school_id=$1 AND s.is_active=true ${classId ? 'AND s.current_class_id=$2' : ''}
     GROUP BY s.id, c.name ORDER BY s.first_name`,
    classId ? [req.schoolId, classId] : [req.schoolId]
  );

  // Simple summary PDF
  const school = { name: branding.school_name, logo_url: branding.logo_url, primary_colour: branding.primary_colour || '#1a365d' };
  const totalExpected = students.reduce((s, st) => s + parseFloat(st.expected), 0);
  const totalPaid     = students.reduce((s, st) => s + parseFloat(st.paid), 0);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>* { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,sans-serif; font-size:10px; padding:20px; }
  .header { display:flex; align-items:center; border-bottom:3px solid ${school.primary_colour}; padding-bottom:12px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:${school.primary_colour}; color:#fff; padding:7px; text-align:left; }
  td { padding:6px 7px; border-bottom:1px solid #e2e8f0; }
  tr:nth-child(even) td { background:#f7fafc; }
  .total-row { background:${school.primary_colour}; color:#fff; font-weight:700; }
  </style></head><body>
  <div class="header">
    ${school.logo_url ? `<img src="${school.logo_url}" style="width:60px;height:60px;object-fit:contain;margin-right:12px">` : ''}
    <div>
      <div style="font-size:16px;font-weight:800;color:${school.primary_colour}">${school.name}</div>
      <div style="font-size:12px;font-weight:600;color:#4a5568">FEE COLLECTION REPORT — ${new Date().toLocaleDateString('en-KE',{dateStyle:'full'})}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Student</th><th>Adm No</th><th>Class</th><th style="text-align:right">Expected (KES)</th><th style="text-align:right">Paid (KES)</th><th style="text-align:right">Balance (KES)</th><th>Status</th></tr></thead>
    <tbody>
      ${students.map((s,i) => {
        const bal = parseFloat(s.expected) - parseFloat(s.paid);
        return `<tr>
          <td>${i+1}</td>
          <td><b>${s.first_name} ${s.last_name}</b></td>
          <td>${s.admission_number}</td>
          <td>${s.class_name||'-'}</td>
          <td style="text-align:right">${parseFloat(s.expected).toLocaleString()}</td>
          <td style="text-align:right;color:#38a169;font-weight:600">${parseFloat(s.paid).toLocaleString()}</td>
          <td style="text-align:right;color:${bal>0?'#e53e3e':'#38a169'};font-weight:600">${bal.toLocaleString()}</td>
          <td><span style="background:${bal<=0?'#c6f6d5':bal<parseFloat(s.expected)/2?'#fed7d7':'#fefcbf'};padding:1px 6px;border-radius:4px;font-size:9px">${bal<=0?'CLEARED':bal<parseFloat(s.expected)/2?'PARTIAL':'OUTSTANDING'}</span></td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td colspan="4">TOTALS (${students.length} students)</td>
        <td style="text-align:right">KES ${totalExpected.toLocaleString()}</td>
        <td style="text-align:right">KES ${totalPaid.toLocaleString()}</td>
        <td style="text-align:right">KES ${(totalExpected-totalPaid).toLocaleString()}</td>
        <td>${((totalPaid/Math.max(totalExpected,1))*100).toFixed(1)}% collected</td>
      </tr>
    </tbody>
  </table>
  </body></html>`;

  const pdf = await documentService.htmlToPdf(html);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="fee-statements-${classId||'all'}.pdf"`);
  res.send(pdf);
};

module.exports = { bulkExportReportCards, bulkExportIdCards, bulkExportFeeStatements };


// ============================================================
// Newsletters Controller (replaces stub)
// ============================================================
const { paginatedQuery } = require('../config/database');

const getNewsletters = async (req, res) => {
  const { page=1, limit=20, published } = req.query;
  let sql = `SELECT nl.*, u.first_name||' '||u.last_name as created_by_name
             FROM newsletters nl JOIN users u ON nl.created_by=u.id WHERE nl.school_id=$1`;
  const params = [req.schoolId]; let i = 2;
  if (published !== undefined) { sql += ` AND nl.is_published=$${i++}`; params.push(published==='true'); }
  sql += ' ORDER BY nl.created_at DESC';
  res.json(await paginatedQuery(sql, params, parseInt(page), parseInt(limit)));
};

const createNewsletter = async (req, res) => {
  const { title, subtitle, content, coverImageUrl, termId, academicYearId, category, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title and content required' });
  const { rows } = await query(
    `INSERT INTO newsletters(school_id, title, subtitle, content, cover_image_url, term_id, academic_year_id, category, tags, created_by)
     VALUES($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.schoolId, title, subtitle, JSON.stringify(content), coverImageUrl, termId, academicYearId, category||'general', tags||[], req.user.id]
  );
  res.status(201).json(rows[0]);
};

const publishNewsletter = async (req, res) => {
  const { rows } = await query(
    'UPDATE newsletters SET is_published=true, published_at=NOW() WHERE id=$1 AND school_id=$2 RETURNING *',
    [req.params.id, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Newsletter not found' });
  res.json(rows[0]);
};

const deleteNewsletter = async (req, res) => {
  await query('DELETE FROM newsletters WHERE id=$1 AND school_id=$2', [req.params.id, req.schoolId]);
  res.json({ message: 'Deleted' });
};

module.exports = { ...module.exports, getNewsletters, createNewsletter, publishNewsletter, deleteNewsletter };
