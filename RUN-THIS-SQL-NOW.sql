-- ⚡ EMERGENCY FIX - Run this SQL in Supabase NOW
-- Go to: https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn/sql/new
-- Copy and paste this entire file, then click RUN

-- This will fix your profile issue immediately

DO $$
DECLARE
  user_id_var uuid;
  profile_exists boolean;
BEGIN
  -- Step 1: Find your user ID
  RAISE NOTICE '=== STEP 1: Finding your account ===';
  
  SELECT id INTO user_id_var 
  FROM auth.users 
  WHERE email = 'rehobothekene@gmail.com';
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION '❌ ERROR: No auth user found with email rehobothekene@gmail.com';
  END IF;
  
  RAISE NOTICE '✅ Found user ID: %', user_id_var;
  
  -- Step 2: Check if profile already exists
  RAISE NOTICE '=== STEP 2: Checking for existing profile ===';
  
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE id = user_id_var
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RAISE NOTICE '⚠️  Profile already exists, updating it...';
    
    -- Update existing profile
    UPDATE public.profiles SET
      username = 'topper',
      email = 'rehobothekene@gmail.com',
      full_name = 'Ekene',
      email_verified = true,
      updated_at = now()
    WHERE id = user_id_var;
    
    RAISE NOTICE '✅ Profile updated successfully';
  ELSE
    RAISE NOTICE '📝 Profile does not exist, creating it...';
    
    -- Create new profile
    INSERT INTO public.profiles (
      id, 
      username, 
      email, 
      full_name, 
      email_verified, 
      wallet_balance, 
      suspended
    )
    VALUES (
      user_id_var,
      'topper',
      'rehobothekene@gmail.com',
      'Ekene',
      true,
      0,
      false
    );
    
    RAISE NOTICE '✅ Profile created successfully';
  END IF;
  
  -- Step 3: Ensure user role exists
  RAISE NOTICE '=== STEP 3: Setting up user role ===';
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_var, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE '✅ User role ensured';
  
  -- Step 4: Show final result
  RAISE NOTICE '=== ✅ SUCCESS! Your profile is ready ===';
  RAISE NOTICE 'User ID: %', user_id_var;
  RAISE NOTICE 'Email: rehobothekene@gmail.com';
  RAISE NOTICE 'Username: topper';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)';
  RAISE NOTICE '2. Logout from https://www.hammzy.ng';
  RAISE NOTICE '3. Login again with your email and password';
  RAISE NOTICE '4. Go to Dashboard → Add Funds';
  RAISE NOTICE '5. Should work now! 🎉';
  
END $$;

-- Verify the profile was created
SELECT 
  '✅ YOUR PROFILE:' as status,
  id,
  username,
  email,
  full_name,
  wallet_balance,
  email_verified,
  suspended,
  created_at,
  updated_at
FROM public.profiles 
WHERE email = 'rehobothekene@gmail.com';

-- If you see your profile data above, you're all set!
-- Just follow the NEXT STEPS and it will work!
