-- ============================================================
-- Migration 010: Payroll · Lab · FCM · WhatsApp · Alumni
--                Behaviour · Discipline · Admissions · Library
--                Certificates · Leave-Out · Parent Portal
-- ============================================================

-- ── FCM Push Notification Tokens ─────────────────────────────
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type VARCHAR(20) DEFAULT 'web',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  target_type VARCHAR(30) DEFAULT 'all',
  target_ids UUID[] DEFAULT '{}',
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WhatsApp Config & Messages ────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  provider VARCHAR(30) DEFAULT 'twilio',
  account_sid VARCHAR(255),
  auth_token TEXT,
  whatsapp_number VARCHAR(30),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(30) NOT NULL,
  recipient_name VARCHAR(255),
  recipient_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  media_url TEXT,
  direction VARCHAR(10) DEFAULT 'outbound',
  status VARCHAR(20) DEFAULT 'pending',
  provider_message_id VARCHAR(255),
  error_message TEXT,
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Payroll ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  house_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payroll_grade_id UUID REFERENCES payroll_grades(id),
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  house_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  hardship_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  nhif_deduction DECIMAL(12,2) DEFAULT 0,
  nssf_deduction DECIMAL(12,2) DEFAULT 0,
  paye_deduction DECIMAL(12,2) DEFAULT 0,
  loan_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  bank_branch VARCHAR(100),
  mpesa_number VARCHAR(20),
  payment_method VARCHAR(20) DEFAULT 'bank',
  tsc_number VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, staff_id)
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_gross DECIMAL(14,2) DEFAULT 0,
  total_deductions DECIMAL(14,2) DEFAULT 0,
  total_net DECIMAL(14,2) DEFAULT 0,
  staff_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, month, year)
);

CREATE TABLE IF NOT EXISTS payroll_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id),
  basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  house_allowance DECIMAL(12,2) DEFAULT 0,
  transport_allowance DECIMAL(12,2) DEFAULT 0,
  medical_allowance DECIMAL(12,2) DEFAULT 0,
  hardship_allowance DECIMAL(12,2) DEFAULT 0,
  other_allowances DECIMAL(12,2) DEFAULT 0,
  gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  nhif_deduction DECIMAL(12,2) DEFAULT 0,
  nssf_deduction DECIMAL(12,2) DEFAULT 0,
  paye_deduction DECIMAL(12,2) DEFAULT 0,
  loan_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_ref VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lab Inventory ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id UUID REFERENCES lab_categories(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  item_type VARCHAR(30) DEFAULT 'equipment',
  quantity INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'pieces',
  condition VARCHAR(20) DEFAULT 'good',
  location VARCHAR(100),
  supplier VARCHAR(255),
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  last_serviced DATE,
  next_service_due DATE,
  is_hazardous BOOLEAN DEFAULT false,
  safety_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES lab_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL,
  issued_to VARCHAR(255),
  issued_to_id UUID REFERENCES users(id),
  class_id UUID,
  purpose TEXT,
  experiment_name VARCHAR(255),
  return_date DATE,
  returned_quantity INTEGER DEFAULT 0,
  condition_after VARCHAR(20),
  notes TEXT,
  handled_by UUID REFERENCES users(id),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lab_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject_id UUID,
  class_id UUID,
  description TEXT,
  objectives TEXT,
  procedure TEXT,
  required_items JSONB DEFAULT '[]',
  scheduled_date DATE,
  status VARCHAR(20) DEFAULT 'planned',
  conducted_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Library Full Circulation ─────────────────────────────────
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS isbn VARCHAR(20);
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS edition VARCHAR(20);
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS total_copies INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS available_copies INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS lost_copies INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS damaged_copies INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS location_shelf VARCHAR(50);
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE IF EXISTS library_books ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE TABLE IF NOT EXISTS library_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_type VARCHAR(20) DEFAULT 'student',
  membership_number VARCHAR(50),
  max_books INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, user_id)
);

