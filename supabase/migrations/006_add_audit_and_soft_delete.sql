-- ============================================================
-- Audit fields and soft delete support
-- ============================================================

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'member_status_types',
    'members',
    'cash_accounts',
    'transaction_categories',
    'donors',
    'cash_transactions',
    'loans',
    'loan_payments',
    'meetings',
    'attendance',
    'dues_settings',
    'dues_payments',
    'points_config',
    'waste_collectors',
    'waste_types',
    'waste_collection_sessions',
    'waste_collections',
    'waste_collection_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS create_by UUID REFERENCES profiles(id)', table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS update_by UUID REFERENCES profiles(id)', table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id)', table_name);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ', table_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON %I(deleted_at)', table_name, table_name);
  END LOOP;
END $$;

-- Keep legacy audit columns populated while new code migrates to create_by.
UPDATE meetings SET create_by = created_by WHERE create_by IS NULL AND created_by IS NOT NULL;
UPDATE dues_settings SET create_by = created_by WHERE create_by IS NULL AND created_by IS NOT NULL;
UPDATE waste_collection_sessions SET create_by = created_by WHERE create_by IS NULL AND created_by IS NOT NULL;
UPDATE cash_transactions SET create_by = recorded_by WHERE create_by IS NULL AND recorded_by IS NOT NULL;
UPDATE loan_payments SET create_by = recorded_by WHERE create_by IS NULL AND recorded_by IS NOT NULL;
UPDATE attendance SET create_by = recorded_by WHERE create_by IS NULL AND recorded_by IS NOT NULL;
UPDATE dues_payments SET create_by = recorded_by WHERE create_by IS NULL AND recorded_by IS NOT NULL;
UPDATE waste_collections SET create_by = recorded_by WHERE create_by IS NULL AND recorded_by IS NOT NULL;

CREATE OR REPLACE FUNCTION update_account_balance() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      IF NEW.type = 'income' THEN UPDATE cash_accounts SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
      ELSIF NEW.type = 'expense' THEN UPDATE cash_accounts SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      IF OLD.type = 'income' THEN UPDATE cash_accounts SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
      ELSIF OLD.type = 'expense' THEN UPDATE cash_accounts SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
      END IF;
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      IF NEW.type = 'income' THEN UPDATE cash_accounts SET balance = balance + NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
      ELSIF NEW.type = 'expense' THEN UPDATE cash_accounts SET balance = balance - NEW.amount, updated_at = NOW() WHERE id = NEW.account_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      IF OLD.type = 'income' THEN UPDATE cash_accounts SET balance = balance - OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
      ELSIF OLD.type = 'expense' THEN UPDATE cash_accounts SET balance = balance + OLD.amount, updated_at = NOW() WHERE id = OLD.account_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_account_balance ON cash_transactions;
CREATE TRIGGER sync_account_balance AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

CREATE OR REPLACE FUNCTION sync_member_activity_points() RETURNS TRIGGER AS $$
BEGIN
  UPDATE members SET
    activity_points = (
      SELECT COALESCE(SUM(points_earned), 0)
      FROM attendance
      WHERE member_id = COALESCE(NEW.member_id, OLD.member_id)
        AND deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.member_id, OLD.member_id);
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_waste_totals() RETURNS TRIGGER AS $$
DECLARE
  v_cid UUID; v_sid UUID;
  v_tw DECIMAL(12,3); v_te DECIMAL(15,2);
BEGIN
  v_cid := COALESCE(NEW.collection_id, OLD.collection_id);
  SELECT COALESCE(SUM(weight),0), COALESCE(SUM(subtotal),0)
    INTO v_tw, v_te
  FROM waste_collection_items
  WHERE collection_id = v_cid AND deleted_at IS NULL;

  UPDATE waste_collections SET total_weight = v_tw, total_earnings = v_te, updated_at = NOW()
  WHERE id = v_cid RETURNING session_id INTO v_sid;

  SELECT COALESCE(SUM(total_weight),0), COALESCE(SUM(total_earnings),0)
    INTO v_tw, v_te
  FROM waste_collections
  WHERE session_id = v_sid AND deleted_at IS NULL;

  UPDATE waste_collection_sessions SET total_weight = v_tw, total_earnings = v_te, updated_at = NOW()
  WHERE id = v_sid;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_collector_totals() RETURNS TRIGGER AS $$
DECLARE v_coll_id UUID;
BEGIN
  v_coll_id := COALESCE(NEW.collector_id, OLD.collector_id);
  UPDATE waste_collectors SET
    total_weight = (SELECT COALESCE(SUM(total_weight),0) FROM waste_collections WHERE collector_id = v_coll_id AND deleted_at IS NULL),
    total_earnings = (SELECT COALESCE(SUM(total_earnings),0) FROM waste_collections WHERE collector_id = v_coll_id AND deleted_at IS NULL),
    updated_at = NOW()
  WHERE id = v_coll_id;
  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_activity_points ON attendance;
