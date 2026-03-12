-- SAGARA Supabase Migration Script
-- WARNING: This will drop existing tables and data in the public schema.
-- Run this in the Supabase SQL Editor

-- Drop existing tables if they exist to ensure clean schema
DROP TABLE IF EXISTS academic_calendar CASCADE;
DROP TABLE IF EXISTS class_config CASCADE;
DROP TABLE IF EXISTS schedule CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS book_inventory CASCADE;
DROP TABLE IF EXISTS book_loans CASCADE;
DROP TABLE IF EXISTS bos_management CASCADE;
DROP TABLE IF EXISTS school_assets CASCADE;
DROP TABLE IF EXISTS learning_documentation CASCADE;
DROP TABLE IF EXISTS support_documents CASCADE;
DROP TABLE IF EXISTS permission_requests CASCADE;
DROP TABLE IF EXISTS buku_penghubung CASCADE;
DROP TABLE IF EXISTS jurnal_kelas CASCADE;
DROP TABLE IF EXISTS learning_reports CASCADE;
DROP TABLE IF EXISTS employment_links CASCADE;
DROP TABLE IF EXISTS penilaian_karakter CASCADE;
DROP TABLE IF EXISTS penilaian_sikap CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS extracurriculars CASCADE;
DROP TABLE IF EXISTS counseling CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS agendas CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS graduates CASCADE;

-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nip TEXT,
  nuptk TEXT,
  birth_info TEXT,
  education TEXT,
  position TEXT,
  rank TEXT,
  class_id TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  photo TEXT,
  signature TEXT,
  student_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Class Config table (Moved to top for priority)
