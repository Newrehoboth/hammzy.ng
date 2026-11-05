-- Create a security definer RPC function to process PocketFi payments.
-- Bypasses RLS to find the user and credit their wallet atomically.
CREATE OR REPLACE FUNCTION public.rpc_process_webhook_payment(
  p_reference text,
  p_amount numeric,
  p_account_number text,
  p_email text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_new_balance numeric;
  v_existing_payment uuid;
BEGIN
  -- 1. Find user by account number
  IF p_account_number IS NOT NULL AND p_account_number <> '' THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE pocketfi_account_number = p_account_number
    LIMIT 1;
  END IF;

  -- 2. Fallback to email
  IF v_user_id IS NULL AND p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE email = p_email
    LIMIT 1;
  END IF;

  -- 3. If no user found, return -1
  IF v_user_id IS NULL THEN
    RETURN -1;
  END IF;

  -- 4. Check if this payment reference was already processed
  SELECT id INTO v_existing_payment
  FROM public.payments
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_payment IS NOT NULL THEN
    -- Payment already processed, return current balance
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = v_user_id;
    
    RETURN v_new_balance;
  END IF;

  -- 5. Insert payment record
  INSERT INTO public.payments (user_id, reference, amount, status)
  VALUES (v_user_id, p_reference, p_amount, 'success');

  -- 6. Credit the wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = v_user_id
  RETURNING wallet_balance INTO v_new_balance;

  RETURN v_new_balance;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle concurrent transactions
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = v_user_id;
    
    RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_process_webhook_payment TO anon, authenticated;
