-- ============================================================
-- STT Tunas Guna Dharma - Database Schema
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE gender_type AS ENUM ('L', 'P');
CREATE TYPE member_role AS ENUM ('ketua', 'wakil_ketua', 'sekretaris', 'bendahara', 'anggota', 'anggota_kehormatan');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE loan_status AS ENUM ('active', 'paid', 'overdue', 'cancelled');
CREATE TYPE meeting_type AS ENUM ('regular', 'extraordinary', 'annual', 'special');
CREATE TYPE meeting_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused', 'sick');
CREATE TYPE dues_payment_status AS ENUM ('paid', 'pending', 'waived');
CREATE TYPE waste_session_status AS ENUM ('ongoing', 'completed', 'cancelled');
CREATE TYPE app_user_role AS ENUM ('superadmin', 'admin', 'treasurer', 'secretary', 'member');

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, full_name TEXT, avatar_url TEXT,
  role app_user_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBER STATUS TYPES
CREATE TABLE member_status_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, description TEXT, color TEXT DEFAULT '#16a34a',
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEMBERS
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_number TEXT UNIQUE,
  full_name TEXT NOT NULL, date_of_birth DATE,
  gender gender_type, address TEXT, rt_rw TEXT,
  phone TEXT, email TEXT,
  status_id UUID REFERENCES member_status_types(id),
  role member_role DEFAULT 'anggota',
  join_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  profile_id UUID REFERENCES profiles(id),
  activity_points INTEGER DEFAULT 0,
  photo_url TEXT, nik TEXT, occupation TEXT, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_member_number() RETURNS TRIGGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num FROM members WHERE member_number ~ '^STT\d+$';
  NEW.member_number := 'STT' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_member_number BEFORE INSERT ON members
  FOR EACH ROW WHEN (NEW.member_number IS NULL)
  EXECUTE FUNCTION generate_member_number();

-- CASH ACCOUNTS
CREATE TABLE cash_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, description TEXT,
  balance DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTION CATEGORIES
CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, type transaction_type NOT NULL,
  description TEXT, color TEXT DEFAULT '#16a34a',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DONORS
CREATE TABLE donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, phone TEXT, email TEXT, address TEXT,
  total_donated DECIMAL(15,2) DEFAULT 0,
  is_member BOOLEAN DEFAULT false,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CASH TRANSACTIONS
CREATE TABLE cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES cash_accounts(id),
  type transaction_type NOT NULL,
  category_id UUID REFERENCES transaction_categories(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL, reference_no TEXT,
  donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  attachment_url TEXT, is_verified BOOLEAN DEFAULT false, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOANS
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_number TEXT UNIQUE,
  borrower_name TEXT NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES cash_accounts(id),
  principal_amount DECIMAL(15,2) NOT NULL CHECK (principal_amount > 0),
  interest_rate DECIMAL(5,2) DEFAULT 0,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status loan_status NOT NULL DEFAULT 'active',
  total_paid DECIMAL(15,2) DEFAULT 0,
  remaining_amount DECIMAL(15,2),
  purpose TEXT, collateral TEXT, notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_loan_number() RETURNS TRIGGER AS $$
DECLARE next_num INTEGER; year_part TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(loan_number FROM LENGTH('LOAN-YYYY-') + 1) AS INTEGER)), 0) + 1
  INTO next_num FROM loans WHERE loan_number LIKE 'LOAN-' || year_part || '-%';
  NEW.loan_number := 'LOAN-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
  NEW.remaining_amount := NEW.principal_amount;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_loan_number BEFORE INSERT ON loans
  FOR EACH ROW WHEN (NEW.loan_number IS NULL) EXECUTE FUNCTION generate_loan_number();

-- LOAN PAYMENTS
CREATE TABLE loan_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT, recorded_by UUID REFERENCES profiles(id),
  transaction_id UUID REFERENCES cash_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_loan_after_payment() RETURNS TRIGGER AS $$
BEGIN
  UPDATE loans SET
    total_paid = total_paid + NEW.amount,
    remaining_amount = GREATEST(0, remaining_amount - NEW.amount),
    status = CASE WHEN remaining_amount - NEW.amount <= 0 THEN 'paid'::loan_status ELSE status END,
    updated_at = NOW()
  WHERE id = NEW.loan_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER after_loan_payment AFTER INSERT ON loan_payments
  FOR EACH ROW EXECUTE FUNCTION update_loan_after_payment();

-- BALANCE TRIGGERS
CREATE OR REPLACE FUNCTION update_account_balance() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'income' THEN UPDATE cash_accounts SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
    ELSIF NEW.type = 'expense' THEN UPDATE cash_accounts SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'income' THEN UPDATE cash_accounts SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
    ELSIF OLD.type = 'expense' THEN UPDATE cash_accounts SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sync_account_balance AFTER INSERT OR DELETE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- MEETINGS
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL, description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME, end_time TIME, location TEXT,
  type meeting_type DEFAULT 'regular',
  status meeting_status DEFAULT 'scheduled',
  agenda TEXT, minutes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ATTENDANCE
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  notes TEXT, recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, member_id)
);

