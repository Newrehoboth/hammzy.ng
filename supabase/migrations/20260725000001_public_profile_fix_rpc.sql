-- ============================================================================
-- PUBLIC RPC: Allow anyone to fix their own profile by email
-- This is a temporary emergency function - should be removed after issue is resolved
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_emergency_fix_profile(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_username text;
  v_full_name text;
  v_profile_created boolean := false;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
    AND deleted_at IS NULL;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || p_email
    );
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Profile already exists',
      'user_id', v_user_id,
      'action', 'none'
    );
  END IF;
  
  -- Get user metadata
  SELECT 
    COALESCE(
      (raw_user_meta_data->>'username')::text,
      split_part(email, '@', 1),
      'user'
    ),
    COALESCE(
      (raw_user_meta_data->>'full_name')::text,
      (raw_user_meta_data->>'username')::text,
      split_part(email, '@', 1),
      'User'
    )
  INTO v_username, v_full_name
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Create profile
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
    v_user_id,
    v_username,
    p_email,
    v_full_name,
    true,
    0,
    false
  );
  
  v_profile_created := true;
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'user_id', v_user_id,
    'username', v_username,
    'email', p_email,
    'action', 'created'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute to anyone (anon and authenticated users)
GRANT EXECUTE ON FUNCTION public.rpc_emergency_fix_profile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_emergency_fix_profile(text) TO authenticated;

-- Log that function is ready
DO $$
BEGIN
  RAISE NOTICE '✅ Emergency profile fix RPC function created';
  RAISE NOTICE '   Anyone can call: rpc_emergency_fix_profile(email)';
  RAISE NOTICE '   This will auto-create missing profiles';
END $$;
