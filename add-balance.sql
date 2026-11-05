-- Add 2000 NGN to rehobothekene@gmail.com wallet
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'rehobothekene@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get current balance
  SELECT wallet_balance INTO v_current_balance
  FROM profiles
  WHERE id = v_user_id;
  
  -- Add 2000
  v_new_balance := v_current_balance + 2000;
  
  -- Update balance
  UPDATE profiles
  SET wallet_balance = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Added 2000 NGN to wallet';
  RAISE NOTICE 'Previous balance: %', v_current_balance;
  RAISE NOTICE 'New balance: %', v_new_balance;
END $$;

-- Verify
SELECT 
  email,
  wallet_balance,
  updated_at
FROM profiles
WHERE email = 'rehobothekene@gmail.com';
