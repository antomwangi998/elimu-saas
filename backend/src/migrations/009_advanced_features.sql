-- ============================================================
-- Migration 009: Advanced Features
-- CBC Primary Support, Storekeeper, Templates, Syllabus
-- Advanced Roles, Report Card Templates, Broadsheets
-- ============================================================

-- ── School Type & CBC Config ──────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_category VARCHAR(20) DEFAULT 'secondary'
  CHECK (school_category IN ('primary','secondary','both'));
ALTER TABLE schools ADD COLUMN IF NOT EXISTS curriculum_type VARCHAR(20) DEFAULT '844'
  CHECK (curriculum_type IN ('cbc','844','both'));
ALTER TABLE schools ADD COLUMN IF NOT EXISTS supports_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS supports_secondary BOOLEAN DEFAULT TRUE;

-- ── Advanced Staff Roles Update ───────────────────────────────
DO $$
BEGIN
  -- Add new role values if constraint exists
  BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
      'super_admin','school_admin','principal','deputy_principal',
      'hod','bursar','teacher','librarian','parent','student',
      'dean_of_studies','admission_teacher','games_teacher','patron',
      'class_teacher','storekeeper','secretary','enquirer',
      'accounts_clerk','counselor','lab_technician','it_admin'
    ));
  EXCEPTION WHEN others THEN
    NULL;
  END;
END $$;

-- ── Role Permissions Table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL,
  module VARCHAR(60) NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  can_export BOOLEAN DEFAULT FALSE,
  custom_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_perms_unique ON role_permissions(school_id, role, module);

-- ── CBC Learning Areas (Primary) ──────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_learning_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 9),
  category VARCHAR(50), -- language, science, social, creative, religious
  description TEXT,
  is_compulsory BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CBC Strands ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_area_id UUID REFERENCES cbc_learning_areas(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30),
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ── CBC Sub-Strands ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_sub_strands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_id UUID REFERENCES cbc_strands(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- ── CBC Performance Levels ────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_performance_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  level_code VARCHAR(5) NOT NULL,  -- EE, ME, AE, BE
  level_name VARCHAR(50) NOT NULL, -- Exceeding Expectations, etc.
  description TEXT,
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  points INTEGER,
  sort_order INTEGER DEFAULT 0
);

-- ── CBC Assessments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  learning_area_id UUID REFERENCES cbc_learning_areas(id),
  academic_year_id UUID,
  term VARCHAR(20),
  assessment_type VARCHAR(30) DEFAULT 'summative', -- formative, summative
  name VARCHAR(150) NOT NULL,
  max_score DECIMAL(6,2) DEFAULT 100,
  assessment_date DATE,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CBC Student Scores ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES cbc_assessments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  strand_id UUID REFERENCES cbc_strands(id),
  sub_strand_id UUID REFERENCES cbc_sub_strands(id),
  score DECIMAL(6,2),
  performance_level VARCHAR(5), -- EE, ME, AE, BE
  teacher_remarks TEXT,
  is_absent BOOLEAN DEFAULT FALSE,
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, student_id, strand_id)
);

-- ── CBC Competency Tracking ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cbc_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  learning_area_id UUID REFERENCES cbc_learning_areas(id),
  strand_id UUID REFERENCES cbc_strands(id),
  academic_year_id UUID,
  term VARCHAR(20),
  mastery_level VARCHAR(5), -- EE, ME, AE, BE
  score DECIMAL(6,2),
  teacher_id UUID REFERENCES users(id),
  notes TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Storekeeper / Inventory ───────────────────────────────────
