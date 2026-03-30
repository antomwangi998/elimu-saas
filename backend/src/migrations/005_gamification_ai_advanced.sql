-- ============================================================
-- ElimuSaaS — Migration 005
-- Gamification, Assignments, Resource Library, AI Analytics,
-- Homework Tracker, Student Timeline, Advanced Messaging,
-- Exam Questions, Auto-Promotions
-- ============================================================

-- ── GAMIFICATION ─────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE badge_category AS ENUM (
  'academic','attendance','behavior','sports','clubs','leadership','improvement','milestone'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category badge_category DEFAULT 'academic',
  icon VARCHAR(100),
  colour VARCHAR(20) DEFAULT '#d4af37',
  points_reward INTEGER DEFAULT 10,
  criteria JSONB DEFAULT '{}',   -- {type:'attendance_rate',threshold:90}
  is_auto_award BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  reason VARCHAR(200),
  category badge_category DEFAULT 'academic',
  awarded_by UUID REFERENCES users(id),
  academic_year INTEGER NOT NULL DEFAULT 2024,
  term term,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by UUID REFERENCES users(id),
  academic_year INTEGER DEFAULT 2024,
  UNIQUE(student_id, badge_id, academic_year)
);

CREATE TABLE IF NOT EXISTS student_leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  academic_year INTEGER NOT NULL,
  term term,
  total_points INTEGER DEFAULT 0,
  academic_points INTEGER DEFAULT 0,
  attendance_points INTEGER DEFAULT 0,
  behavior_points INTEGER DEFAULT 0,
  activity_points INTEGER DEFAULT 0,
  rank_in_class INTEGER,
  rank_in_school INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, academic_year, term)
);