CREATE TRIGGER sync_activity_points AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION sync_member_activity_points();

DROP TRIGGER IF EXISTS sync_waste_totals ON waste_collection_items;
CREATE TRIGGER sync_waste_totals AFTER INSERT OR UPDATE OR DELETE ON waste_collection_items
  FOR EACH ROW EXECUTE FUNCTION sync_waste_totals();

DROP TRIGGER IF EXISTS sync_collector_totals ON waste_collections;
CREATE TRIGGER sync_collector_totals AFTER INSERT OR UPDATE OR DELETE ON waste_collections
  FOR EACH ROW EXECUTE FUNCTION sync_collector_totals();

CREATE OR REPLACE FUNCTION create_donor_with_transaction(
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_notes TEXT,
  p_amount DECIMAL,
  p_account_id UUID
) RETURNS TABLE (donor_id UUID, transaction_id UUID) AS $$
DECLARE
  v_donor_id UUID;
  v_transaction_id UUID;
  v_category_id UUID;
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk mencatat donasi';
  END IF;

  IF NULLIF(TRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama donatur wajib diisi';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal donasi harus lebih dari 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  SELECT id INTO v_category_id
  FROM transaction_categories
  WHERE name = 'Donasi' AND type = 'income' AND is_active = TRUE AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO donors (name, phone, email, address, notes, total_donated, create_by, update_by)
  VALUES (
    TRIM(p_name),
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_address), ''),
    NULLIF(TRIM(p_notes), ''),
    p_amount,
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_donor_id;

  INSERT INTO cash_transactions (
    account_id, type, category_id, amount, description, donor_id,
    transaction_date, recorded_by, notes, create_by, update_by
  )
  VALUES (
    p_account_id,
    'income',
    v_category_id,
    p_amount,
    'Donasi - ' || TRIM(p_name),
    v_donor_id,
    CURRENT_DATE,
    auth.uid(),
    NULLIF(TRIM(p_notes), ''),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_donor_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_donor_with_transaction(
  p_donor_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_address TEXT,
  p_notes TEXT,
  p_amount DECIMAL,
  p_account_id UUID
) RETURNS TABLE (donor_id UUID, transaction_id UUID) AS $$
DECLARE
  v_donor_id UUID;
  v_transaction_id UUID;
  v_category_id UUID;
  v_old_account_id UUID;
  v_old_amount DECIMAL(15,2);
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk mengubah donasi';
  END IF;

  SELECT id INTO v_donor_id
  FROM donors
  WHERE id = p_donor_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_donor_id IS NULL THEN
    RAISE EXCEPTION 'Donatur tidak ditemukan';
  END IF;

  IF NULLIF(TRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama donatur wajib diisi';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal donasi harus lebih dari 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  SELECT id INTO v_category_id
  FROM transaction_categories
  WHERE name = 'Donasi' AND type = 'income' AND is_active = TRUE AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  UPDATE donors
  SET
    name = TRIM(p_name),
    phone = NULLIF(TRIM(p_phone), ''),
    email = NULLIF(TRIM(p_email), ''),
    address = NULLIF(TRIM(p_address), ''),
    notes = NULLIF(TRIM(p_notes), ''),
    total_donated = p_amount,
    update_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_donor_id;

  SELECT id, account_id, amount
  INTO v_transaction_id, v_old_account_id, v_old_amount
  FROM cash_transactions AS ct
  WHERE ct.donor_id = p_donor_id AND ct.type = 'income' AND ct.deleted_at IS NULL
  ORDER BY ct.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_transaction_id IS NULL THEN
    INSERT INTO cash_transactions (
      account_id, type, category_id, amount, description, donor_id,
      transaction_date, recorded_by, notes, create_by, update_by
    )
    VALUES (
      p_account_id,
      'income',
      v_category_id,
      p_amount,
      'Donasi - ' || TRIM(p_name),
      p_donor_id,
      CURRENT_DATE,
      auth.uid(),
      NULLIF(TRIM(p_notes), ''),
      auth.uid(),
      auth.uid()
    )
    RETURNING id INTO v_transaction_id;
  ELSE
    IF v_old_account_id = p_account_id THEN
      UPDATE cash_accounts
      SET balance = balance - v_old_amount + p_amount, updated_at = NOW()
      WHERE id = p_account_id;
    ELSE
      UPDATE cash_accounts
      SET balance = balance - v_old_amount, updated_at = NOW()
      WHERE id = v_old_account_id;

      UPDATE cash_accounts
      SET balance = balance + p_amount, updated_at = NOW()
      WHERE id = p_account_id;
    END IF;

    UPDATE cash_transactions
    SET
      account_id = p_account_id,
      category_id = v_category_id,
      amount = p_amount,
      description = 'Donasi - ' || TRIM(p_name),
      notes = NULLIF(TRIM(p_notes), ''),
      update_by = auth.uid(),
      updated_at = NOW()
    WHERE id = v_transaction_id;
  END IF;

  RETURN QUERY SELECT p_donor_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
