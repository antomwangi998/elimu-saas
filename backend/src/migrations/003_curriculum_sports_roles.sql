-- ============================================================
-- ElimuSaaS — Migration 003
-- CBC + 8-4-4 Dual Curriculum, Sports/Games, Auto-Comments
-- ============================================================

-- ── CURRICULUM TYPES ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE curriculum_type AS ENUM ('cbc', '844');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cbc_performance_level AS ENUM ('EE','ME','AE','BE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sports_category AS ENUM ('football','athletics','basketball','volleyball','rugby','netball','swimming','tennis','badminton','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE competition_level AS ENUM ('inter_class','inter_house','inter_school','zonal','county','national');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── EXTEND CLASSES TABLE ──────────────────────────────────────
ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS curriculum_type curriculum_type
    GENERATED ALWAYS AS (CASE WHEN level <= 2 THEN 'cbc'::curriculum_type ELSE '844'::curriculum_type END) STORED,
  ADD COLUMN IF NOT EXISTS form_label VARCHAR(20)
    GENERATED ALWAYS AS ('Form ' || level::text) STORED;

-- ── EXTEND SUBJECTS TABLE ─────────────────────────────────────
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS curriculum curriculum_type DEFAULT 'cbc',
  ADD COLUMN IF NOT EXISTS is_cbc BOOLEAN GENERATED ALWAYS AS (curriculum = 'cbc') STORED,
  ADD COLUMN IF NOT EXISTS is_844 BOOLEAN GENERATED ALWAYS AS (curriculum = '844') STORED,
  ADD COLUMN IF NOT EXISTS max_marks INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS min_marks_grade INTEGER DEFAULT 0;

-- ── CBC STRANDS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20),
  weight DECIMAL(4,2) DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, code)
);

CREATE TABLE IF NOT EXISTS cbc_sub_strands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  strand_id UUID NOT NULL REFERENCES cbc_strands(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(20),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CBC MARKS (Performance Levels) ───────────────────────────
CREATE TABLE IF NOT EXISTS cbc_marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sub_strand_id UUID NOT NULL REFERENCES cbc_sub_strands(id) ON DELETE CASCADE,
  exam_series_id UUID NOT NULL REFERENCES exam_series(id) ON DELETE CASCADE,
  performance_level cbc_performance_level NOT NULL DEFAULT 'ME',
  level_score SMALLINT GENERATED ALWAYS AS (
    CASE performance_level WHEN 'EE' THEN 4 WHEN 'ME' THEN 3 WHEN 'AE' THEN 2 WHEN 'BE' THEN 1 END
  ) STORED,
  teacher_remarks TEXT,
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, sub_strand_id, exam_series_id)
);

-- ── KNEC GRADE SCALE (8-4-4) — seeded per school ─────────────
CREATE TABLE IF NOT EXISTS knec_grade_scale (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade VARCHAR(5) NOT NULL,
  min_marks DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  points DECIMAL(4,1) NOT NULL,
  remarks VARCHAR(100),
  UNIQUE(school_id, grade)
);

-- ── AUTO COMMENT TEMPLATES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS auto_comment_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  curriculum curriculum_type NOT NULL DEFAULT '844',
  min_score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  grade_label VARCHAR(10),
  comment TEXT NOT NULL,
  comment_type VARCHAR(30) DEFAULT 'performance',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CLASS REGISTER ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_register (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  period VARCHAR(20) DEFAULT 'morning',
  marked_by UUID NOT NULL REFERENCES users(id),
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  remarks TEXT,
  is_finalized BOOLEAN DEFAULT false,
  UNIQUE(class_id, date, period)
);

-- Register entries link to attendance_records
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS register_id UUID REFERENCES class_register(id),
  ADD COLUMN IF NOT EXISTS session VARCHAR(20) DEFAULT 'morning';

-- ── SPORTS / GAMES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sports_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sport sports_category NOT NULL,
  category VARCHAR(20) DEFAULT 'open' CHECK(category IN ('u14','u16','u18','open','staff')),
  gender VARCHAR(10) DEFAULT 'mixed' CHECK(gender IN ('male','female','mixed')),
  coach_id UUID REFERENCES users(id),
  captain_id UUID REFERENCES students(id),
  is_active BOOLEAN DEFAULT true,
  achievements TEXT,
  kit_colours VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_sports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  position VARCHAR(50),
  jersey_number INTEGER,
  joined_date DATE DEFAULT CURRENT_DATE,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, team_id)
);

CREATE TABLE IF NOT EXISTS sports_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  team_id UUID REFERENCES sports_teams(id),
  name VARCHAR(200) NOT NULL,
  sport sports_category,
  competition_level competition_level DEFAULT 'inter_school',
  opponent_name VARCHAR(150),
  opponent_school VARCHAR(200),
  event_date DATE NOT NULL,
  venue VARCHAR(200),
  is_home BOOLEAN DEFAULT true,
  our_score VARCHAR(30),
  opponent_score VARCHAR(30),
  result VARCHAR(20) CHECK(result IN ('win','loss','draw','pending','cancelled')),
  position_achieved VARCHAR(50),
  players UUID[] DEFAULT '{}',
  scorers JSONB DEFAULT '[]',
  mvp_student_id UUID REFERENCES students(id),
  notes TEXT,
  photos JSONB DEFAULT '[]',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SPORTS DAY / INTER-HOUSE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS school_houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  colour VARCHAR(50),
  patron_id UUID REFERENCES users(id),
  captain_id UUID REFERENCES students(id),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS house_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES school_houses(id),
  event_name VARCHAR(200) NOT NULL,
  event_date DATE NOT NULL,
  category VARCHAR(50),
  position INTEGER,
  points_awarded INTEGER DEFAULT 0,
  participant_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STUDENT SUBJECT SELECTION (Form 3+) ──────────────────────
CREATE TABLE IF NOT EXISTS student_subject_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  is_compulsory BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id, academic_year_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cbc_marks_student ON cbc_marks(student_id, exam_series_id);
CREATE INDEX IF NOT EXISTS idx_cbc_marks_series ON cbc_marks(exam_series_id);
CREATE INDEX IF NOT EXISTS idx_class_register_class ON class_register(class_id, date);
CREATE INDEX IF NOT EXISTS idx_sports_events_school ON sports_events(school_id, event_date);
CREATE INDEX IF NOT EXISTS idx_student_sports ON student_sports(student_id);
CREATE INDEX IF NOT EXISTS idx_knec_scale ON knec_grade_scale(school_id, min_marks, max_marks);

-- ── SEED: KNEC GRADE SCALE (global, copied per school on creation) ─
-- This is inserted per school via application logic using seedKnecScale()

-- ── SEED: DEFAULT AUTO COMMENTS (global template) ─────────────
-- Applied per school via application logic
