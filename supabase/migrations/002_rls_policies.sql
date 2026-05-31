-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_status_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_collection_items ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated() RETURNS BOOLEAN AS $$
BEGIN RETURN auth.uid() IS NOT NULL; END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check user role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS app_user_role AS $$
DECLARE user_role app_user_role;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  RETURN user_role;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_above() RETURNS BOOLEAN AS $$
BEGIN RETURN get_user_role() IN ('superadmin', 'admin'); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_treasurer_or_above() RETURNS BOOLEAN AS $$
BEGIN RETURN get_user_role() IN ('superadmin', 'admin', 'treasurer'); END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (is_authenticated());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin_or_above());

-- All lookup tables: authenticated read, admin write
CREATE POLICY "status_types_select" ON member_status_types FOR SELECT USING (is_authenticated());
CREATE POLICY "status_types_write" ON member_status_types FOR ALL USING (is_admin_or_above());
CREATE POLICY "categories_select" ON transaction_categories FOR SELECT USING (is_authenticated());
CREATE POLICY "categories_write" ON transaction_categories FOR ALL USING (is_treasurer_or_above());
CREATE POLICY "points_select" ON points_config FOR SELECT USING (is_authenticated());
CREATE POLICY "points_write" ON points_config FOR ALL USING (is_admin_or_above());
CREATE POLICY "waste_types_select" ON waste_types FOR SELECT USING (is_authenticated());
CREATE POLICY "waste_types_write" ON waste_types FOR ALL USING (is_admin_or_above());

-- Members: all authenticated users can read, admin/secretary can write
CREATE POLICY "members_select" ON members FOR SELECT USING (is_authenticated());
CREATE POLICY "members_write" ON members FOR ALL USING (is_admin_or_above() OR get_user_role() = 'secretary');

-- Finance: all authenticated read, treasurer/admin write
CREATE POLICY "accounts_select" ON cash_accounts FOR SELECT USING (is_authenticated());
CREATE POLICY "accounts_write" ON cash_accounts FOR ALL USING (is_treasurer_or_above());
CREATE POLICY "transactions_select" ON cash_transactions FOR SELECT USING (is_authenticated());
CREATE POLICY "transactions_write" ON cash_transactions FOR ALL USING (is_treasurer_or_above());
CREATE POLICY "donors_select" ON donors FOR SELECT USING (is_authenticated());
CREATE POLICY "donors_write" ON donors FOR ALL USING (is_treasurer_or_above());
CREATE POLICY "loans_select" ON loans FOR SELECT USING (is_authenticated());
CREATE POLICY "loans_write" ON loans FOR ALL USING (is_treasurer_or_above());
CREATE POLICY "loan_payments_select" ON loan_payments FOR SELECT USING (is_authenticated());
CREATE POLICY "loan_payments_write" ON loan_payments FOR ALL USING (is_treasurer_or_above());

-- Meetings & Attendance
CREATE POLICY "meetings_select" ON meetings FOR SELECT USING (is_authenticated());
CREATE POLICY "meetings_write" ON meetings FOR ALL USING (is_admin_or_above() OR get_user_role() = 'secretary');
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (is_authenticated());
CREATE POLICY "attendance_write" ON attendance FOR ALL USING (is_admin_or_above() OR get_user_role() = 'secretary');

-- Dues
CREATE POLICY "dues_settings_select" ON dues_settings FOR SELECT USING (is_authenticated());
CREATE POLICY "dues_settings_write" ON dues_settings FOR ALL USING (is_admin_or_above());
CREATE POLICY "dues_payments_select" ON dues_payments FOR SELECT USING (is_authenticated());
CREATE POLICY "dues_payments_write" ON dues_payments FOR ALL USING (is_treasurer_or_above());

-- Waste Bank
CREATE POLICY "waste_collectors_select" ON waste_collectors FOR SELECT USING (is_authenticated());
CREATE POLICY "waste_collectors_write" ON waste_collectors FOR ALL USING (is_authenticated());
CREATE POLICY "waste_sessions_select" ON waste_collection_sessions FOR SELECT USING (is_authenticated());
CREATE POLICY "waste_sessions_write" ON waste_collection_sessions FOR ALL USING (is_authenticated());
CREATE POLICY "waste_collections_select" ON waste_collections FOR SELECT USING (is_authenticated());
CREATE POLICY "waste_collections_write" ON waste_collections FOR ALL USING (is_authenticated());
CREATE POLICY "waste_items_select" ON waste_collection_items FOR SELECT USING (is_authenticated());
CREATE POLICY "waste_items_write" ON waste_collection_items FOR ALL USING (is_authenticated());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''), -- Mengamankan jika email bernilai null (misal login via no hp)
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User Baru'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'admin' -- Set default role yang lebih aman untuk user baru mendaftar self-signup
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
