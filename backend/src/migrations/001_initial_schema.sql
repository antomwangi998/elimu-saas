-- ============================================================
-- ElimuSaaS — Complete Database Schema
-- PostgreSQL 14+
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ── ENUMS ─────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'super_admin', 'school_admin', 'principal', 'deputy_principal',
  'hod', 'teacher', 'bursar', 'librarian', 'student', 'parent', 'alumni'
);
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'grace', 'suspended', 'cancelled');
CREATE TYPE subscription_plan AS ENUM ('per_student', 'flat_small', 'flat_medium', 'flat_large', 'custom');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE payment_method AS ENUM ('mpesa_stk', 'mpesa_paybill', 'bank_transfer', 'cash', 'cheque', 'stripe');
CREATE TYPE exam_type AS ENUM ('opener', 'mid_term', 'end_term', 'mock', 'kcse', 'kcpe', 'continuous');
CREATE TYPE grade_status AS ENUM ('draft', 'submitted', 'hod_approved', 'deputy_approved', 'locked');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused', 'sick');
CREATE TYPE leave_status AS ENUM ('pending', 'class_teacher_approved', 'deputy_approved', 'principal_approved', 'rejected', 'returned', 'overdue');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE term AS ENUM ('term_1', 'term_2', 'term_3');
CREATE TYPE school_type AS ENUM ('primary', 'secondary', 'mixed', 'special');
CREATE TYPE boarding_type AS ENUM ('day', 'boarding', 'mixed');
CREATE TYPE notification_type AS ENUM ('sms', 'email', 'push', 'in_app');
CREATE TYPE club_role AS ENUM ('patron', 'chairperson', 'secretary', 'treasurer', 'member');
CREATE TYPE document_category AS ENUM ('notes', 'assignment', 'report', 'circular', 'policy', 'certificate', 'other');
CREATE TYPE fee_category AS ENUM ('tuition', 'transport', 'boarding', 'exams', 'activity', 'uniform', 'book', 'other');
CREATE TYPE certificate_type AS ENUM ('academic', 'sports', 'arts', 'leadership', 'participation', 'merit');

-- ============================================================
-- PLATFORM LEVEL (Super Admin)
-- ============================================================

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  type school_type DEFAULT 'secondary',
  boarding_type boarding_type DEFAULT 'day',
  motto TEXT,
  description TEXT,
  logo_url TEXT,
  cover_photo_url TEXT,
  address TEXT,
  county VARCHAR(100),
  sub_county VARCHAR(100),
  ward VARCHAR(100),
  gps_latitude DECIMAL(10,8),
  gps_longitude DECIMAL(11,8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  founded_year INTEGER,
  knec_code VARCHAR(20),
  ministry_code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE school_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  category VARCHAR(50) DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────────
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'per_student',
  status subscription_status DEFAULT 'trial',
  term term NOT NULL,
  year INTEGER NOT NULL,
  student_count INTEGER DEFAULT 0,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grace_end_date DATE,
  next_billing_date DATE,
  features JSONB DEFAULT '{"sms_limit": 500, "storage_gb": 5}',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  reference VARCHAR(100),
  mpesa_receipt VARCHAR(100),
  mpesa_phone VARCHAR(20),
  stripe_payment_id VARCHAR(100),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'teacher',
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  gender gender,
  national_id VARCHAR(20),
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  last_login_ip VARCHAR(45),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ DEFAULT NOW(),
  must_change_password BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{"theme": "dark", "notifications": true}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  label VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, year)
);

CREATE TABLE terms_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  term term NOT NULL,
  label VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year_id, term)
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL,
  stream VARCHAR(20),
  label VARCHAR(100),
  class_teacher_id UUID REFERENCES users(id),
  capacity INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, level, stream)
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  category VARCHAR(50) DEFAULT 'core',
  is_compulsory BOOLEAN DEFAULT true,
  knec_code VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, code)
);

