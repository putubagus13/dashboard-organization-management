-- ============================================================
-- Sync loans and loan payments with cash transactions
-- ============================================================

ALTER TABLE loans
  ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES cash_transactions(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION signed_transaction_amount(p_type transaction_type, p_amount DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF p_type = 'income' THEN
    RETURN p_amount;
  ELSIF p_type = 'expense' THEN
    RETURN -p_amount;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_account_balance() RETURNS TRIGGER AS $$
DECLARE
  old_delta DECIMAL(15,2) := 0;
  new_delta DECIMAL(15,2) := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.deleted_at IS NULL THEN
      UPDATE cash_accounts
      SET balance = balance + signed_transaction_amount(NEW.type, NEW.amount), updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL THEN
      old_delta := signed_transaction_amount(OLD.type, OLD.amount);
    END IF;
    IF NEW.deleted_at IS NULL THEN
      new_delta := signed_transaction_amount(NEW.type, NEW.amount);
    END IF;

    IF OLD.account_id = NEW.account_id THEN
      UPDATE cash_accounts
      SET balance = balance - old_delta + new_delta, updated_at = NOW()
      WHERE id = NEW.account_id;
    ELSE
      UPDATE cash_accounts
      SET balance = balance - old_delta, updated_at = NOW()
      WHERE id = OLD.account_id;

      UPDATE cash_accounts
      SET balance = balance + new_delta, updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.deleted_at IS NULL THEN
      UPDATE cash_accounts
      SET balance = balance - signed_transaction_amount(OLD.type, OLD.amount), updated_at = NOW()
      WHERE id = OLD.account_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_account_balance ON cash_transactions;
CREATE TRIGGER sync_account_balance AFTER INSERT OR UPDATE OR DELETE ON cash_transactions
  FOR EACH ROW EXECUTE FUNCTION update_account_balance();

CREATE OR REPLACE FUNCTION update_loan_after_payment() RETURNS TRIGGER AS $$
DECLARE
  v_loan_id UUID;
  v_total_paid DECIMAL(15,2);
  v_remaining DECIMAL(15,2);
BEGIN
  v_loan_id := COALESCE(NEW.loan_id, OLD.loan_id);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM loan_payments
  WHERE loan_id = v_loan_id AND deleted_at IS NULL;

  SELECT GREATEST(0, principal_amount - v_total_paid)
  INTO v_remaining
  FROM loans
  WHERE id = v_loan_id;

  UPDATE loans
  SET
    total_paid = v_total_paid,
    remaining_amount = v_remaining,
    status = CASE
      WHEN status = 'cancelled' THEN status
      WHEN v_remaining <= 0 THEN 'paid'::loan_status
      ELSE 'active'::loan_status
    END,
    updated_at = NOW()
  WHERE id = v_loan_id;

  RETURN COALESCE(NEW, OLD);
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_loan_payment ON loan_payments;
CREATE TRIGGER after_loan_payment AFTER INSERT OR UPDATE OR DELETE ON loan_payments
  FOR EACH ROW EXECUTE FUNCTION update_loan_after_payment();

CREATE OR REPLACE FUNCTION get_transaction_category_id(p_name TEXT, p_type transaction_type)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
BEGIN
  SELECT id INTO v_category_id
  FROM transaction_categories
  WHERE name = p_name
    AND type = p_type
    AND is_active = TRUE
    AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  RETURN v_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_loan_with_transaction(
  p_borrower_name TEXT,
  p_member_id UUID,
  p_account_id UUID,
  p_principal_amount DECIMAL,
  p_interest_rate DECIMAL,
  p_loan_date DATE,
  p_due_date DATE,
  p_purpose TEXT,
  p_collateral TEXT,
  p_notes TEXT
) RETURNS TABLE (loan_id UUID, transaction_id UUID) AS $$
DECLARE
  v_loan_id UUID;
  v_transaction_id UUID;
  v_category_id UUID;
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk mencatat pinjaman';
  END IF;

  IF NULLIF(TRIM(p_borrower_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama peminjam wajib diisi';
  END IF;

  IF p_principal_amount IS NULL OR p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pinjaman harus lebih dari 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  v_category_id := get_transaction_category_id('Pinjaman Keluar', 'expense');

  INSERT INTO loans (
    borrower_name, member_id, account_id, principal_amount, interest_rate,
    loan_date, due_date, purpose, collateral, notes, approved_by, create_by, update_by
  )
  VALUES (
    TRIM(p_borrower_name),
    p_member_id,
    p_account_id,
    p_principal_amount,
    COALESCE(p_interest_rate, 0),
    COALESCE(p_loan_date, CURRENT_DATE),
    p_due_date,
    NULLIF(TRIM(p_purpose), ''),
    NULLIF(TRIM(p_collateral), ''),
    NULLIF(TRIM(p_notes), ''),
    auth.uid(),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_loan_id;

  INSERT INTO cash_transactions (
    account_id, type, category_id, amount, description, member_id,
    transaction_date, recorded_by, notes, create_by, update_by
  )
  VALUES (
    p_account_id,
    'expense',
    v_category_id,
    p_principal_amount,
    'Pinjaman - ' || TRIM(p_borrower_name),
    p_member_id,
    COALESCE(p_loan_date, CURRENT_DATE),
    auth.uid(),
    NULLIF(TRIM(p_notes), ''),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;

  UPDATE loans
  SET transaction_id = v_transaction_id
  WHERE id = v_loan_id;

  RETURN QUERY SELECT v_loan_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_loan_with_transaction(
  p_loan_id UUID,
  p_borrower_name TEXT,
  p_member_id UUID,
  p_account_id UUID,
  p_principal_amount DECIMAL,
  p_interest_rate DECIMAL,
  p_loan_date DATE,
  p_due_date DATE,
  p_purpose TEXT,
  p_collateral TEXT,
  p_notes TEXT
) RETURNS TABLE (loan_id UUID, transaction_id UUID) AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_transaction_id UUID;
  v_category_id UUID;
  v_total_paid DECIMAL(15,2);
  v_remaining DECIMAL(15,2);
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk mengubah pinjaman';
  END IF;

  SELECT * INTO v_loan
  FROM loans
  WHERE id = p_loan_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_loan.id IS NULL THEN
    RAISE EXCEPTION 'Pinjaman tidak ditemukan';
  END IF;

  IF NULLIF(TRIM(p_borrower_name), '') IS NULL THEN
    RAISE EXCEPTION 'Nama peminjam wajib diisi';
  END IF;

  IF p_principal_amount IS NULL OR p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pinjaman harus lebih dari 0';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM loan_payments
  WHERE loan_id = p_loan_id AND deleted_at IS NULL;

  v_remaining := GREATEST(0, p_principal_amount - v_total_paid);
  v_category_id := get_transaction_category_id('Pinjaman Keluar', 'expense');
  v_transaction_id := v_loan.transaction_id;

  UPDATE loans
  SET
    borrower_name = TRIM(p_borrower_name),
    member_id = p_member_id,
    account_id = p_account_id,
    principal_amount = p_principal_amount,
    interest_rate = COALESCE(p_interest_rate, 0),
    loan_date = COALESCE(p_loan_date, CURRENT_DATE),
    due_date = p_due_date,
    purpose = NULLIF(TRIM(p_purpose), ''),
    collateral = NULLIF(TRIM(p_collateral), ''),
    notes = NULLIF(TRIM(p_notes), ''),
    total_paid = v_total_paid,
    remaining_amount = v_remaining,
    status = CASE
      WHEN status = 'cancelled' THEN status
      WHEN v_remaining <= 0 THEN 'paid'::loan_status
      ELSE 'active'::loan_status
    END,
    update_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_loan_id;

  IF v_transaction_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM cash_transactions WHERE id = v_transaction_id AND deleted_at IS NULL
  ) THEN
    INSERT INTO cash_transactions (
      account_id, type, category_id, amount, description, member_id,
      transaction_date, recorded_by, notes, create_by, update_by
    )
    VALUES (
      p_account_id,
      'expense',
      v_category_id,
      p_principal_amount,
      'Pinjaman - ' || TRIM(p_borrower_name),
      p_member_id,
      COALESCE(p_loan_date, CURRENT_DATE),
      auth.uid(),
      NULLIF(TRIM(p_notes), ''),
      auth.uid(),
      auth.uid()
    )
    RETURNING id INTO v_transaction_id;

    UPDATE loans SET transaction_id = v_transaction_id WHERE id = p_loan_id;
  ELSE
    UPDATE cash_transactions
    SET
      account_id = p_account_id,
      type = 'expense',
      category_id = v_category_id,
      amount = p_principal_amount,
      description = 'Pinjaman - ' || TRIM(p_borrower_name),
      member_id = p_member_id,
      transaction_date = COALESCE(p_loan_date, CURRENT_DATE),
      recorded_by = auth.uid(),
      notes = NULLIF(TRIM(p_notes), ''),
      update_by = auth.uid(),
      updated_at = NOW()
    WHERE id = v_transaction_id;
  END IF;

  RETURN QUERY SELECT p_loan_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION create_loan_payment_with_transaction(
  p_loan_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE,
  p_notes TEXT
) RETURNS TABLE (payment_id UUID, transaction_id UUID) AS $$
DECLARE
  v_loan loans%ROWTYPE;
  v_payment_id UUID;
  v_transaction_id UUID;
  v_category_id UUID;
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk mencatat pembayaran pinjaman';
  END IF;

  SELECT * INTO v_loan
  FROM loans
  WHERE id = p_loan_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_loan.id IS NULL THEN
    RAISE EXCEPTION 'Pinjaman tidak ditemukan';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran harus lebih dari 0';
  END IF;

  IF p_amount > COALESCE(v_loan.remaining_amount, v_loan.principal_amount) THEN
    RAISE EXCEPTION 'Jumlah pembayaran melebihi sisa pinjaman';
  END IF;

  v_category_id := get_transaction_category_id('Cicilan Pinjaman', 'income');

  INSERT INTO cash_transactions (
    account_id, type, category_id, amount, description, member_id,
    transaction_date, recorded_by, notes, create_by, update_by
  )
  VALUES (
    v_loan.account_id,
    'income',
    v_category_id,
    p_amount,
    'Pembayaran Pinjaman - ' || v_loan.borrower_name,
    v_loan.member_id,
    COALESCE(p_payment_date, CURRENT_DATE),
    auth.uid(),
    NULLIF(TRIM(p_notes), ''),
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO loan_payments (
    loan_id, amount, payment_date, notes, recorded_by, transaction_id, create_by, update_by
  )
  VALUES (
    p_loan_id,
    p_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(TRIM(p_notes), ''),
    auth.uid(),
    v_transaction_id,
    auth.uid(),
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT v_payment_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION soft_delete_loan_with_transactions(
  p_loan_id UUID
) RETURNS VOID AS $$
DECLARE
  v_loan loans%ROWTYPE;
BEGIN
  IF NOT is_treasurer_or_above() THEN
    RAISE EXCEPTION 'Tidak memiliki akses untuk menghapus pinjaman';
  END IF;

  SELECT * INTO v_loan
  FROM loans
  WHERE id = p_loan_id AND deleted_at IS NULL
  FOR UPDATE;

  IF v_loan.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE cash_transactions
  SET deleted_at = NOW(), deleted_by = auth.uid(), update_by = auth.uid(), updated_at = NOW()
  WHERE id = v_loan.transaction_id AND deleted_at IS NULL;

  UPDATE cash_transactions
  SET deleted_at = NOW(), deleted_by = auth.uid(), update_by = auth.uid(), updated_at = NOW()
  WHERE id IN (
    SELECT transaction_id
    FROM loan_payments
    WHERE loan_id = p_loan_id AND transaction_id IS NOT NULL AND deleted_at IS NULL
  )
  AND deleted_at IS NULL;

  UPDATE loan_payments
  SET deleted_at = NOW(), deleted_by = auth.uid(), update_by = auth.uid()
  WHERE loan_id = p_loan_id AND deleted_at IS NULL;

  UPDATE loans
  SET deleted_at = NOW(), deleted_by = auth.uid(), update_by = auth.uid(), updated_at = NOW()
  WHERE id = p_loan_id AND deleted_at IS NULL;
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

  v_category_id := get_transaction_category_id('Donasi', 'income');

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

  SELECT id
  INTO v_transaction_id
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
