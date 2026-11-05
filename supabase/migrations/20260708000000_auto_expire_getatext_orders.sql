-- Auto-expire GetAText orders that passed their expiration time
-- This can be run manually or scheduled as a cron job

-- Find and expire GetAText orders that passed their expiration time
WITH expired_orders AS (
  SELECT 
    o.id,
    o.user_id,
    o.price,
    o.reference::jsonb->>'expiresAt' as expires_at
  FROM orders o
  WHERE o.provider = 'GETATEXT'
    AND LOWER(o.status) IN ('pending', 'received')
    AND o.reference::jsonb->>'expiresAt' IS NOT NULL
    AND (o.reference::jsonb->>'expiresAt')::timestamp < NOW()
)
-- Mark as cancelled (refund will happen when user views the order)
UPDATE orders o
SET status = 'cancelled'
FROM expired_orders e
WHERE o.id = e.id;

-- Optional: Also refund immediately (uncomment if you want instant refunds)
/*
UPDATE profiles p
SET wallet_balance = wallet_balance + (
  SELECT COALESCE(SUM(o.price), 0)
  FROM orders o
  WHERE o.user_id = p.id
    AND o.provider = 'GETATEXT'
    AND o.status = 'cancelled'
    AND o.updated_at > NOW() - INTERVAL '1 minute'
)
WHERE p.id IN (
  SELECT DISTINCT user_id 
  FROM orders 
  WHERE provider = 'GETATEXT'
    AND status = 'cancelled'
    AND updated_at > NOW() - INTERVAL '1 minute'
);
*/

-- Show how many orders were expired
SELECT 
  COUNT(*) as expired_count,
  SUM(price) as total_amount_to_refund
FROM orders
WHERE provider = 'GETATEXT'
  AND status = 'cancelled'
  AND updated_at > NOW() - INTERVAL '1 minute';

COMMENT ON TABLE orders IS 'GetAText orders will auto-expire when their expiresAt timestamp passes. Run the migration 20260708000000_auto_expire_getatext_orders.sql periodically to detect and cancel expired orders.';