CREATE TABLE IF NOT EXISTS store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES store_categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  category_id UUID REFERENCES store_categories(id),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  unit VARCHAR(30) DEFAULT 'pieces', -- pieces, reams, litres, kg, boxes
  unit_cost DECIMAL(12,2) DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  current_stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  location VARCHAR(100), -- shelf/room
  supplier VARCHAR(150),
  last_restocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  item_id UUID REFERENCES store_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('receive','issue','return','adjust','write_off','transfer')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(12,2),
  total_value DECIMAL(12,2),
  reference_number VARCHAR(100),
  issued_to VARCHAR(200), -- teacher name, department, student
  issued_by UUID REFERENCES users(id),
  received_from VARCHAR(200),
  purpose TEXT,
  notes TEXT,
  balance_after INTEGER,
  approved_by UUID REFERENCES users(id),
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  po_number VARCHAR(50) UNIQUE,
  supplier VARCHAR(200),
  supplier_contact VARCHAR(100),
  items JSONB DEFAULT '[]', -- [{item_id, item_name, qty, unit_cost}]
  total_amount DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','ordered','received','cancelled')),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  order_date DATE,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Document Templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL, -- letter, report, announcement, certificate, circular, notice
  category VARCHAR(50), -- academic, finance, discipline, general, parent
  content_html TEXT NOT NULL,
  placeholders JSONB DEFAULT '[]', -- [{key, label, type}]
  is_system BOOLEAN DEFAULT FALSE, -- system templates can't be deleted
  is_active BOOLEAN DEFAULT TRUE,
  preview_url TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  template_id UUID REFERENCES document_templates(id),
  title VARCHAR(200) NOT NULL,
  content_html TEXT NOT NULL, -- rendered with actual data
  recipient_type VARCHAR(30),
  recipient_id UUID,
  recipient_name VARCHAR(200),
  variables JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft',
  generated_by UUID REFERENCES users(id),
  printed_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Syllabus & Scheme of Work ─────────────────────────────────
CREATE TABLE IF NOT EXISTS schemes_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id),
  academic_year_id UUID,
  term VARCHAR(20),
  week_number INTEGER,
  lesson_number INTEGER,
  topic VARCHAR(300) NOT NULL,
  sub_topic TEXT,
  objectives TEXT,
  teaching_activities TEXT,
  learning_materials TEXT,
  references_text TEXT,
  assessment_method TEXT,
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','skipped')),
  completion_date DATE,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS syllabus_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES users(id),
  academic_year_id UUID,
  term VARCHAR(20),
  total_topics INTEGER DEFAULT 0,
  completed_topics INTEGER DEFAULT 0,
  coverage_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_topics > 0 THEN (completed_topics::DECIMAL / total_topics * 100) ELSE 0 END
  ) STORED,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Advanced Report Card Templates ───────────────────────────
CREATE TABLE IF NOT EXISTS report_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  curriculum_type VARCHAR(10) DEFAULT '844' CHECK (curriculum_type IN ('cbc','844')),
  show_position BOOLEAN DEFAULT TRUE,
  show_stream_position BOOLEAN DEFAULT TRUE,
  show_trend_graph BOOLEAN DEFAULT FALSE,
  show_attendance BOOLEAN DEFAULT TRUE,
  show_behaviour BOOLEAN DEFAULT TRUE,
  show_co_curricular BOOLEAN DEFAULT TRUE,
  show_principal_comment BOOLEAN DEFAULT TRUE,
  show_class_teacher_comment BOOLEAN DEFAULT TRUE,
  show_next_term_opening BOOLEAN DEFAULT TRUE,
  header_config JSONB DEFAULT '{}',
  grading_config JSONB DEFAULT '{}',
  footer_config JSONB DEFAULT '{}',
  custom_css TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Student Behaviour/Discipline ──────────────────────────────
CREATE TABLE IF NOT EXISTS student_behaviour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  academic_year_id UUID,
  term VARCHAR(20),
  category VARCHAR(50) DEFAULT 'conduct', -- conduct, neatness, punctuality, diligence, leadership
  rating VARCHAR(20), -- excellent, good, satisfactory, needs_improvement
  score INTEGER, -- 1-5
  teacher_remarks TEXT,
  assessed_by UUID REFERENCES users(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Fee Leave-Out Sheets ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_leave_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  academic_year_id UUID,
  term VARCHAR(20),
  total_fees DECIMAL(12,2),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2),
  clearance_status VARCHAR(20) DEFAULT 'pending' CHECK (clearance_status IN ('cleared','pending','partial')),
  bursar_comments TEXT,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until DATE
);

