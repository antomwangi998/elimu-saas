-- ============================================================
-- ElimuSaaS — Migration 008: Billing & Invoices
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_assignment_id UUID REFERENCES student_fee_assignments(id),
  term_id           UUID REFERENCES terms_config(id),
  academic_year_id  UUID REFERENCES academic_years(id),
  invoice_number    VARCHAR(60) UNIQUE NOT NULL,
  amount_due        DECIMAL(10,2) NOT NULL,
  amount_paid       DECIMAL(10,2) DEFAULT 0,
  status            VARCHAR(20) DEFAULT 'unpaid'
                    CHECK(status IN ('unpaid','partial','paid','cancelled','sent')),
  due_date          DATE NOT NULL,
  sent_at           TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  reminder_count    INTEGER DEFAULT 0,
  last_reminder_at  TIMESTAMPTZ,
  notes             TEXT,
  generated_by      UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update amount_paid from fee_payments
CREATE OR REPLACE FUNCTION sync_invoice_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE billing_invoices bi
  SET amount_paid = (
    SELECT COALESCE(SUM(fp.amount),0)
    FROM fee_payments fp
    WHERE fp.student_id = NEW.student_id
      AND fp.school_id = NEW.school_id
      AND fp.status = 'completed'
  ),
  status = CASE
    WHEN (SELECT COALESCE(SUM(fp2.amount),0) FROM fee_payments fp2
          WHERE fp2.student_id=NEW.student_id AND fp2.school_id=NEW.school_id AND fp2.status='completed')
         >= bi.amount_due THEN 'paid'
    WHEN (SELECT COALESCE(SUM(fp2.amount),0) FROM fee_payments fp2
          WHERE fp2.student_id=NEW.student_id AND fp2.school_id=NEW.school_id AND fp2.status='completed')
         > 0 THEN 'partial'
    ELSE 'unpaid'
  END,
  paid_at = CASE
    WHEN (SELECT COALESCE(SUM(fp2.amount),0) FROM fee_payments fp2
          WHERE fp2.student_id=NEW.student_id AND fp2.school_id=NEW.school_id AND fp2.status='completed')
         >= bi.amount_due THEN NOW()
    ELSE NULL
  END,
  updated_at = NOW()
  WHERE bi.student_id = NEW.student_id AND bi.school_id = NEW.school_id
    AND bi.status != 'cancelled';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_payment_sync ON fee_payments;
CREATE TRIGGER invoice_payment_sync
  AFTER INSERT OR UPDATE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_payment();

CREATE INDEX IF NOT EXISTS idx_billing_invoices_student ON billing_invoices(student_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_school ON billing_invoices(school_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due ON billing_invoices(due_date, status);
