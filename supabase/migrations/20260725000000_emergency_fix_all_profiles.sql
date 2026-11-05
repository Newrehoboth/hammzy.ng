-- ============================================================================
-- EMERGENCY FIX: Auto-create missing profiles for ALL users
-- This will fix the "profile missing" error immediately on deployment
-- ============================================================================

-- Fix all existing users who don't have profiles
INSERT INTO public.profiles (
  id, 
  username, 
  email, 
  full_name, 
  email_verified, 
  wallet_balance, 
  suspended
)
SELECT 
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username', 
    split_part(u.email, '@', 1), 
    'user'
  ) as username,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1),
    'User'
  ) as full_name,
  true as email_verified,  -- Set all to verified since they can login
  0 as wallet_balance,
  false as suspended
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL  -- Only users without profiles
  AND u.deleted_at IS NULL  -- Only active users
ON CONFLICT (id) DO NOTHING;

-- Ensure all profiles have user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  CASE 
    WHEN lower(p.email) IN ('admin@gmail.com', 'hammzydigital@gmail.com') THEN 'admin'
    ELSE 'user'
  END as role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Log results
DO $$
DECLARE
  profiles_created integer;
  roles_created integer;
BEGIN
  -- Count how many we just fixed
  SELECT COUNT(*) INTO profiles_created
  FROM auth.users u
  INNER JOIN public.profiles p ON u.id = p.id
  WHERE p.created_at > (now() - interval '5 seconds');
  
  SELECT COUNT(*) INTO roles_created
  FROM public.user_roles ur
  WHERE ur.created_at > (now() - interval '5 seconds');
  
  RAISE NOTICE '✅ Emergency fix complete!';
  RAISE NOTICE '   - Profiles ensured: %', profiles_created;
  RAISE NOTICE '   - User roles ensured: %', roles_created;
  RAISE NOTICE '   - All users should now be able to use PocketFi deposits';
END $$;