CREATE OR REPLACE FUNCTION sync_member_activity_points() RETURNS TRIGGER AS $$
BEGIN
  UPDATE members SET
    activity_points = (SELECT COALESCE(SUM(points_earned), 0) FROM attendance WHERE member_id = COALESCE(NEW.member_id, OLD.member_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.member_id, OLD.member_id);
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sync_activity_points AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION sync_member_activity_points();

-- DUES SETTINGS
CREATE TABLE dues_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_id UUID NOT NULL REFERENCES member_status_types(id),
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, is_active BOOLEAN DEFAULT true, notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DUES PAYMENTS
CREATE TABLE dues_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status dues_payment_status NOT NULL DEFAULT 'pending',
  transaction_id UUID REFERENCES cash_transactions(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES profiles(id), notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, period_year, period_month)
);

-- POINTS CONFIG
CREATE TABLE points_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0, description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE COLLECTORS
CREATE TABLE waste_collectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, address TEXT, rt_rw TEXT,
  phone TEXT, kk_number TEXT,
  is_member BOOLEAN DEFAULT false,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  total_weight DECIMAL(12,3) DEFAULT 0,
  total_earnings DECIMAL(15,2) DEFAULT 0, notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE TYPES
CREATE TABLE waste_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, description TEXT,
  price_per_kg DECIMAL(12,2) NOT NULL CHECK (price_per_kg >= 0),
  color TEXT DEFAULT '#16a34a', is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE COLLECTION SESSIONS
CREATE TABLE waste_collection_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL, location TEXT, officer_name TEXT,
  status waste_session_status DEFAULT 'ongoing',
  total_weight DECIMAL(12,3) DEFAULT 0,
  total_earnings DECIMAL(15,2) DEFAULT 0, notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE COLLECTIONS
CREATE TABLE waste_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES waste_collection_sessions(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL REFERENCES waste_collectors(id),
  collected_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_weight DECIMAL(12,3) DEFAULT 0,
  total_earnings DECIMAL(15,2) DEFAULT 0, notes TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WASTE COLLECTION ITEMS
CREATE TABLE waste_collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES waste_collections(id) ON DELETE CASCADE,
  waste_type_id UUID NOT NULL REFERENCES waste_types(id),
  weight DECIMAL(10,3) NOT NULL CHECK (weight > 0),
  price_per_kg DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sync_waste_totals() RETURNS TRIGGER AS $$
DECLARE
  v_cid UUID; v_sid UUID;
  v_tw DECIMAL(12,3); v_te DECIMAL(15,2);
BEGIN
  v_cid := COALESCE(NEW.collection_id, OLD.collection_id);
  SELECT COALESCE(SUM(weight),0), COALESCE(SUM(subtotal),0) INTO v_tw, v_te FROM waste_collection_items WHERE collection_id = v_cid;
  UPDATE waste_collections SET total_weight = v_tw, total_earnings = v_te, updated_at = NOW() WHERE id = v_cid RETURNING session_id INTO v_sid;
  SELECT COALESCE(SUM(total_weight),0), COALESCE(SUM(total_earnings),0) INTO v_tw, v_te FROM waste_collections WHERE session_id = v_sid;
  UPDATE waste_collection_sessions SET total_weight = v_tw, total_earnings = v_te, updated_at = NOW() WHERE id = v_sid;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sync_waste_totals AFTER INSERT OR UPDATE OR DELETE ON waste_collection_items
  FOR EACH ROW EXECUTE FUNCTION sync_waste_totals();

CREATE OR REPLACE FUNCTION sync_collector_totals() RETURNS TRIGGER AS $$
DECLARE v_coll_id UUID;
BEGIN
  v_coll_id := COALESCE(NEW.collector_id, OLD.collector_id);
  UPDATE waste_collectors SET
    total_weight = (SELECT COALESCE(SUM(total_weight),0) FROM waste_collections WHERE collector_id = v_coll_id),
    total_earnings = (SELECT COALESCE(SUM(total_earnings),0) FROM waste_collections WHERE collector_id = v_coll_id),
    updated_at = NOW()
  WHERE id = v_coll_id;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sync_collector_totals AFTER INSERT OR UPDATE OR DELETE ON waste_collections
  FOR EACH ROW EXECUTE FUNCTION sync_collector_totals();

-- UPDATED_AT
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_dues_updated_at BEFORE UPDATE ON dues_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- INDEXES
CREATE INDEX idx_members_status ON members(status_id);
CREATE INDEX idx_members_active ON members(is_active);
CREATE INDEX idx_transactions_account ON cash_transactions(account_id);
CREATE INDEX idx_transactions_date ON cash_transactions(transaction_date DESC);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_attendance_meeting ON attendance(meeting_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_dues_member ON dues_payments(member_id, period_year, period_month);
CREATE INDEX idx_waste_coll_session ON waste_collections(session_id);
CREATE INDEX idx_waste_coll_collector ON waste_collections(collector_id);
