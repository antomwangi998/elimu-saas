-- ============================================================
-- ElimuSaaS — Migration 002: Library & Notification Enhancements
-- ============================================================

-- ── LIBRARY TABLES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS library_books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(30),
  publisher VARCHAR(100),
  publication_year INTEGER,
  edition VARCHAR(20),
  category VARCHAR(50) DEFAULT 'general',
  subject VARCHAR(100),
  total_copies INTEGER DEFAULT 1,
  shelf_number VARCHAR(30),
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL,
  borrower_type VARCHAR(20) NOT NULL CHECK (borrower_type IN ('student', 'staff')),
  issued_by UUID REFERENCES users(id),
  received_by UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  due_date DATE NOT NULL,
  returned_at TIMESTAMPTZ,
  condition_on_return VARCHAR(20) DEFAULT 'good',
  fine_amount DECIMAL(8,2) DEFAULT 0,
  notes TEXT
);

-- ── NOTIFICATIONS ENHANCEMENTS ────────────────────────────────

ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- ── INDEXES ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_library_books_school ON library_books(school_id);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON library_books(isbn);
CREATE INDEX IF NOT EXISTS idx_library_issues_school ON library_issues(school_id);
CREATE INDEX IF NOT EXISTS idx_library_issues_borrower ON library_issues(borrower_id);
CREATE INDEX IF NOT EXISTS idx_library_issues_book ON library_issues(book_id);
CREATE INDEX IF NOT EXISTS idx_library_issues_overdue ON library_issues(due_date) WHERE returned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(user_id, is_read);
