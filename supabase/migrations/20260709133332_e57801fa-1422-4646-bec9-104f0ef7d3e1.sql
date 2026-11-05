CREATE OR REPLACE FUNCTION public.rpc_refund_order(p_order_id uuid, p_status text)
 RETURNS TABLE(status_updated boolean, refunded boolean, new_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_refund numeric;
  v_new numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the order row to prevent double-refund from concurrent calls
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.user_id <> v_uid THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Only refund orders that are still in an active state (guards against double refund)
  IF lower(v_order.status) NOT IN ('pending', 'received') THEN
    RETURN QUERY SELECT false, false, NULL::numeric;
    RETURN;
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;

  v_refund := COALESCE(v_order.price, 0);

  IF v_refund > 0 THEN
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_refund
    WHERE id = v_uid
    RETURNING wallet_balance INTO v_new;

    RETURN QUERY SELECT true, true, v_new;
  ELSE
    RETURN QUERY SELECT true, false, NULL::numeric;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_refund_order(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_refund_order(uuid, text) TO service_role;