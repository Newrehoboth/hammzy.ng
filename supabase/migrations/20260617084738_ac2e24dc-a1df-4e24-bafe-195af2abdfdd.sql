CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "Users view own profile" ON public.profiles
  USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users update own profile" ON public.profiles
  USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Admins delete profiles" ON public.profiles
  USING (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users view own roles" ON public.user_roles
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users manage own orders" ON public.orders
  USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;