-- Emergency fix for rehobothekene@gmail.com account
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn/sql/new

-- Step 1: Find your user ID
-- Replace 'YOUR_USER_ID_HERE' below with the actual ID from this query:
SELECT id, email, created_at FROM auth.users WHERE email = 'rehobothekene@gmail.com';

-- Step 2: Create/fix your profile (REPLACE 'YOUR_USER_ID_HERE' with actual ID from Step 1)
INSERT INTO public.profiles (
  id, 
  username, 
  email, 
  full_name, 
  email_verified, 
  wallet_balance, 
  suspended,
  phone
)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user ID
  'topper',
  'rehobothekene@gmail.com',
  'Ekene',
  true,
  0,
  false,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = now();

-- Step 3: Ensure user role exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'user')  -- Replace with your actual user ID
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 4: Verify profile was created
SELECT 
  id,
  username,
  email,
  full_name,
  wallet_balance,
  pocketfi_account_number,
  created_at
FROM public.profiles 
WHERE email = 'rehobothekene@gmail.com';

-- You should see your profile with all fields populated
