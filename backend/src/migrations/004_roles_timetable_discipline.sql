-- ============================================================
-- ElimuSaaS — Migration 004
-- New roles, timetable, discipline, KNEC portal,
-- club subsystems, admissions, ID cards
-- ============================================================

-- ── NEW ROLES ─────────────────────────────────────────────────
-- Add missing roles to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dean_of_studies';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admission_teacher';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'games_teacher';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'patron';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'class_teacher';

-- ── TSC LOGIN SUPPORT ─────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tsc_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tsc ON users(tsc_number)
  WHERE tsc_number IS NOT NULL;

-- ── TIMETABLE ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS timetable_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(school_id, name)
);

CREATE TABLE IF NOT EXISTS timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  period_id UUID NOT NULL REFERENCES timetable_periods(id),
  day day_of_week NOT NULL,
  room VARCHAR(50),
  is_free_period BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A class cannot have two subjects in the same slot
  UNIQUE(timetable_id, class_id, day, period_id),
  -- A teacher cannot be in two classes at the same time
  UNIQUE(timetable_id, teacher_id, day, period_id)
);

-- Teacher lesson attendance
CREATE TABLE IF NOT EXISTS lesson_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  lesson_date DATE NOT NULL,
  was_present BOOLEAN DEFAULT false,
  arrival_time TIME,
  departure_time TIME,
  topic_covered TEXT,
  cover_teacher_id UUID REFERENCES users(id),
  marked_by UUID REFERENCES users(id),  -- deputy principal
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id, lesson_date)
);

-- ── DISCIPLINE ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('minor','moderate','serious','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE disciplinary_action AS ENUM (
    'verbal_warning','written_warning','detention','community_service',
    'parent_meeting','suspension','expulsion','counselling_referral','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS discipline_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES users(id),
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_time TIME,
  location VARCHAR(200),
  severity incident_severity DEFAULT 'minor',
  category VARCHAR(100),
  description TEXT NOT NULL,
  witnesses TEXT,
  student_statement TEXT,
  action_taken disciplinary_action,
  action_details TEXT,
  parent_notified BOOLEAN DEFAULT false,
  parent_notified_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  attachment_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suspension_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES discipline_incidents(id),
  type VARCHAR(20) NOT NULL DEFAULT 'suspension' CHECK (type IN ('suspension','expulsion')),
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  days_count INTEGER,
  issued_by UUID NOT NULL REFERENCES users(id),
  countersigned_by UUID REFERENCES users(id),
  letter_url TEXT,
  parent_signed BOOLEAN DEFAULT false,
  readmission_notes TEXT,
  readmitted_at TIMESTAMPTZ,
  readmitted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLUB / SOCIETY / GAMES SUBSYSTEM ─────────────────────────
ALTER TABLE clubs
  ADD COLUMN IF NOT EXISTS constitution_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_fee DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS termly_subscription DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vice_patron_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS club_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term term NOT NULL,
  amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  received_by UUID REFERENCES users(id),
  receipt_number VARCHAR(50),
  notes TEXT,
  UNIQUE(club_id, student_id, academic_year_id, term)
);

CREATE TABLE IF NOT EXISTS club_meeting_minutes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_time TIME,
  venue VARCHAR(200),
  chairperson_id UUID REFERENCES students(id),
  secretary_id UUID REFERENCES students(id),
  attendees UUID[] DEFAULT '{}',
  attendance_count INTEGER DEFAULT 0,
  agenda JSONB DEFAULT '[]',
  minutes_text TEXT,
  action_items JSONB DEFAULT '[]',
  next_meeting_date DATE,
  recorded_by UUID REFERENCES users(id),
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income','expense')),
  category VARCHAR(100),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2),
  recorded_by UUID REFERENCES users(id),
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ADMISSIONS MODULE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knec_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_type exam_type NOT NULL,
  academic_year INTEGER NOT NULL,
  knec_index_number VARCHAR(50),
  centre_number VARCHAR(20),
  subjects JSONB DEFAULT '[]',  -- [{subjectCode, knecCode, paperCode}]
  registration_status VARCHAR(20) DEFAULT 'pending'
    CHECK (registration_status IN ('pending','submitted','confirmed','rejected')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, exam_type, academic_year)
);

CREATE TABLE IF NOT EXISTS student_id_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  card_number VARCHAR(50) UNIQUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  printed BOOLEAN DEFAULT false,
  printed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  UNIQUE(student_id, academic_year)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher ON timetable_slots(timetable_id, teacher_id, day);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_class ON timetable_slots(timetable_id, class_id, day);
CREATE INDEX IF NOT EXISTS idx_lesson_attendance_teacher ON lesson_attendance(teacher_id, lesson_date);
CREATE INDEX IF NOT EXISTS idx_discipline_student ON discipline_incidents(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_knec_reg_student ON knec_registrations(student_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_student_id_cards ON student_id_cards(student_id, academic_year);
