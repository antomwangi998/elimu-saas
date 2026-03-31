-- ============================================================
-- Migration 012: Enhanced School Settings
-- ============================================================
ALTER TABLE schools ADD COLUMN IF NOT EXISTS fee_per_day_overdue DECIMAL(5,2) DEFAULT 5.00;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS library_loan_days INTEGER DEFAULT 14;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS max_library_books INTEGER DEFAULT 3;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS attendance_start_time TIME DEFAULT '07:00';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS academic_year_start INTEGER DEFAULT 1;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS sms_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS fcm_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS payroll_enabled BOOLEAN DEFAULT false;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS lab_enabled BOOLEAN DEFAULT false;
