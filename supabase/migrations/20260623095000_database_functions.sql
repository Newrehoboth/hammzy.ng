-- Database functions to verify email and reset passwords securely without exposing service_role key
-- Create pgcrypto extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 1. Create signup verification code
CREATE OR REPLACE FUNCTION public.rpc_create_signup_code(
  p_email text,
  p_code text,
  p_expires_at timestamptz
)
RETURNS TABLE (already_verified boolean, profile_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_verified boolean;
  v_email text;
BEGIN
  -- Check if profile exists and get email_verified state
  SELECT email_verified, email INTO v_verified, v_email
  FROM public.profiles
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'No account found for this email';
  END IF;

  IF v_verified = true THEN
    RETURN QUERY SELECT true, v_email;
    RETURN;
  END IF;

  -- Insert the code
  INSERT INTO public.verification_codes (email, code, purpose, expires_at)
  VALUES (v_email, p_code, 'signup', p_expires_at);

  RETURN QUERY SELECT false, v_email;
END;
$$;

-- 2. Verify signup code and confirm email
CREATE OR REPLACE FUNCTION public.rpc_verify_signup_code(
  p_email text,
  p_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_expires_at timestamptz;
BEGIN
  -- Find the latest unused code
  SELECT id, expires_at INTO v_id, v_expires_at
  FROM public.verification_codes
  WHERE lower(email) = lower(p_email)
    AND purpose = 'signup'
    AND code = p_code
    AND used = false
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invalid verification code';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'This code has expired';
  END IF;

  -- Mark code as used
  UPDATE public.verification_codes
  SET used = true
  WHERE id = v_id;

  -- Verify profile
  UPDATE public.profiles
  SET email_verified = true
  WHERE lower(email) = lower(p_email);

  RETURN true;
END;
$$;

-- 3. Create password reset token
CREATE OR REPLACE FUNCTION public.rpc_create_reset_token(
  p_email text,
  p_expires_at timestamptz
)
RETURNS TABLE (token uuid, profile_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_email text;
  v_token uuid;
BEGIN
  -- Check if profile exists
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_email IS NOT NULL THEN
    INSERT INTO public.verification_codes (email, code, purpose, expires_at)
    VALUES (v_email, 'reset', 'reset', p_expires_at)
    RETURNING public.verification_codes.token INTO v_token;
    
    RETURN QUERY SELECT v_token, v_email;
  END IF;
END;
$$;

-- 4. Complete password reset with token
CREATE OR REPLACE FUNCTION public.rpc_reset_password_with_token(
  p_token uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, extensions
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_expires_at timestamptz;
  v_used boolean;
  v_user_id uuid;
BEGIN
  -- Find the token
  SELECT id, email, expires_at, used INTO v_id, v_email, v_expires_at, v_used
  FROM public.verification_codes
  WHERE token = p_token
    AND purpose = 'reset'
  LIMIT 1;

  IF v_id IS NULL OR v_used = true THEN
    RAISE EXCEPTION 'This reset link is invalid or already used';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'This reset link has expired';
  END IF;

  -- Find profile ID
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  -- Update auth.users password using bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = v_user_id;

  -- Mark token as used
  UPDATE public.verification_codes
  SET used = true
  WHERE id = v_id;

  RETURN true;
END;
$$;

-- Grant execute permissions to public/anon users
GRANT EXECUTE ON FUNCTION public.rpc_create_signup_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_verify_signup_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_reset_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reset_password_with_token TO anon, authenticated;