CREATE TABLE class_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  periods_per_week INTEGER DEFAULT 5,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, subject_id, academic_year_id, term_id)
);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  admission_number VARCHAR(50) NOT NULL,
  kcpe_index_number VARCHAR(50),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  gender gender NOT NULL,
  date_of_birth DATE,
  photo_url TEXT,
  nationality VARCHAR(50) DEFAULT 'Kenyan',
  county VARCHAR(100),
  sub_county VARCHAR(100),
  current_class_id UUID REFERENCES classes(id),
  current_year INTEGER,
  current_term term,
  admission_date DATE NOT NULL,
  graduation_date DATE,
  kcse_index_number VARCHAR(50),
  is_boarding BOOLEAN DEFAULT false,
  dorm_name VARCHAR(100),
  bed_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  left_school_reason TEXT,
  medical_conditions TEXT,
  blood_group VARCHAR(5),
  emergency_contact TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, admission_number)
);

CREATE TABLE student_parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  relationship VARCHAR(50) NOT NULL DEFAULT 'parent',
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alt_phone VARCHAR(20),
  email VARCHAR(255),
  national_id VARCHAR(20),
  occupation VARCHAR(100),
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_class_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  roll_number INTEGER,
  promoted_from_class_id UUID REFERENCES classes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF
-- ============================================================

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  staff_number VARCHAR(50) NOT NULL,
  tsc_number VARCHAR(50),
  designation VARCHAR(100),
  department VARCHAR(100),
  employment_type VARCHAR(50) DEFAULT 'permanent',
  employment_date DATE,
  qualification TEXT,
  specialization TEXT[],
  is_hod BOOLEAN DEFAULT false,
  hod_department VARCHAR(100),
  salary_grade VARCHAR(20),
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  next_of_kin_name VARCHAR(100),
  next_of_kin_phone VARCHAR(20),
  next_of_kin_relationship VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, staff_number)
);

-- ============================================================
-- EXAMS & GRADES
-- ============================================================

CREATE TABLE exam_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  name VARCHAR(100) NOT NULL,
  type exam_type NOT NULL,
  classes UUID[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  max_marks INTEGER DEFAULT 100,
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_series_id UUID NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  max_marks INTEGER DEFAULT 100,
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  hod_approved BOOLEAN DEFAULT false,
  hod_approved_at TIMESTAMPTZ,
  hod_approved_by UUID REFERENCES users(id),
  deputy_approved BOOLEAN DEFAULT false,
  deputy_approved_at TIMESTAMPTZ,
  deputy_approved_by UUID REFERENCES users(id),
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_series_id, class_id, subject_id)
);

CREATE TABLE student_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_paper_id UUID NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  marks DECIMAL(5,2),
  grade VARCHAR(5),
  points DECIMAL(3,1),
  remarks TEXT,
  is_absent BOOLEAN DEFAULT false,
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_paper_id, student_id)
);

CREATE TABLE grading_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  grades JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, is_default)
);

-- ============================================================
-- FEES & FINANCE
-- ============================================================

CREATE TABLE fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  class_id UUID REFERENCES classes(id),
  name VARCHAR(100) NOT NULL,
  applies_to_all_classes BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fee_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  category fee_category NOT NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE student_fee_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID NOT NULL REFERENCES fee_structures(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  total_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_reason TEXT,
  scholarship_amount DECIMAL(10,2) DEFAULT 0,
  scholarship_name TEXT,
  penalty_amount DECIMAL(10,2) DEFAULT 0,
  penalty_reason TEXT,
  net_fees DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, fee_structure_id)
);

CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  fee_structure_id UUID REFERENCES fee_structures(id),
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  receipt_number VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  mpesa_receipt VARCHAR(100),
  mpesa_phone VARCHAR(20),
  mpesa_transaction_id VARCHAR(100),
  bank_reference VARCHAR(100),
  cash_received_by UUID REFERENCES users(id),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES users(id),
  reversal_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, receipt_number)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  subject_id UUID REFERENCES subjects(id),
  period VARCHAR(20),
  marked_by UUID REFERENCES users(id),
  remarks TEXT,
  parent_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMUNICATION
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  type notification_type DEFAULT 'in_app',
  recipient_type VARCHAR(50) DEFAULT 'individual',
  recipients JSONB DEFAULT '[]',
  class_id UUID REFERENCES classes(id),
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sms_cost DECIMAL(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  type notification_type DEFAULT 'in_app',
  category VARCHAR(50),
  entity_type VARCHAR(100),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLUBS & CO-CURRICULAR
-- ============================================================

CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  category VARCHAR(50) DEFAULT 'clubs',
  description TEXT,
  logo_url TEXT,
  meeting_day VARCHAR(20),
  meeting_time TIME,
  meeting_venue VARCHAR(100),
  patron_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE club_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  role club_role DEFAULT 'member',
  joined_date DATE DEFAULT CURRENT_DATE,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, student_id)
);

CREATE TABLE club_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  venue VARCHAR(200),
  result TEXT,
  position VARCHAR(50),
  participants UUID[] DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEAVE-OUT SYSTEM (BOARDING)
-- ============================================================

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  reason TEXT NOT NULL,
  departure_datetime TIMESTAMPTZ NOT NULL,
  expected_return_datetime TIMESTAMPTZ NOT NULL,
  actual_return_datetime TIMESTAMPTZ,
  status leave_status DEFAULT 'pending',
  class_teacher_id UUID REFERENCES users(id),
  class_teacher_approved_at TIMESTAMPTZ,
  class_teacher_remarks TEXT,
  deputy_id UUID REFERENCES users(id),
  deputy_approved_at TIMESTAMPTZ,
  deputy_remarks TEXT,
  principal_id UUID REFERENCES users(id),
  principal_approved_at TIMESTAMPTZ,
  principal_remarks TEXT,
  escorted_by VARCHAR(100),
  escort_phone VARCHAR(20),
  escort_relationship VARCHAR(50),
  is_printed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS & NEWSLETTERS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category document_category DEFAULT 'other',
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(50),
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  is_public BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  cover_image_url TEXT,
  term_id UUID REFERENCES terms_config(id),
  academic_year_id UUID REFERENCES academic_years(id),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  pdf_url TEXT,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CERTIFICATES
-- ============================================================

CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type certificate_type NOT NULL,
  html_template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id UUID REFERENCES certificate_templates(id),
  student_id UUID NOT NULL REFERENCES students(id),
  recipient_name VARCHAR(200) NOT NULL,
  type certificate_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by UUID REFERENCES users(id),
  club_id UUID REFERENCES clubs(id),
  certificate_number VARCHAR(50) UNIQUE,
  pdf_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALUMNI
-- ============================================================

