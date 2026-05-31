-- ============================================================
-- Update donor and keep the linked donation transaction in sync
-- ============================================================

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
  WHERE id = p_donor_id
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
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  SELECT id INTO v_category_id
  FROM transaction_categories
  WHERE name = 'Donasi' AND type = 'income' AND is_active = TRUE
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
    updated_at = NOW()
  WHERE id = p_donor_id;

  SELECT id, account_id, amount
  INTO v_transaction_id, v_old_account_id, v_old_amount
  FROM cash_transactions AS ct
  WHERE ct.donor_id = p_donor_id AND ct.type = 'income'
  ORDER BY ct.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_transaction_id IS NULL THEN
    INSERT INTO cash_transactions (
      account_id,
      type,
      category_id,
      amount,
      description,
      donor_id,
      transaction_date,
      recorded_by,
      notes
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
      NULLIF(TRIM(p_notes), '')
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
      updated_at = NOW()
    WHERE id = v_transaction_id;
  END IF;

  RETURN QUERY SELECT p_donor_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