CREATE TABLE IF NOT EXISTS library_borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id),
  borrower_id UUID NOT NULL REFERENCES users(id),
  issued_by UUID REFERENCES users(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  returned_by UUID REFERENCES users(id),
  condition_on_return VARCHAR(20),
  fine_amount DECIMAL(10,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  fine_paid_at TIMESTAMPTZ,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'borrowed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id),
  user_id UUID NOT NULL REFERENCES users(id),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  notified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  borrowing_id UUID NOT NULL REFERENCES library_borrowings(id),
  student_id UUID NOT NULL REFERENCES users(id),
  fine_type VARCHAR(30) DEFAULT 'overdue',
  amount DECIMAL(10,2) NOT NULL,
  days_overdue INTEGER DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  waived BOOLEAN DEFAULT false,
  waived_by UUID REFERENCES users(id),
  waived_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admissions Full Pipeline ──────────────────────────────────
CREATE TABLE IF NOT EXISTS admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_name VARCHAR(200) NOT NULL,
  gender VARCHAR(10),
  date_of_birth DATE,
  parent_name VARCHAR(200),
  parent_phone VARCHAR(30),
  parent_email VARCHAR(255),
  applying_for_class_id UUID REFERENCES classes(id),
  academic_year INTEGER,
  stage VARCHAR(30) DEFAULT 'enquiry',
  interview_date TIMESTAMPTZ,
  interview_notes TEXT,
  interviewer_id UUID REFERENCES users(id),
  offer_date DATE,
  offer_expiry DATE,
  offer_accepted BOOLEAN,
  offer_accepted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  source VARCHAR(50),
  priority VARCHAR(10) DEFAULT 'normal',
  assigned_to UUID REFERENCES users(id),
  documents_submitted JSONB DEFAULT '[]',
  follow_up_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT,
  old_stage VARCHAR(30),
  new_stage VARCHAR(30),
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admission_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255),
  file_url TEXT,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Behaviour & Discipline Full ───────────────────────────────
-- student_behaviour already created in 009; add missing columns
ALTER TABLE student_behaviour
  ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT 2024,
  ADD COLUMN IF NOT EXISTS conduct VARCHAR(30),
  ADD COLUMN IF NOT EXISTS neatness VARCHAR(30),
  ADD COLUMN IF NOT EXISTS punctuality VARCHAR(30),
  ADD COLUMN IF NOT EXISTS diligence VARCHAR(30),
  ADD COLUMN IF NOT EXISTS leadership VARCHAR(30),
  ADD COLUMN IF NOT EXISTS participation VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cooperation VARCHAR(30),
  ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_behaviour_unique
  ON student_behaviour(school_id, student_id, term, year);

-- discipline_incidents already created in 004; add missing columns
ALTER TABLE discipline_incidents
  ADD COLUMN IF NOT EXISTS incident_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS action_taken VARCHAR(50),
  ADD COLUMN IF NOT EXISTS suspension_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspension_start DATE,
  ADD COLUMN IF NOT EXISTS suspension_end DATE,
  ADD COLUMN IF NOT EXISTS parent_response TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES users(id);



CREATE TABLE IF NOT EXISTS discipline_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES discipline_incidents(id),
  student_id UUID NOT NULL REFERENCES users(id),
  letter_type VARCHAR(50) NOT NULL,
  content_html TEXT,
  issued_date DATE DEFAULT CURRENT_DATE,
  issued_by UUID REFERENCES users(id),
  acknowledged_by_parent BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Certificates Full ────────────────────────────────────────
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS certificate_number VARCHAR(100);
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS html_content TEXT;
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS template_id VARCHAR(50) DEFAULT 'standard';
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS issued_for VARCHAR(100);
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS position VARCHAR(50);
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS signed_by VARCHAR(255);
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS countersigned_by VARCHAR(255);
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
ALTER TABLE IF EXISTS certificates ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- ── Leave-Out Full Workflow ───────────────────────────────────
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS departure_time TIME;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS return_time TIME;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS destination VARCHAR(255);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS escort_name VARCHAR(255);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS escort_phone VARCHAR(30);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS escort_relationship VARCHAR(50);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS class_teacher_approved BOOLEAN;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS class_teacher_approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS dean_approved BOOLEAN;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS dean_id UUID REFERENCES users(id);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS dean_approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS gate_cleared BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS gate_cleared_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS gate_cleared_by UUID REFERENCES users(id);
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS actual_return TIMESTAMPTZ;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS parent_consent_sms_sent BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS leave_requests ADD COLUMN IF NOT EXISTS parent_consent_received BOOLEAN DEFAULT false;

-- ── Parent Portal Full ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'parent',
  is_primary BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  emergency_contact BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS parent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'mpesa',
  reference VARCHAR(100),
  mpesa_receipt VARCHAR(50),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_meeting_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  teacher_id UUID REFERENCES users(id),
  subject VARCHAR(255),
  message TEXT,
  preferred_date DATE,
  preferred_time TIME,
  status VARCHAR(20) DEFAULT 'pending',
  response TEXT,
  meeting_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Alumni Full ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  admission_number VARCHAR(50),
  year_completed INTEGER NOT NULL,
  kcse_grade VARCHAR(5),
  kcse_points DECIMAL(5,2),
  university VARCHAR(255),
  course VARCHAR(255),
  current_employer VARCHAR(255),
  current_position VARCHAR(255),
  industry VARCHAR(100),
  location VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(255),
  linkedin_url TEXT,
  bio TEXT,
  profile_photo TEXT,
  achievements TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  privacy_level VARCHAR(20) DEFAULT 'school',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumni_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location VARCHAR(255),
  event_type VARCHAR(50) DEFAULT 'reunion',
  max_capacity INTEGER,
  rsvp_deadline DATE,
  organizer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alumni_event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES alumni_events(id) ON DELETE CASCADE,
  alumni_id UUID NOT NULL REFERENCES alumni_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'attending',
  dietary_preference VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, alumni_id)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_school ON whatsapp_messages(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_run ON payroll_slips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_staff ON payroll_slips(staff_id);
CREATE INDEX IF NOT EXISTS idx_lab_items_school ON lab_items(school_id);
CREATE INDEX IF NOT EXISTS idx_lab_transactions_item ON lab_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_borrower ON library_borrowings(borrower_id, status);
CREATE INDEX IF NOT EXISTS idx_library_borrowings_due ON library_borrowings(due_date) WHERE return_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_discipline_incidents_student ON discipline_incidents(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_student_behaviour_student ON student_behaviour(student_id, term, year);
CREATE INDEX IF NOT EXISTS idx_alumni_profiles_school ON alumni_profiles(school_id, year_completed);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_student_links(parent_id, school_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_student_links(student_id, school_id);
