-- Fix duplicate refund bug (v2) - addresses multiple refunds from rapid clicks on Cancel/Ban
-- This migration identifies users who received multiple refunds for the same order
-- and adjusts their wallet balance accordingly

-- Create a temporary table to track duplicate refunds per order
CREATE TEMP TABLE duplicate_refund_analysis AS
WITH order_status_changes AS (
  -- Find all cancelled/banned orders and calculate how much should have been refunded (once)
  SELECT 
    user_id,
    id as order_id,
    price,
    status,
    created_at
  FROM orders
  WHERE LOWER(status) IN ('cancelled', 'canceled', 'banned', 'timeout')
),
user_overage AS (
  -- Calculate expected wallet vs actual wallet
  SELECT 
    p.id as user_id,
    p.email,
    p.wallet_balance as current_balance,
    COALESCE(p.total_deposited, 0) as total_deposited,
    COALESCE(p.total_spent_orders, 0) as total_spent_orders,
    COALESCE(p.total_spent_logs, 0) as total_spent_logs,
    -- Expected balance = deposits - orders spent - logs spent
    (COALESCE(p.total_deposited, 0) - COALESCE(p.total_spent_orders, 0) - COALESCE(p.total_spent_logs, 0)) as expected_balance,
    -- Overage = current - expected (positive means over-credited)
    (p.wallet_balance - (COALESCE(p.total_deposited, 0) - COALESCE(p.total_spent_orders, 0) - COALESCE(p.total_spent_logs, 0))) as overage
  FROM profiles p
)
SELECT 
  user_id,
  email,
  current_balance,
  expected_balance,
  overage,
  total_deposited,
  total_spent_orders,
  total_spent_logs
FROM user_overage
WHERE overage > 1.0; -- Only users with more than ₦1 overage (accounting for rounding)

-- Log the analysis results
DO $$
DECLARE
  affected_count INTEGER;
  total_overage NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(overage), 0)
  INTO affected_count, total_overage
  FROM duplicate_refund_analysis;
  
  RAISE NOTICE 'Found % users with duplicate refunds totaling ₦%', affected_count, total_overage;
END $$;

-- Display affected users (for admin review)
SELECT 
  email,
  current_balance,
  expected_balance,
  overage as amount_to_deduct,
  total_deposited,
  total_spent_orders,
  total_spent_logs
FROM duplicate_refund_analysis
ORDER BY overage DESC;

-- MANUAL STEP: Review the output above
-- If the amounts look correct, uncomment and run the UPDATE below to fix balances:

/*
-- Correct the wallet balances
UPDATE profiles p
SET wallet_balance = d.expected_balance
FROM duplicate_refund_analysis d
WHERE p.id = d.user_id;

-- Log the correction
DO $$
DECLARE
  corrected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO corrected_count FROM duplicate_refund_analysis;
  RAISE NOTICE 'Corrected wallet balances for % users', corrected_count;
END $$;
*/

-- Note: The UPDATE is commented out for safety
-- Admin should review the SELECT results first, then uncomment and run the UPDATE
