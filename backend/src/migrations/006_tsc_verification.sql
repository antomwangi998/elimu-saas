-- ============================================================
-- ElimuSaaS — Migration 006
-- TSC Verification System
-- Multi-layer: format, duplicate, document, name-match,
-- admin approval, fraud detection, verification scoring
-- ============================================================

-- ── VERIFICATION STATUS ENUM ──────────────────────────────────
DO $$ BEGIN
  CREATE TYPE tsc_verification_status AS ENUM (
    'pending',        -- submitted, awaiting admin review
    'under_review',   -- admin has opened the review
    'verified',       -- fully approved — full system access
    'rejected',       -- rejected with reason
    'flagged',        -- fraud pattern detected — locked
    'expired'         -- documents expired, re-verification needed
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'tsc_certificate',
    'national_id_front',
    'national_id_back',
    'passport',
    'academic_certificate',
    'employment_letter',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── EXTEND STAFF TABLE ────────────────────────────────────────
ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS tsc_verification_status tsc_verification_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tsc_verification_score  SMALLINT DEFAULT 0,       -- 0–100
  ADD COLUMN IF NOT EXISTS tsc_verified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tsc_verified_by         UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS tsc_rejection_reason    TEXT,
  ADD COLUMN IF NOT EXISTS tsc_flagged_reason      TEXT,
  ADD COLUMN IF NOT EXISTS tsc_review_notes        TEXT,
  ADD COLUMN IF NOT EXISTS documents_submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_verification_attempt TIMESTAMPTZ;

-- ── EXTEND USERS TABLE ────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tsc_verification_status tsc_verification_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS is_tsc_verified         BOOLEAN DEFAULT false;

-- ── TSC VERIFICATION SUBMISSIONS ─────────────────────────────
-- One record per submission (a teacher can re-submit after rejection)
CREATE TABLE IF NOT EXISTS tsc_verifications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id            UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What the teacher/dean submitted
  submitted_tsc       VARCHAR(30) NOT NULL,
  submitted_first_name VARCHAR(100) NOT NULL,
  submitted_last_name  VARCHAR(100) NOT NULL,
  submitted_national_id VARCHAR(30) NOT NULL,
  submitted_date_of_birth DATE,
  submitted_by        UUID NOT NULL REFERENCES users(id),
  submitted_at        TIMESTAMPTZ DEFAULT NOW(),

  -- Verification status
  status              tsc_verification_status DEFAULT 'pending',
  attempt_number      SMALLINT DEFAULT 1,

  -- Scoring breakdown (each layer = points)
  score_format_valid      SMALLINT DEFAULT 0,   -- max 10: TSC format correct
  score_no_duplicate      SMALLINT DEFAULT 0,   -- max 15: unique in system
  score_no_global_dup     SMALLINT DEFAULT 0,   -- max 15: unique across all schools
  score_docs_uploaded     SMALLINT DEFAULT 0,   -- max 20: documents present
  score_name_match        SMALLINT DEFAULT 0,   -- max 20: name matches doc
  score_id_match          SMALLINT DEFAULT 0,   -- max 10: national ID matches doc
  score_admin_approved    SMALLINT DEFAULT 0,   -- max 10: admin reviewed & approved

  total_score         SMALLINT GENERATED ALWAYS AS (
    score_format_valid + score_no_duplicate + score_no_global_dup +
    score_docs_uploaded + score_name_match + score_id_match + score_admin_approved
  ) STORED,

  -- Flags / fraud detection
  is_flagged          BOOLEAN DEFAULT false,
  flag_reasons        JSONB DEFAULT '[]',       -- [{type, description, severity}]
  fraud_risk_level    VARCHAR(10) DEFAULT 'low' CHECK (fraud_risk_level IN ('low','medium','high','critical')),

  -- Admin review
  reviewed_by         UUID REFERENCES users(id),
  reviewed_at         TIMESTAMPTZ,
  admin_notes         TEXT,
  rejection_reason    TEXT,

  -- Name match result
  name_match_result   JSONB DEFAULT '{}',       -- {firstNameSimilarity, lastNameSimilarity, overallMatch, method}
  id_match_confirmed  BOOLEAN,

  -- TSC portal check
  tsc_portal_checked  BOOLEAN DEFAULT false,
  tsc_portal_result   JSONB DEFAULT '{}',       -- {checkedAt, checkedBy, result, notes}

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── VERIFICATION DOCUMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES tsc_verifications(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  document_type   document_type NOT NULL,
  file_url        TEXT NOT NULL,
  file_name       VARCHAR(255),
  file_size       BIGINT,
  mime_type       VARCHAR(50),

  -- Extracted / matched data from document
  extracted_name  VARCHAR(200),
  extracted_id    VARCHAR(30),
  extracted_tsc   VARCHAR(30),
  extraction_confidence DECIMAL(4,3),          -- 0–1

  -- Review
  is_verified     BOOLEAN,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  rejection_note  TEXT,

  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── FRAUD DETECTION LOG ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS tsc_fraud_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID REFERENCES schools(id),
  staff_id        UUID REFERENCES staff(id),
  user_id         UUID REFERENCES users(id),
  flag_type       VARCHAR(50) NOT NULL,
  -- 'duplicate_tsc_attempt', 'name_mismatch', 'id_mismatch',
  -- 'multiple_schools', 'doc_inconsistency', 'rapid_resubmission'
  description     TEXT NOT NULL,
  severity        VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  metadata        JSONB DEFAULT '{}',
  auto_detected   BOOLEAN DEFAULT true,
  resolved        BOOLEAN DEFAULT false,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── TSC PORTAL CHECK LOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tsc_portal_checks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verification_id UUID NOT NULL REFERENCES tsc_verifications(id),
  school_id       UUID NOT NULL REFERENCES schools(id),
  checked_by      UUID NOT NULL REFERENCES users(id),
  tsc_number      VARCHAR(30) NOT NULL,
  check_method    VARCHAR(30) DEFAULT 'manual_portal',
  -- 'manual_portal': admin checked tsc.go.ke manually
  -- 'document_scan': extracted from uploaded TSC cert
  result          VARCHAR(20) DEFAULT 'pending' CHECK (result IN ('pending','matched','not_found','mismatch','error')),
  portal_data     JSONB DEFAULT '{}',
  notes           TEXT,
  checked_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── VERIFICATION NOTIFICATIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id),
  school_id       UUID NOT NULL REFERENCES schools(id),
  type            VARCHAR(50) NOT NULL,
  message         TEXT NOT NULL,
  is_read         BOOLEAN DEFAULT false,
  sent_sms        BOOLEAN DEFAULT false,
  sent_email      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tsc_verif_staff   ON tsc_verifications(staff_id, status);
CREATE INDEX IF NOT EXISTS idx_tsc_verif_school  ON tsc_verifications(school_id, status);
CREATE INDEX IF NOT EXISTS idx_tsc_verif_tsc     ON tsc_verifications(submitted_tsc);
CREATE INDEX IF NOT EXISTS idx_verif_docs_staff  ON verification_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags       ON tsc_fraud_flags(staff_id, resolved);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_type  ON tsc_fraud_flags(flag_type, severity);