CREATE TABLE alumni (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  user_id UUID REFERENCES users(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  admission_number VARCHAR(50),
  graduation_year INTEGER NOT NULL,
  kcse_grade VARCHAR(5),
  current_occupation VARCHAR(200),
  employer VARCHAR(200),
  university VARCHAR(200),
  course_studied VARCHAR(200),
  bio TEXT,
  photo_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  linkedin_url TEXT,
  achievements TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHOOL RANKINGS
-- ============================================================

CREATE TABLE school_rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  academic_year INTEGER NOT NULL,
  term term NOT NULL,
  county VARCHAR(100),
  national_rank INTEGER,
  county_rank INTEGER,
  sub_county_rank INTEGER,
  mean_grade DECIMAL(4,2),
  mean_points DECIMAL(4,2),
  a_plain INTEGER DEFAULT 0,
  a_minus INTEGER DEFAULT 0,
  b_plus INTEGER DEFAULT 0,
  b_plain INTEGER DEFAULT 0,
  b_minus INTEGER DEFAULT 0,
  c_plus INTEGER DEFAULT 0,
  c_plain INTEGER DEFAULT 0,
  c_minus INTEGER DEFAULT 0,
  d_plus INTEGER DEFAULT 0,
  d_plain INTEGER DEFAULT 0,
  d_minus INTEGER DEFAULT 0,
  e INTEGER DEFAULT 0,
  total_candidates INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, academic_year, term)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Attendance uniqueness (uses expressions, must be an index not a constraint)
CREATE UNIQUE INDEX idx_attendance_unique
  ON attendance_records(student_id, date, COALESCE(subject_id::text, 'daily'), COALESCE(period, 'daily'));

-- Users
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Students
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_class ON students(current_class_id);
CREATE INDEX idx_students_admission ON students(school_id, admission_number);
CREATE INDEX idx_students_name ON students USING GIN(to_tsvector('english', first_name || ' ' || last_name));

-- Marks
CREATE INDEX idx_marks_exam_paper ON student_marks(exam_paper_id);
CREATE INDEX idx_marks_student ON student_marks(student_id);
CREATE INDEX idx_marks_school ON student_marks(school_id);

-- Fee payments
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_school_term ON fee_payments(school_id, term_id);
CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);

-- Attendance
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
CREATE INDEX idx_attendance_class_date ON attendance_records(class_id, date);

-- Audit logs
CREATE INDEX idx_audit_school ON audit_logs(school_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  seq INTEGER;
BEGIN
  IF NEW.receipt_number IS NOT NULL AND NEW.receipt_number <> '' THEN
    RETURN NEW;
  END IF;
  SELECT UPPER(SUBSTRING(school_code, 1, 3)) INTO prefix FROM schools WHERE id = NEW.school_id;
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number, LENGTH(prefix)+2) AS INTEGER)), 0) + 1
    INTO seq FROM fee_payments WHERE school_id = NEW.school_id;
  NEW.receipt_number = prefix || '-' || LPAD(seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fee_payment_receipt BEFORE INSERT ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- Auto-generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.certificate_number = 'CERT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cert_number BEFORE INSERT ON certificates
  FOR EACH ROW EXECUTE FUNCTION generate_certificate_number();

-- Audit log function
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs(entity_type, entity_id, action, old_data)
    VALUES(TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs(entity_type, entity_id, action, old_data, new_data)
    VALUES(TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs(entity_type, entity_id, action, new_data)
    VALUES(TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Default grading scale (CBC/KCSE style) — no school_id so it acts as a global fallback

INSERT INTO grading_scales(id, school_id, name, is_default, grades) VALUES
  ('00000000-0000-0000-0000-000000000001',
   NULL,
   'KCSE Standard', true,
   '[
     {"grade":"A","min":80,"max":100,"points":12,"remarks":"Excellent"},
     {"grade":"A-","min":75,"max":79,"points":11,"remarks":"Very Good"},
     {"grade":"B+","min":70,"max":74,"points":10,"remarks":"Good"},
     {"grade":"B","min":65,"max":69,"points":9,"remarks":"Good"},
     {"grade":"B-","min":60,"max":64,"points":8,"remarks":"Above Average"},
     {"grade":"C+","min":55,"max":59,"points":7,"remarks":"Average"},
     {"grade":"C","min":50,"max":54,"points":6,"remarks":"Average"},
     {"grade":"C-","min":45,"max":49,"points":5,"remarks":"Below Average"},
     {"grade":"D+","min":40,"max":44,"points":4,"remarks":"Below Average"},
     {"grade":"D","min":35,"max":39,"points":3,"remarks":"Poor"},
     {"grade":"D-","min":30,"max":34,"points":2,"remarks":"Very Poor"},
     {"grade":"E","min":0,"max":29,"points":1,"remarks":"Fail"}
   ]'::jsonb
  ) ON CONFLICT DO NOTHING;
