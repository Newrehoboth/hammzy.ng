-- Quick fix for user a9de2493-0ea0-4d79-b07d-427089f51bd5
-- This user's profile is missing from the profiles table

-- Create the missing profile
INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user'),
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User'),
  true,
  0,
  false
FROM auth.users u
WHERE u.id = 'a9de2493-0ea0-4d79-b07d-427089f51bd5'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- Ensure user role exists
INSERT INTO public.user_roles (user_id, role)
VALUES ('a9de2493-0ea0-4d79-b07d-427089f51bd5', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify the fix
SELECT id, username, email, full_name, wallet_balance 
FROM public.profiles 
WHERE id = 'a9de2493-0ea0-4d79-b07d-427089f51bd5';
