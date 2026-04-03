-- ============================================================
-- Migration 014: Student Documents and Files
-- ============================================================
CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_docs ON student_documents(student_id, school_id);
