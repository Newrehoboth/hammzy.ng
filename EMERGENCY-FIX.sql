-- ============================================================================
-- EMERGENCY FIX: Run this in Supabase SQL Editor IMMEDIATELY
-- ============================================================================
-- Problem: handle_new_user trigger is broken - new users can't get profiles
-- Solution: This script recreates the trigger and fixes all existing users
-- ============================================================================

-- 1. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    true,
    0,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix all existing users without profiles
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
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL AND u.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure all users have roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Show results
SELECT 
  (SELECT COUNT(*) FROM auth.users WHERE deleted_at IS NULL) as total_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM auth.users u LEFT JOIN public.profiles p ON u.id = p.id WHERE p.id IS NULL AND u.deleted_at IS NULL) as missing_profiles;
