-- Add email verification flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Existing users should not be locked out
UPDATE public.profiles SET email_verified = true;

-- Verification + password reset codes
CREATE TABLE public.verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code text NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  purpose text NOT NULL CHECK (purpose IN ('signup', 'reset')),
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_email ON public.verification_codes (lower(email), purpose);
CREATE INDEX idx_verification_codes_token ON public.verification_codes (token);

GRANT ALL ON public.verification_codes TO service_role;

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
-- No policies: only reachable via the service role inside server functions.

-- New signups: verified automatically for OAuth/admin, must verify for email/password
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
                     AND lower(NEW.email) <> lower('admin@gmail.com');

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

  IF lower(NEW.email) = lower('admin@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;