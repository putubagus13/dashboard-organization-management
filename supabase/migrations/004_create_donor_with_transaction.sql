-- ============================================================
-- Create donor and donation transaction atomically
-- ============================================================

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
    SELECT 1 FROM cash_accounts WHERE id = p_account_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Rekening tidak valid atau tidak aktif';
  END IF;

  SELECT id INTO v_category_id
  FROM transaction_categories
  WHERE name = 'Donasi' AND type = 'income' AND is_active = TRUE
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO donors (name, phone, email, address, notes, total_donated)
  VALUES (
    TRIM(p_name),
    NULLIF(TRIM(p_phone), ''),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_address), ''),
    NULLIF(TRIM(p_notes), ''),
    p_amount
  )
  RETURNING id INTO v_donor_id;

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
    v_donor_id,
    CURRENT_DATE,
    auth.uid(),
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_donor_id, v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
