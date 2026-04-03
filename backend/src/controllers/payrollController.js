// ============================================================
// Payroll Controller
// ============================================================
const { query } = require('../config/database');

// ── Payroll Grades ────────────────────────────────────────────
exports.getGrades = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM payroll_grades WHERE school_id=$1 ORDER BY basic_salary DESC`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.createGrade = async (req, res) => {
  try {
    const { name, basicSalary, houseAllowance=0, transportAllowance=0, medicalAllowance=0, otherAllowances=0, description } = req.body;
    const { rows } = await query(
      `INSERT INTO payroll_grades(school_id,name,basic_salary,house_allowance,transport_allowance,medical_allowance,other_allowances,description)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.schoolId, name, basicSalary, houseAllowance, transportAllowance, medicalAllowance, otherAllowances, description]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, basicSalary, houseAllowance, transportAllowance, medicalAllowance, otherAllowances } = req.body;
    const { rows } = await query(
      `UPDATE payroll_grades SET name=$1,basic_salary=$2,house_allowance=$3,transport_allowance=$4,medical_allowance=$5,other_allowances=$6
       WHERE id=$7 AND school_id=$8 RETURNING *`,
      [name, basicSalary, houseAllowance, transportAllowance, medicalAllowance, otherAllowances, id, req.schoolId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Staff Payroll Setup ───────────────────────────────────────
exports.getStaffPayroll = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT sp.*, u.first_name, u.last_name, u.email, u.tsc_number, u.role,
              pg.name AS grade_name
       FROM staff_payroll sp
       JOIN users u ON sp.staff_id = u.id
       LEFT JOIN payroll_grades pg ON sp.payroll_grade_id = pg.id
       WHERE sp.school_id=$1 ORDER BY u.last_name`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.upsertStaffPayroll = async (req, res) => {
  try {
    const { staffId, payrollGradeId, basicSalary, houseAllowance=0, transportAllowance=0,
            medicalAllowance=0, hardshipAllowance=0, otherAllowances=0,
            nhifDeduction=0, nssfDeduction=0, payeDeduction=0, loanDeduction=0, otherDeductions=0,
            bankName, bankAccount, bankBranch, mpesaNumber, paymentMethod='bank' } = req.body;
    const { rows } = await query(
      `INSERT INTO staff_payroll(school_id,staff_id,payroll_grade_id,basic_salary,house_allowance,transport_allowance,
        medical_allowance,hardship_allowance,other_allowances,nhif_deduction,nssf_deduction,paye_deduction,
        loan_deduction,other_deductions,bank_name,bank_account,bank_branch,mpesa_number,payment_method)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT(school_id,staff_id) DO UPDATE SET
         payroll_grade_id=$3,basic_salary=$4,house_allowance=$5,transport_allowance=$6,
         medical_allowance=$7,hardship_allowance=$8,other_allowances=$9,
         nhif_deduction=$10,nssf_deduction=$11,paye_deduction=$12,loan_deduction=$13,other_deductions=$14,
         bank_name=$15,bank_account=$16,bank_branch=$17,mpesa_number=$18,payment_method=$19,updated_at=NOW()
       RETURNING *`,
      [req.schoolId, staffId, payrollGradeId||null, basicSalary, houseAllowance, transportAllowance,
       medicalAllowance, hardshipAllowance, otherAllowances, nhifDeduction, nssfDeduction, payeDeduction,
       loanDeduction, otherDeductions, bankName, bankAccount, bankBranch, mpesaNumber, paymentMethod]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ── Payroll Runs ──────────────────────────────────────────────
exports.getRuns = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT pr.*, u.first_name||' '||u.last_name AS created_by_name
       FROM payroll_runs pr LEFT JOIN users u ON pr.created_by=u.id
       WHERE pr.school_id=$1 ORDER BY pr.year DESC, pr.month DESC LIMIT 24`,
      [req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.generateRun = async (req, res) => {
  try {
    const { month, year, notes } = req.body;
    // Get all active staff with payroll setup
    const { rows: staff } = await query(
      `SELECT sp.*, u.first_name, u.last_name, u.id AS uid
       FROM staff_payroll sp JOIN users u ON sp.staff_id=u.id
       WHERE sp.school_id=$1 AND sp.is_active=true`,
      [req.schoolId]
    );
    if (!staff.length) return res.status(400).json({ error: 'No staff with payroll setup found' });

    // Create or get run
    let run;
    try {
      const { rows } = await query(
        `INSERT INTO payroll_runs(school_id,month,year,notes,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *`,
        [req.schoolId, month, year, notes, req.user.id]
      );
      run = rows[0];
    } catch {
      const { rows } = await query(
        `SELECT * FROM payroll_runs WHERE school_id=$1 AND month=$2 AND year=$3`,
        [req.schoolId, month, year]
      );
      run = rows[0];
    }

    // Delete old slips for this run
    await query(`DELETE FROM payroll_slips WHERE payroll_run_id=$1`, [run.id]);

    let totalGross=0, totalDed=0, totalNet=0;
    for (const s of staff) {
      const gross = parseFloat(s.basic_salary)+parseFloat(s.house_allowance||0)+parseFloat(s.transport_allowance||0)+
                    parseFloat(s.medical_allowance||0)+parseFloat(s.hardship_allowance||0)+parseFloat(s.other_allowances||0);
      const ded = parseFloat(s.nhif_deduction||0)+parseFloat(s.nssf_deduction||0)+parseFloat(s.paye_deduction||0)+
                  parseFloat(s.loan_deduction||0)+parseFloat(s.other_deductions||0);
      const net = gross - ded;
      totalGross+=gross; totalDed+=ded; totalNet+=net;
      await query(
        `INSERT INTO payroll_slips(payroll_run_id,school_id,staff_id,basic_salary,house_allowance,transport_allowance,
          medical_allowance,hardship_allowance,other_allowances,gross_salary,nhif_deduction,nssf_deduction,
          paye_deduction,loan_deduction,other_deductions,total_deductions,net_salary)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [run.id, req.schoolId, s.staff_id, s.basic_salary, s.house_allowance||0, s.transport_allowance||0,
         s.medical_allowance||0, s.hardship_allowance||0, s.other_allowances||0, gross,
         s.nhif_deduction||0, s.nssf_deduction||0, s.paye_deduction||0, s.loan_deduction||0,
         s.other_deductions||0, ded, net]
      );
    }
    await query(
      `UPDATE payroll_runs SET total_gross=$1,total_deductions=$2,total_net=$3,staff_count=$4,status='draft' WHERE id=$5`,
      [totalGross, totalDed, totalNet, staff.length, run.id]
    );
    res.json({ ...run, totalGross, totalDeductions: totalDed, totalNet, staffCount: staff.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.approveRun = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      `UPDATE payroll_runs SET status='approved',approved_by=$1,approved_at=NOW() WHERE id=$2 AND school_id=$3 RETURNING *`,
      [req.user.id, id, req.schoolId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getSlips = async (req, res) => {
  try {
    const { runId } = req.params;
    const { rows } = await query(
      `SELECT ps.*, u.first_name, u.last_name, u.role, u.tsc_number,
              sp.bank_name, sp.bank_account, sp.mpesa_number, sp.payment_method
       FROM payroll_slips ps
       JOIN users u ON ps.staff_id=u.id
       LEFT JOIN staff_payroll sp ON sp.staff_id=u.id AND sp.school_id=$1
       WHERE ps.payroll_run_id=$2 ORDER BY u.last_name`,
      [req.schoolId, runId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getMySlip = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT ps.*, pr.month, pr.year,
              s.name AS school_name, s.address AS school_address
       FROM payroll_slips ps
       JOIN payroll_runs pr ON ps.payroll_run_id=pr.id
       JOIN schools s ON ps.school_id=s.id
       WHERE ps.staff_id=$1 AND ps.school_id=$2
       ORDER BY pr.year DESC, pr.month DESC LIMIT 12`,
      [req.user.id, req.schoolId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getSummary = async (req, res) => {
  try {
    const { rows: runs } = await query(
      `SELECT COUNT(*) AS total_runs,
              SUM(total_gross) AS total_gross_ytd,
              SUM(total_net) AS total_net_ytd,
              SUM(staff_count) AS total_staff_paid
       FROM payroll_runs WHERE school_id=$1 AND year=EXTRACT(YEAR FROM NOW())`,
      [req.schoolId]
    );
    const { rows: pending } = await query(
      `SELECT COUNT(*) AS pending FROM staff_payroll WHERE school_id=$1 AND is_active=true`, [req.schoolId]
    );
    res.json({ ...runs[0], staffOnPayroll: pending[0]?.pending || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
