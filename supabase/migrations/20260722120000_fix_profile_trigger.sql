-- ============================================================================
-- FIX: Recreate handle_new_user trigger (it's broken/missing)
-- ============================================================================
-- This trigger should auto-create profiles for new users but it's not working
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function (in case it's missing or corrupted)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_email_signup boolean;
BEGIN
  -- Log that trigger is firing
  RAISE LOG 'handle_new_user trigger fired for user %', NEW.id;

  is_email_signup := COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email') = 'email'
                     AND lower(NEW.email) NOT IN ('admin@gmail.com', 'hammzydigital@gmail.com');

  -- Create profile
  INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1), 'user'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1), 'User'),
    NOT is_email_signup, -- Email signups need verification
    0, -- Starting balance
    false -- Not suspended
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  -- Create user role
  IF lower(NEW.email) IN ('admin@gmail.com', 'hammzydigital@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RAISE LOG 'Profile created successfully for user %', NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block user creation
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger exists
DO $$
DECLARE
  trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';
    
  IF trigger_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Trigger on_auth_user_created is active';
  ELSE
    RAISE WARNING 'FAILED: Trigger was not created!';
  END IF;
END $$;

-- Also fix any existing users without profiles
INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user'),
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'User'),
  CASE 
    WHEN COALESCE(u.raw_app_meta_data->>'provider', 'email') = 'email' 
      AND lower(u.email) NOT IN ('admin@gmail.com', 'hammzydigital@gmail.com')
    THEN (u.confirmed_at IS NOT NULL)
    ELSE true
  END,
  0,
  false
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
  AND u.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure all profiles have user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  CASE 
    WHEN lower(p.email) IN ('admin@gmail.com', 'hammzydigital@gmail.com') THEN 'admin'
    ELSE 'user'
  END
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Report results
DO $$
DECLARE
  missing_profiles integer;
  missing_roles integer;
BEGIN
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL AND u.deleted_at IS NULL;
  
  SELECT COUNT(*) INTO missing_roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON p.id = ur.user_id
  WHERE ur.user_id IS NULL;
  
  RAISE NOTICE 'Fixed % users without profiles', missing_profiles;
  RAISE NOTICE 'Fixed % profiles without roles', missing_roles;
END $$;