-- ── ASSIGNMENTS & HOMEWORK ────────────────────────────────────
DO $$ BEGIN CREATE TYPE assignment_status AS ENUM (
  'draft','published','closed','graded'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE submission_status AS ENUM (
  'pending','submitted','late','graded','returned'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_marks INTEGER DEFAULT 100,
  attachment_urls JSONB DEFAULT '[]',
  status assignment_status DEFAULT 'draft',
  allow_late BOOLEAN DEFAULT false,
  is_homework BOOLEAN DEFAULT true,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms_config(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  submitted_at TIMESTAMPTZ,
  content TEXT,
  attachment_urls JSONB DEFAULT '[]',
  marks DECIMAL(5,2),
  grade VARCHAR(5),
  feedback TEXT,
  status submission_status DEFAULT 'pending',
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  is_late BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- ── DIGITAL RESOURCE LIBRARY ──────────────────────────────────
DO $$ BEGIN CREATE TYPE resource_type AS ENUM (
  'note','video','pdf','past_paper','revision','ebook','link','audio','image','other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS learning_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type resource_type DEFAULT 'note',
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  level INTEGER,
  curriculum VARCHAR(10) DEFAULT 'cbc',
  file_url TEXT,
  external_url TEXT,
  thumbnail_url TEXT,
  file_size BIGINT,
  duration_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES users(id),
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- ── SMART EXAM QUESTIONS ──────────────────────────────────────
DO $$ BEGIN CREATE TYPE question_type AS ENUM (
  'mcq','true_false','short_answer','essay','fill_blank','matching'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  topic VARCHAR(200),
  level INTEGER,
  curriculum VARCHAR(10) DEFAULT '844',
  question_type question_type DEFAULT 'mcq',
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]',     -- [{label:'A',text:'...',is_correct:true}]
  correct_answer TEXT,
  explanation TEXT,
  marks INTEGER DEFAULT 1,
  difficulty VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[] DEFAULT '{}',
  is_approved BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  exam_series_id UUID REFERENCES exam_series(id),
  class_id UUID NOT NULL REFERENCES classes(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  pass_marks INTEGER DEFAULT 50,
  question_count INTEGER DEFAULT 40,
  randomize_questions BOOLEAN DEFAULT true,
  randomize_options BOOLEAN DEFAULT true,
  show_result_immediately BOOLEAN DEFAULT false,
  allow_review BOOLEAN DEFAULT false,
  max_attempts INTEGER DEFAULT 1,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published','active','closed','archived')),
  anti_cheat_enabled BOOLEAN DEFAULT true,
  questions UUID[] DEFAULT '{}',   -- selected from question_bank
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  online_exam_id UUID NOT NULL REFERENCES online_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  answers JSONB DEFAULT '{}',      -- {questionId: answer}
  auto_marks DECIMAL(5,2),
  manual_marks DECIMAL(5,2),
  total_marks DECIMAL(5,2),
  grade VARCHAR(5),
  percentage DECIMAL(5,2),
  is_submitted BOOLEAN DEFAULT false,
  tab_switches INTEGER DEFAULT 0,
  suspicious_activity JSONB DEFAULT '[]',
  ip_address VARCHAR(45),
  attempt_number INTEGER DEFAULT 1,
  UNIQUE(online_exam_id, student_id, attempt_number)
);

-- ── AI ANALYTICS TABLES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  prediction_type VARCHAR(50) NOT NULL,  -- 'at_risk','dropout','fee_default','performance_trend'
  risk_score DECIMAL(5,4),               -- 0.0 to 1.0
  prediction_label VARCHAR(50),          -- 'high_risk','medium_risk','low_risk'
  predicted_value JSONB DEFAULT '{}',
  factors JSONB DEFAULT '[]',            -- [{factor, weight, value}]
  recommendation TEXT,
  model_version VARCHAR(20) DEFAULT 'v1',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(student_id, prediction_type, model_version)
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info','warning','critical','success')),
  affected_entity_type VARCHAR(50),
  affected_entity_id UUID,
  data JSONB DEFAULT '{}',
  action_url TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MESSAGE TEMPLATES & SCHEDULING ───────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  subject VARCHAR(255),
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',   -- ['student_name','balance','date']
  channels TEXT[] DEFAULT '{}',    -- ['sms','email','in_app']
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  template_id UUID REFERENCES message_templates(id),
  subject VARCHAR(255),
  body TEXT NOT NULL,
  channels TEXT[] DEFAULT '{}',
  recipient_type VARCHAR(50) DEFAULT 'all_parents',
  recipient_filters JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STUDENT TIMELINE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(30) DEFAULT 'academic',
  icon VARCHAR(50),
  colour VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUTO PROMOTION RECORDS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotion_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id),
  from_level INTEGER,
  to_level INTEGER,
  academic_year INTEGER NOT NULL,
  promotion_type VARCHAR(20) DEFAULT 'auto' CHECK (promotion_type IN ('auto','manual','repeat')),
  reason TEXT,
  promoted_by UUID REFERENCES users(id),
  promoted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MPESA STK REQUESTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mpesa_stk_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  phone VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  account_reference VARCHAR(50),
  checkout_request_id VARCHAR(100) UNIQUE,
  merchant_request_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled','timeout')),
  mpesa_receipt VARCHAR(100),
  result_code VARCHAR(10),
  result_desc TEXT,
  fee_payment_id UUID REFERENCES fee_payments(id),
  initiated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ── SCHOOL BRANDING ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_branding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  primary_colour VARCHAR(20) DEFAULT '#1a365d',
  secondary_colour VARCHAR(20) DEFAULT '#3b82f6',
  accent_colour VARCHAR(20) DEFAULT '#d4af37',
  logo_url TEXT,
  letterhead_logo_url TEXT,
  stamp_url TEXT,
  signature_principal_url TEXT,
  signature_principal_name VARCHAR(100),
  signature_bursar_url TEXT,
  signature_bursar_name VARCHAR(100),
  watermark_text VARCHAR(100),
  watermark_opacity DECIMAL(3,2) DEFAULT 0.08,
  font_family VARCHAR(100) DEFAULT 'Segoe UI',
  document_footer TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_points ON student_points(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_badges ON student_badges(student_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard ON student_leaderboard(school_id, academic_year, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id, due_date);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON assignment_submissions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON learning_resources(school_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions ON ai_predictions(school_id, student_id, prediction_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights ON ai_insights(school_id, severity, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_timeline ON student_timeline(student_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_mpesa_stk ON mpesa_stk_requests(checkout_request_id, status);
CREATE INDEX IF NOT EXISTS idx_question_bank ON question_bank(school_id, subject_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_attempts ON exam_attempts(online_exam_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages ON scheduled_messages(school_id, scheduled_at, status);