-- ── Master Broadsheet Cache ───────────────────────────────────
CREATE TABLE IF NOT EXISTS broadsheet_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  exam_series_id UUID,
  class_ids UUID[] DEFAULT '{}',
  stream_type VARCHAR(20) DEFAULT 'class', -- class, stream, master
  data JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_store_items_school ON store_items(school_id, is_active);
CREATE INDEX IF NOT EXISTS idx_store_txn_school ON store_transactions(school_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_store_txn_item ON store_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_cbc_scores ON cbc_student_scores(assessment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_schemes_class_subj ON schemes_of_work(class_id, subject_id, term);
CREATE INDEX IF NOT EXISTS idx_templates_school ON document_templates(school_id, type);
CREATE INDEX IF NOT EXISTS idx_behaviour_student ON student_behaviour(student_id, academic_year_id, term);

-- ── Default CBC Performance Levels ───────────────────────────
-- Will be seeded per school via API

-- ── Default Role Permissions ──────────────────────────────────
-- Inserted per school when school is created (via API)

-- ── Seed CBC Performance Levels function ─────────────────────
CREATE OR REPLACE FUNCTION seed_cbc_levels(p_school_id UUID) RETURNS void AS $$
BEGIN
  INSERT INTO cbc_performance_levels (school_id, level_code, level_name, description, min_score, max_score, points, sort_order)
  VALUES
    (p_school_id, 'EE', 'Exceeding Expectations', 'Student performs beyond the expected level', 80, 100, 4, 1),
    (p_school_id, 'ME', 'Meeting Expectations', 'Student meets the expected performance level', 60, 79, 3, 2),
    (p_school_id, 'AE', 'Approaching Expectations', 'Student is approaching the expected level', 40, 59, 2, 3),
    (p_school_id, 'BE', 'Below Expectations', 'Student performs below the expected level', 0, 39, 1, 4)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ── Seed Default Document Templates ──────────────────────────
CREATE OR REPLACE FUNCTION seed_document_templates(p_school_id UUID) RETURNS void AS $$
BEGIN
  INSERT INTO document_templates (school_id, name, type, category, is_system, content_html, placeholders)
  VALUES
  (p_school_id, 'Fee Demand Note', 'letter', 'finance', TRUE,
   '<div style="font-family:serif;padding:40px;max-width:700px;margin:auto"><div style="text-align:center;margin-bottom:20px"><h2>{{school_name}}</h2><p>{{school_address}}</p><p>Tel: {{school_phone}} | Email: {{school_email}}</p><hr/><h3>FEE DEMAND NOTE</h3></div><p>Date: {{date}}</p><p>Dear Parent/Guardian of <strong>{{student_name}}</strong>,</p><p>This is to inform you that your child/ward in <strong>{{class_name}}</strong> has an outstanding fee balance of <strong>KES {{balance}}</strong> for {{term}} {{year}}.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr style="background:#f5f5f5"><th style="padding:8px;border:1px solid #ddd;text-align:left">Fee Item</th><th style="padding:8px;border:1px solid #ddd">Expected</th><th style="padding:8px;border:1px solid #ddd">Paid</th><th style="padding:8px;border:1px solid #ddd">Balance</th></tr>{{fee_rows}}</table><p>Kindly clear the balance by <strong>{{due_date}}</strong> to avoid disruption of your child''s studies.</p><p>Yours faithfully,</p><br/><p><strong>{{bursar_name}}</strong><br/>Bursar</p></div>',
   '[{"key":"student_name","label":"Student Name"},{"key":"class_name","label":"Class"},{"key":"balance","label":"Balance (KES)"},{"key":"term","label":"Term"},{"key":"year","label":"Year"},{"key":"due_date","label":"Due Date"},{"key":"fee_rows","label":"Fee Table Rows"},{"key":"bursar_name","label":"Bursar Name"}]'::JSONB),

  (p_school_id, 'Suspension Letter', 'letter', 'discipline', TRUE,
   '<div style="font-family:serif;padding:40px;max-width:700px;margin:auto"><div style="text-align:center"><h2>{{school_name}}</h2><p>{{school_address}}</p><hr/><h3>SUSPENSION LETTER</h3></div><p>Date: {{date}}</p><p>To: Parent/Guardian of <strong>{{student_name}}</strong>, {{class_name}}</p><p>This letter serves to inform you that your child has been <strong>suspended from school</strong> for a period of <strong>{{days}} day(s)</strong> effective {{start_date}}, for the following reason(s):</p><p style="padding:12px;background:#fff3f3;border-left:4px solid red">{{reason}}</p><p>Your child is expected to return to school on <strong>{{return_date}}</strong> accompanied by a parent/guardian for a meeting with the Principal before re-admission.</p><p>Yours faithfully,</p><br/><p><strong>{{principal_name}}</strong><br/>Principal</p></div>',
   '[{"key":"student_name","label":"Student Name"},{"key":"class_name","label":"Class"},{"key":"days","label":"Suspension Days"},{"key":"start_date","label":"Start Date"},{"key":"return_date","label":"Return Date"},{"key":"reason","label":"Reason"},{"key":"principal_name","label":"Principal Name"}]'::JSONB),

  (p_school_id, 'Parent Invitation Letter', 'letter', 'general', TRUE,
   '<div style="font-family:serif;padding:40px;max-width:700px;margin:auto"><div style="text-align:center"><h2>{{school_name}}</h2><p>{{school_address}}</p><hr/></div><p>Date: {{date}}</p><p>Dear Parent/Guardian of <strong>{{student_name}}</strong>,</p><p>You are cordially invited to meet with school administration regarding <strong>{{subject}}</strong>.</p><p><strong>Date:</strong> {{meeting_date}}<br/><strong>Time:</strong> {{meeting_time}}<br/><strong>Venue:</strong> {{venue}}</p><p>Kindly confirm your attendance by calling {{school_phone}}.</p><p>Yours faithfully,</p><br/><p><strong>{{principal_name}}</strong><br/>Principal</p></div>',
   '[{"key":"student_name","label":"Student Name"},{"key":"subject","label":"Meeting Subject"},{"key":"meeting_date","label":"Meeting Date"},{"key":"meeting_time","label":"Time"},{"key":"venue","label":"Venue"}]'::JSONB),

  (p_school_id, 'School Circular', 'circular', 'general', TRUE,
   '<div style="font-family:serif;padding:40px;max-width:700px;margin:auto"><div style="text-align:center"><h2>{{school_name}}</h2><p>{{school_address}}</p><hr/><h3>CIRCULAR No. {{circular_no}}</h3></div><p>Date: {{date}}</p><p>To: All {{recipients}}</p><p>Subject: <strong>{{subject}}</strong></p><p>{{content}}</p><p>Thank you for your cooperation.</p><p>Yours faithfully,</p><br/><p><strong>{{principal_name}}</strong><br/>Principal</p></div>',
   '[{"key":"circular_no","label":"Circular Number"},{"key":"recipients","label":"Recipients"},{"key":"subject","label":"Subject"},{"key":"content","label":"Content"}]'::JSONB)

  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE store_items IS 'School inventory items managed by storekeeper';
COMMENT ON TABLE cbc_learning_areas IS 'CBC curriculum learning areas for primary schools';
COMMENT ON TABLE document_templates IS 'Editable letter and document templates';
COMMENT ON TABLE schemes_of_work IS 'Teacher weekly schemes and syllabus coverage';