CREATE TABLE class_config (
  class_id TEXT PRIMARY KEY,
  data JSONB NOT NULL, -- Stores schedule, piket, seats, kktp, organization, settings
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  nis TEXT UNIQUE NOT NULL,
  nisn TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  birth_place TEXT,
  birth_date DATE,
  religion TEXT,
  address TEXT,
  father_name TEXT,
  father_job TEXT,
  father_education TEXT,
  mother_name TEXT,
  mother_job TEXT,
  mother_education TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_job TEXT,
  economy_status TEXT,
  height NUMERIC DEFAULT 0,
  weight NUMERIC DEFAULT 0,
  blood_type TEXT,
  health_notes TEXT,
  hobbies TEXT,
  ambition TEXT,
  achievements JSONB DEFAULT '[]',
  violations JSONB DEFAULT '[]',
  behavior_score NUMERIC DEFAULT 100,
  present NUMERIC DEFAULT 0,
  sick NUMERIC DEFAULT 0,
  permit NUMERIC DEFAULT 0,
  alpha NUMERIC DEFAULT 0,
  photo TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Agendas table
CREATE TABLE agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  type TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Attendance table
CREATE TABLE attendance (
  id TEXT PRIMARY KEY, -- format: classId_date
  records JSONB NOT NULL, -- Array of { studentId, status, notes }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Holidays table
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT,
  date DATE NOT NULL,
  description TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Counseling table
CREATE TABLE counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  date DATE NOT NULL,
  type TEXT,
  category TEXT,
  description TEXT,
  point NUMERIC DEFAULT 0,
  emotion TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Extracurriculars table
CREATE TABLE extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  schedule TEXT,
  coach TEXT,
  members JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Profiles table
CREATE TABLE profiles (
  id TEXT PRIMARY KEY, -- 'teacher' or 'school'
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Inventory table
CREATE TABLE inventory (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support client-side IDs
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  condition TEXT,
  qty NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Guests table
CREATE TABLE guests (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT to support client-side IDs
  class_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  name TEXT NOT NULL,
  agency TEXT,
  purpose TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ... (skip to end of file to add policies)

-- Enable RLS for Class Config
ALTER TABLE class_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."class_config"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable RLS for Inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."inventory"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable RLS for Guests
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."guests"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 11. Penilaian Sikap table
CREATE TABLE penilaian_sikap (
  student_id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  keimanan NUMERIC DEFAULT 0,
  kewargaan NUMERIC DEFAULT 0,
  penalaran_kritis NUMERIC DEFAULT 0,
  kreativitas NUMERIC DEFAULT 0,
  kolaborasi NUMERIC DEFAULT 0,
  kemandirian NUMERIC DEFAULT 0,
  kesehatan NUMERIC DEFAULT 0,
  komunikasi NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Penilaian Karakter table
CREATE TABLE penilaian_karakter (
  student_id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  bangun_pagi TEXT,
  beribadah TEXT,
  berolahraga TEXT,
  makan_sehat TEXT,
  gemar_belajar TEXT,
  bermasyarakat TEXT,
  tidur_awal TEXT,
  catatan TEXT,
  afirmasi TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Employment Links table
CREATE TABLE employment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Learning Reports table
CREATE TABLE learning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT,
  subject TEXT,
  topic TEXT,
  document_link TEXT,
  teacher_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Jurnal Kelas table
CREATE TABLE jurnal_kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  date DATE NOT NULL,
  day TEXT,
  content JSONB DEFAULT '[]', -- Array of journal entries
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, date)
);

-- 16. Buku Penghubung table
CREATE TABLE buku_penghubung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  date DATE NOT NULL,
  sender TEXT,
  message TEXT,
  status TEXT,
  category TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. Permission Requests table
CREATE TABLE permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 18. Support Documents table
CREATE TABLE support_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. Learning Documentation table
CREATE TABLE learning_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  nama_kegiatan TEXT NOT NULL,
  link_foto TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. School Assets table
CREATE TABLE school_assets (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT
  name TEXT NOT NULL,
  qty NUMERIC DEFAULT 0,
  condition TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. BOS Management table
CREATE TABLE bos_management (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT
  date DATE NOT NULL,
  type TEXT,
  category TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 22. Book Loans table
CREATE TABLE book_loans (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT
  student_id TEXT NOT NULL,
  student_name TEXT,
  class_id TEXT NOT NULL,
  books JSONB DEFAULT '[]',
  qty NUMERIC DEFAULT 0,
  status TEXT,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ... (skip to end of file to add policies)

-- Enable RLS for School Assets
ALTER TABLE school_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."school_assets"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable RLS for BOS Management
ALTER TABLE bos_management ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."bos_management"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Enable RLS for Book Loans
ALTER TABLE book_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" ON "public"."book_loans"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 23. Book Inventory table
CREATE TABLE book_inventory (
  id TEXT PRIMARY KEY, -- format: classId_subjectId
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  stock NUMERIC DEFAULT 0,
  total_stock NUMERIC DEFAULT 0,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 24. Grades table
CREATE TABLE grades (
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  sum1 NUMERIC DEFAULT 0,
  sum2 NUMERIC DEFAULT 0,
  sum3 NUMERIC DEFAULT 0,
  sum4 NUMERIC DEFAULT 0,
  sas NUMERIC DEFAULT 0,
  PRIMARY KEY (student_id, subject_id)
);

-- 26. Academic Calendar table
CREATE TABLE IF NOT EXISTS academic_calendar (
  id TEXT PRIMARY KEY, -- 'global' or class_id
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access for all users (since we use anon key)
CREATE POLICY "Enable all access for all users" ON "public"."academic_calendar"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 27. Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  day TEXT NOT NULL,
  time TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access for all users
CREATE POLICY "Enable all access for all users" ON "public"."schedule"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 28. Graduates table
CREATE TABLE IF NOT EXISTS graduates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn TEXT,
  name TEXT NOT NULL,
  ijazah_number TEXT,
  status TEXT,
  graduation_year TEXT,
  continued_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE graduates ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access for all users
CREATE POLICY "Enable all access for all users" ON "public"."graduates"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Insert default admin user
INSERT INTO users (username, password, role, full_name, class_id)
VALUES ('admin', '123456', 'admin', 'Administrator Utama', 'all')
ON CONFLICT (username) DO NOTHING;
