-- ============================================================
-- ElimuSaaS — Migration 007
-- Two-way messaging threads, school profile/gallery,
-- full-text search indexes, exam auto-marking sessions,
-- alumni showcase, activity monitoring, newsletters
-- ============================================================

-- ── TWO-WAY MESSAGING THREADS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS message_threads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject     VARCHAR(255) NOT NULL,
  created_by  UUID NOT NULL REFERENCES users(id),
  type        VARCHAR(30) DEFAULT 'general'
              CHECK(type IN ('parent_teacher','student_teacher','admin_staff','general','announcement')),
  class_id    UUID REFERENCES classes(id),
  is_archived BOOLEAN DEFAULT false,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thread_participants (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'participant',
  last_read  TIMESTAMPTZ,
  is_muted   BOOLEAN DEFAULT false,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS thread_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id  UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  school_id  UUID NOT NULL REFERENCES schools(id),
  sender_id  UUID NOT NULL REFERENCES users(id),
  body       TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_system  BOOLEAN DEFAULT false,
  read_by    UUID[] DEFAULT '{}',
  edited_at  TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SCHOOL PROFILE & GALLERY ──────────────────────────────────
CREATE TABLE IF NOT EXISTS school_gallery (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title       VARCHAR(200),
  description TEXT,
  image_url   TEXT NOT NULL,
  category    VARCHAR(50) DEFAULT 'general'
              CHECK(category IN ('campus','events','sports','academics','graduation','general')),
  is_featured BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_profile (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id         UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  -- Identity
  vision            TEXT,
  mission           TEXT,
  core_values       TEXT[],
  history           TEXT,
  achievements      TEXT[],
  -- Contact
  principal_name    VARCHAR(200),
  principal_message TEXT,
  -- Social
  facebook_url      TEXT,
  twitter_url       TEXT,
  instagram_url     TEXT,
  youtube_url       TEXT,
  -- Stats (cached)
  total_students    INTEGER DEFAULT 0,
  total_staff       INTEGER DEFAULT 0,
  founded_year      INTEGER,
  -- Branding
  primary_colour    VARCHAR(20) DEFAULT '#1a365d',
  secondary_colour  VARCHAR(20) DEFAULT '#3b82f6',
  accent_colour     VARCHAR(20) DEFAULT '#d4af37',
  -- Signatures for documents
  principal_signature_url   TEXT,
  principal_signature_name  VARCHAR(150),
  deputy_signature_url      TEXT,
  bursar_signature_url      TEXT,
  bursar_signature_name     VARCHAR(150),
  stamp_url                 TEXT,
  letterhead_url            TEXT,
  watermark_text            VARCHAR(100),
  watermark_opacity         DECIMAL(3,2) DEFAULT 0.07,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── ALUMNI SHOWCASE ───────────────────────────────────────────
ALTER TABLE alumni
  ADD COLUMN IF NOT EXISTS is_showcase       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS showcase_quote    TEXT,
  ADD COLUMN IF NOT EXISTS showcase_image_url TEXT,
  ADD COLUMN IF NOT EXISTS awards            TEXT[],
  ADD COLUMN IF NOT EXISTS notable_facts     TEXT,
  ADD COLUMN IF NOT EXISTS social_links      JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS year_left         INTEGER;

-- ── ONLINE EXAM AUTO-MARKING sessions ─────────────────────────
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS question_order  UUID[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS time_remaining  INTEGER,
  ADD COLUMN IF NOT EXISTS last_activity   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS focus_lost_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS copy_attempts   INTEGER DEFAULT 0;

-- ── ACTIVITY / SECURITY MONITORING ───────────────────────────
CREATE TABLE IF NOT EXISTS user_activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID REFERENCES schools(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id   UUID,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   UUID REFERENCES schools(id),
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  device_type VARCHAR(30),
  location    VARCHAR(100),
  status      VARCHAR(20) DEFAULT 'success' CHECK(status IN ('success','failed','locked')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── NEWSLETTERS (wire up) ─────────────────────────────────────
-- already exists in schema, just ensure columns
ALTER TABLE newsletters
  ADD COLUMN IF NOT EXISTS category  VARCHAR(50) DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS tags      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

-- ── FULL-TEXT SEARCH INDEXES ──────────────────────────────────
-- Students
CREATE INDEX IF NOT EXISTS idx_fts_students ON students USING GIN (
  to_tsvector('english',
    COALESCE(first_name,'') || ' ' ||
    COALESCE(last_name,'')  || ' ' ||
    COALESCE(admission_number,''))
);

-- Staff
CREATE INDEX IF NOT EXISTS idx_fts_staff_users ON users USING GIN (
  to_tsvector('english',
    COALESCE(first_name,'') || ' ' ||
    COALESCE(last_name,'')  || ' ' ||
    COALESCE(email,''))
);

-- Subjects
CREATE INDEX IF NOT EXISTS idx_fts_subjects ON subjects USING GIN (
  to_tsvector('english', COALESCE(name,'') || ' ' || COALESCE(code,''))
);

-- Resources
CREATE INDEX IF NOT EXISTS idx_fts_resources ON learning_resources USING GIN (
  to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(description,''))
);

-- Thread messages
CREATE INDEX IF NOT EXISTS idx_fts_thread_msg ON thread_messages USING GIN (
  to_tsvector('english', body)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_school ON user_activity_log(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history ON login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_msgs ON thread_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_thread_participants ON thread_participants(user_id, thread_id);
CREATE INDEX IF NOT EXISTS idx_gallery ON school_gallery(school_id, is_featured);
