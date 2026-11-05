-- RPC to get unsold stock count per product
CREATE OR REPLACE FUNCTION public.rpc_get_unsold_stock(p_product_ids uuid[])
RETURNS TABLE(product_id uuid, stock_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT li.product_id, COUNT(*) AS stock_count
  FROM public.log_items li
  WHERE li.product_id = ANY(p_product_ids)
    AND li.sold = false
  GROUP BY li.product_id;
END;
$$;

-- Admin RPC to get total and unsold items per product
CREATE OR REPLACE FUNCTION public.rpc_admin_get_product_stats()
RETURNS TABLE(product_id uuid, total_count bigint, unsold_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    li.product_id,
    COUNT(*) AS total_count,
    SUM(CASE WHEN li.sold = false THEN 1 ELSE 0 END) AS unsold_count
  FROM public.log_items li
  GROUP BY li.product_id;
END;
$$;
