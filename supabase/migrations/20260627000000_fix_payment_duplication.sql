-- Create the missing payment verification RPC function
-- This prevents duplicate crediting by using UNIQUE constraint on reference
CREATE OR REPLACE FUNCTION public.rpc_verify_and_credit_payment(
  p_reference text,
  p_amount numeric,
  p_user_id uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_new_balance numeric;
  v_existing_payment uuid;
BEGIN
  -- Check if this payment reference was already processed
  SELECT id INTO v_existing_payment
  FROM public.paystack_payments
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_payment IS NOT NULL THEN
    -- Payment already processed, return current balance without crediting again
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN v_new_balance;
  END IF;

  -- Insert payment record (UNIQUE constraint on reference prevents duplicates)
  INSERT INTO public.paystack_payments (user_id, reference, amount, status)
  VALUES (p_user_id, p_reference, p_amount, 'success');

  -- Credit the wallet
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  RETURN v_new_balance;
EXCEPTION
  WHEN unique_violation THEN
    -- Another concurrent transaction already processed this payment
    -- Return current balance without crediting again
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = p_user_id;
    
    RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_verify_and_credit_payment TO authenticated;

-- Now let's fix any users who have been double-credited
-- This script identifies and fixes users with duplicate payments

-- First, let's create a temporary table to track legitimate vs duplicate credits
CREATE TEMP TABLE payment_analysis AS
SELECT 
  pp.user_id,
  pp.reference,
  pp.amount,
  pp.created_at,
  ROW_NUMBER() OVER (PARTITION BY pp.reference ORDER BY pp.created_at) as occurrence
FROM public.paystack_payments pp
ORDER BY pp.user_id, pp.reference, pp.created_at;

-- Calculate how much each user was over-credited
CREATE TEMP TABLE overcredit_amounts AS
SELECT 
  user_id,
  SUM(amount) as total_overcredit
FROM payment_analysis
WHERE occurrence > 1
GROUP BY user_id;

-- Deduct the over-credited amounts from user wallets
UPDATE public.profiles p
SET wallet_balance = wallet_balance - oa.total_overcredit
FROM overcredit_amounts oa
WHERE p.id = oa.user_id
  AND wallet_balance >= oa.total_overcredit; -- Only deduct if they have enough balance

-- Log which users were corrected (for admin reference)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT user_id, total_overcredit FROM overcredit_amounts LOOP
    RAISE NOTICE 'Corrected user % - deducted ₦%', r.user_id, r.total_overcredit;
  END LOOP;
END $$;

-- Delete duplicate payment records (keep only the first occurrence)
DELETE FROM public.paystack_payments
WHERE (user_id, reference, created_at) IN (
  SELECT user_id, reference, created_at
  FROM payment_analysis
  WHERE occurrence > 1
);
