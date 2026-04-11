-- ============================================================
-- Migration 016: Hostel · Transport · Canteen · Health · Assets
--                Visitors · Notice Board · Bursary · Wellness
--                Career · Portfolio · Peer Tutoring · White Label
--                AI Analytics · Multi-Branch · Parent Features
-- ============================================================

-- ── Hostel / Dormitory ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) DEFAULT 'mixed',
  capacity INTEGER DEFAULT 0,
  occupied INTEGER DEFAULT 0,
  warden_id UUID REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  hostel_id UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number VARCHAR(20) NOT NULL,
  capacity INTEGER DEFAULT 4,
  occupied INTEGER DEFAULT 0,
  room_type VARCHAR(20) DEFAULT 'dormitory',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  hostel_id UUID NOT NULL REFERENCES hostels(id),
  room_id UUID NOT NULL REFERENCES hostel_rooms(id),
  bed_number VARCHAR(10),
  term VARCHAR(20),
  year INTEGER DEFAULT 2024,
  check_in_date DATE DEFAULT CURRENT_DATE,
  check_out_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  allocated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, term, year)
);

-- ── Transport / School Bus ────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  registration VARCHAR(20) NOT NULL,
  make VARCHAR(50),
  model VARCHAR(50),
  capacity INTEGER DEFAULT 30,
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  route_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  insurance_expiry DATE,
  inspection_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES transport_vehicles(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  morning_departure TIME,
  afternoon_departure TIME,
  stops JSONB DEFAULT '[]',
  monthly_fee DECIMAL(10,2) DEFAULT 0,
  term_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  route_id UUID NOT NULL REFERENCES transport_routes(id),
  pickup_stop VARCHAR(100),
  term VARCHAR(20),
  year INTEGER DEFAULT 2024,
  fee_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id, term, year)
);

-- ── Canteen / Tuck Shop ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS canteen_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) DEFAULT 'food',
  price DECIMAL(8,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canteen_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  daily_limit DECIMAL(8,2) DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

CREATE TABLE IF NOT EXISTS canteen_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  items JSONB DEFAULT '[]',
  reference VARCHAR(50),
  served_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Health Clinic ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  complaint TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  medication TEXT,
  temperature DECIMAL(4,1),
  blood_pressure VARCHAR(20),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  referred BOOLEAN DEFAULT false,
  referral_hospital VARCHAR(100),
  admitted BOOLEAN DEFAULT false,
  admission_date DATE,
  discharge_date DATE,
  attended_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blood_group VARCHAR(5),
  allergies TEXT,
  chronic_conditions TEXT,
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(20),
  insurance_number VARCHAR(50),
  nhif_number VARCHAR(20),
  nhif_name VARCHAR(100),
  special_needs TEXT,
  doctor_name VARCHAR(100),
  doctor_phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

-- ── Asset Register ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  asset_number VARCHAR(50),
  category VARCHAR(50),
  description TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  current_value DECIMAL(12,2),
  depreciation_rate DECIMAL(5,2) DEFAULT 10,
  location VARCHAR(100),
  condition VARCHAR(20) DEFAULT 'good',
  assigned_to UUID REFERENCES users(id),
  supplier VARCHAR(100),
  warranty_expiry DATE,
  serial_number VARCHAR(100),
  is_insured BOOLEAN DEFAULT false,
  insurance_expiry DATE,
  status VARCHAR(20) DEFAULT 'active',
  disposal_date DATE,
  disposal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Visitor Management ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  id_number VARCHAR(30),
  phone VARCHAR(20),
  organization VARCHAR(100),
  purpose TEXT,
  visiting_who VARCHAR(100),
  visiting_who_id UUID REFERENCES users(id),
  expected_duration VARCHAR(50),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  badge_number VARCHAR(20),
  photo_url TEXT,
  cleared_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Digital Notice Board ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  notice_type VARCHAR(30) DEFAULT 'general',
  priority VARCHAR(10) DEFAULT 'normal',
  target_audience VARCHAR(30) DEFAULT 'all',
  target_classes UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  publish_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  attachment_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notice_reads (
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notice_id, user_id)
);

