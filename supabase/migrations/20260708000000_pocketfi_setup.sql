-- Rename paystack_payments table to payments if it exists, otherwise create it
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'paystack_payments') THEN
    ALTER TABLE public.paystack_payments RENAME TO payments;
  ELSE
    CREATE TABLE IF NOT EXISTS public.payments (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id uuid NOT NULL,
      reference text NOT NULL UNIQUE,
      amount numeric NOT NULL,
      status text NOT NULL DEFAULT 'success',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END
$$;

-- Add PocketFi virtual account columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS pocketfi_bank_name text,
  ADD COLUMN IF NOT EXISTS pocketfi_account_number text,
  ADD COLUMN IF NOT EXISTS pocketfi_account_name text;

-- Create/update RPC verification function to use payments table
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
  FROM public.payments
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
  INSERT INTO public.payments (user_id, reference, amount, status)
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
