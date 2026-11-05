-- Update the handle_new_user function to check for hammzydigital@gmail.com instead of admin@gmail.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_email_signup boolean;
BEGIN
  is_email_signup := COALESCE(NEW.raw_app_meta_data ->> 'provider', 'email') = 'email'
                     AND lower(NEW.email) <> lower('hammzydigital@gmail.com');

  INSERT INTO public.profiles (id, username, email, full_name, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NOT is_email_signup
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, public.profiles.username),
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  IF lower(NEW.email) = lower('hammzydigital@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Helper function to ensure hammzydigital@gmail.com exists and is admin
CREATE OR REPLACE FUNCTION public.ensure_hammzy_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM auth.users
  WHERE lower(email) = lower('hammzydigital@gmail.com')
  LIMIT 1;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    )
    VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'hammzydigital@gmail.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"admin"}'::jsonb,
      now(),
      now(),
      false,
      false
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('admin123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now(),
        deleted_at = NULL,
        banned_until = NULL,
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"username":"admin","full_name":"admin"}'::jsonb,
        is_sso_user = false,
        is_anonymous = false
    WHERE id = admin_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    admin_id::text,
    admin_id,
    jsonb_build_object(
      'sub', admin_id::text,
      'email', 'hammzydigital@gmail.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  INSERT INTO public.profiles (id, username, email, full_name, suspended, email_verified)
  VALUES (admin_id, 'admin', 'hammzydigital@gmail.com', 'admin', false, true)
  ON CONFLICT (id) DO UPDATE SET
    username = 'admin',
    email = 'hammzydigital@gmail.com',
    full_name = 'admin',
    suspended = false,
    email_verified = true,
    updated_at = now();

  -- Set role to admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Clean up user role for hammzydigital
  DELETE FROM public.user_roles
  WHERE role = 'user' AND user_id = admin_id;
END;
$$;

SELECT public.ensure_hammzy_admin();
DROP FUNCTION public.ensure_hammzy_admin();

-- Demote admin@gmail.com if they have an admin role
DELETE FROM public.user_roles
WHERE role = 'admin' AND user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('admin@gmail.com')
);

-- Ensure user_roles has 'user' role for admin@gmail.com instead
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user' FROM auth.users WHERE lower(email) = lower('admin@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- If hammzydigital@gmail.com has been promoted to admin, remove their user role to keep it clean
DELETE FROM public.user_roles
WHERE role = 'user' AND user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('hammzydigital@gmail.com')
);