-- ── Bursary / Scholarship ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS bursary_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  funder VARCHAR(100),
  funder_type VARCHAR(30) DEFAULT 'government',
  total_amount DECIMAL(12,2) DEFAULT 0,
  amount_per_student DECIMAL(10,2),
  academic_year VARCHAR(10),
  term VARCHAR(20),
  max_students INTEGER,
  eligibility_criteria TEXT,
  application_deadline DATE,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bursary_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  scheme_id UUID NOT NULL REFERENCES bursary_schemes(id),
  student_id UUID NOT NULL REFERENCES users(id),
  amount_requested DECIMAL(10,2),
  amount_awarded DECIMAL(10,2),
  justification TEXT,
  household_income DECIMAL(12,2),
  dependants INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  award_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Student Wellness / Mental Health ─────────────────────────
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  mood_label VARCHAR(20),
  concerns TEXT,
  needs_support BOOLEAN DEFAULT false,
  counselor_notified BOOLEAN DEFAULT false,
  counselor_id UUID REFERENCES users(id),
  session_notes TEXT,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Career Guidance ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interests TEXT[] DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  career_choices TEXT[] DEFAULT '{}',
  dream_career VARCHAR(100),
  dream_university VARCHAR(100),
  dream_course VARCHAR(100),
  learning_style VARCHAR(30),
  counselor_notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

CREATE TABLE IF NOT EXISTS career_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  resource_type VARCHAR(30) DEFAULT 'article',
  url TEXT,
  careers TEXT[] DEFAULT '{}',
  subjects TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Student Digital Portfolio ─────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  item_type VARCHAR(30) DEFAULT 'project',
  subject VARCHAR(100),
  file_url TEXT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  teacher_feedback TEXT,
  teacher_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Peer Tutoring ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tutoring_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES users(id),
  subjects TEXT[] NOT NULL DEFAULT '{}',
  availability TEXT,
  experience TEXT,
  min_grade VARCHAR(5),
  rate_per_hour DECIMAL(8,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  rating DECIMAL(3,2) DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES tutoring_offers(id),
  tutor_id UUID NOT NULL REFERENCES users(id),
  student_id UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(100),
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'requested',
  tutor_notes TEXT,
  student_feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Parent Polls / Voting ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  poll_type VARCHAR(30) DEFAULT 'opinion',
  options JSONB NOT NULL DEFAULT '[]',
  target_roles TEXT[] DEFAULT ARRAY['parent'],
  is_anonymous BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES school_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  option_index INTEGER NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- ── Multi-Branch Schools ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_school_id, branch_school_id)
);

-- ── White Label / Custom Domains ─────────────────────────────
CREATE TABLE IF NOT EXISTS school_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  custom_domain VARCHAR(100),
  custom_subdomain VARCHAR(50),
  primary_color VARCHAR(7) DEFAULT '#2b7fff',
  secondary_color VARCHAR(7) DEFAULT '#1a1a2e',
  accent_color VARCHAR(7) DEFAULT '#0ecb81',
  logo_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,
  footer_text TEXT,
  custom_css TEXT,
  email_header_html TEXT,
  sms_sender_id VARCHAR(11) DEFAULT 'ELIMU',
  whatsapp_name VARCHAR(30),
  is_white_labeled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Usage Analytics ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  page VARCHAR(100),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI Predictions Store ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  prediction_type VARCHAR(50) NOT NULL,
  predicted_value TEXT,
  confidence_score DECIMAL(5,2),
  supporting_data JSONB DEFAULT '{}',
  is_actioned BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- ── Receipt Numbers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_sequences (
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  prefix VARCHAR(10) DEFAULT 'RCT',
  last_number INTEGER DEFAULT 0,
  PRIMARY KEY(school_id)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_student ON hostel_allocations(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_transport_sub_student ON transport_subscriptions(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_canteen_txn_student ON canteen_transactions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_student ON health_records(student_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_assets_school ON assets(school_id, category);
CREATE INDEX IF NOT EXISTS idx_visitors_school ON visitors(school_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_notices_school ON notices(school_id, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_wellness_student ON wellness_checkins(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_student ON portfolio_items(student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_usage_school ON usage_events(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_student ON ai_predictions(student_id, prediction_type);
