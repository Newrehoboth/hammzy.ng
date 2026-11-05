
-- Wallet balance on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance numeric NOT NULL DEFAULT 0;

-- ============ log_products ============
CREATE TABLE public.log_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  subcategory text,
  type text NOT NULL,
  account_name text,
  followers text,
  price numeric NOT NULL DEFAULT 0,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.log_products TO authenticated;
GRANT ALL ON public.log_products TO service_role;
ALTER TABLE public.log_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can view log products"
  ON public.log_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage log products"
  ON public.log_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_log_products_updated_at
  BEFORE UPDATE ON public.log_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ log_items (raw credentials, admin-only) ============
CREATE TABLE public.log_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.log_products(id) ON DELETE CASCADE,
  credential text NOT NULL,
  sold boolean NOT NULL DEFAULT false,
  sold_to uuid,
  sold_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_items_product ON public.log_items(product_id);
CREATE INDEX idx_log_items_unsold ON public.log_items(product_id) WHERE sold = false;

GRANT ALL ON public.log_items TO service_role;
ALTER TABLE public.log_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage log items"
  ON public.log_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ log_purchases ============
CREATE TABLE public.log_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid,
  item_id uuid,
  platform text,
  type text,
  credential text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_purchases_user ON public.log_purchases(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.log_purchases TO authenticated;
GRANT ALL ON public.log_purchases TO service_role;
ALTER TABLE public.log_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own log purchases"
  ON public.log_purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- ============ Secure purchase RPC ============
CREATE OR REPLACE FUNCTION public.rpc_purchase_log(p_product_id uuid)
RETURNS TABLE(credential text, type text, platform text, price numeric, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item_id uuid;
  v_credential text;
  v_price numeric;
  v_type text;
  v_platform text;
  v_balance numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT lp.price, lp.type, lp.platform INTO v_price, v_type, v_platform
  FROM public.log_products lp WHERE lp.id = p_product_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Log not found';
  END IF;

  -- lock the buyer's profile row
  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- grab one available log
  SELECT id, li.credential INTO v_item_id, v_credential
  FROM public.log_items li
  WHERE li.product_id = p_product_id AND li.sold = false
  ORDER BY li.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Out of stock';
  END IF;

  UPDATE public.log_items
  SET sold = true, sold_to = v_uid, sold_at = now()
  WHERE id = v_item_id;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_price
  WHERE id = v_uid
  RETURNING wallet_balance INTO v_balance;

  INSERT INTO public.log_purchases (user_id, product_id, item_id, platform, type, credential, price)
  VALUES (v_uid, p_product_id, v_item_id, v_platform, v_type, v_credential, v_price);

  RETURN QUERY SELECT v_credential, v_type, v_platform, v_price, v_balance;
END;
$$;

-- ============ Admin add balance RPC ============
CREATE OR REPLACE FUNCTION public.rpc_admin_add_balance(p_user_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_new numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + p_amount
  WHERE id = p_user_id
  RETURNING wallet_balance INTO v_new;
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  RETURN v_new;
END;
$$;
