-- Migration 017: Add teacher_remarks to student_marks table
-- The code expects teacher_remarks but original schema has only 'remarks'

ALTER TABLE student_marks 
  ADD COLUMN IF NOT EXISTS teacher_remarks TEXT;

-- Also populate from existing remarks column
UPDATE student_marks SET teacher_remarks = remarks WHERE teacher_remarks IS NULL AND remarks IS NOT NULL;

-- Add missing updated_at to students if needed
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
