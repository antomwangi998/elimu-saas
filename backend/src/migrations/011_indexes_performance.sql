-- ============================================================
-- Migration 011: Additional Performance Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_billing_student ON billing_invoices(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date, school_id);
CREATE INDEX IF NOT EXISTS idx_student_marks_student ON student_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_series_school ON exam_series(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_school ON timetable_periods(school_id);
