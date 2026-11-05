-- Fix double refund issue
-- This script identifies users who received duplicate refunds and corrects their balances

-- Create a temporary table to analyze refund issues
CREATE TEMP TABLE refund_analysis AS
SELECT 
  o.user_id,
  o.id as order_id,
  o.price,
  o.status,
  o.created_at,
  o.updated_at,
  -- Calculate how much was deposited
  (SELECT COALESCE(SUM(pp.amount), 0) 
   FROM paystack_payments pp 
   WHERE pp.user_id = o.user_id) as total_deposited,
  -- Calculate how much should have been spent (only non-refunded orders)
  (SELECT COALESCE(SUM(o2.price), 0)
   FROM orders o2
   WHERE o2.user_id = o.user_id
   AND o2.status NOT IN ('canceled', 'cancelled', 'banned', 'timeout')
   AND o2.id != o.id) as total_spent_other,
  -- Calculate how much should have been spent on logs (only purchased, not pending)
  (SELECT COALESCE(SUM(lp.price), 0)
   FROM log_purchases lp
   WHERE lp.user_id = o.user_id) as total_spent_logs
FROM orders o
WHERE o.status IN ('canceled', 'cancelled', 'banned', 'timeout')
ORDER BY o.user_id, o.created_at;

-- Calculate correct balance for each user
CREATE TEMP TABLE correct_balances AS
SELECT DISTINCT
  ra.user_id,
  p.wallet_balance as current_balance,
  ra.total_deposited - ra.total_spent_other - ra.total_spent_logs as correct_balance,
  p.wallet_balance - (ra.total_deposited - ra.total_spent_other - ra.total_spent_logs) as over_credited
FROM refund_analysis ra
JOIN profiles p ON p.id = ra.user_id
WHERE p.wallet_balance > (ra.total_deposited - ra.total_spent_other - ra.total_spent_logs);

-- Log users who will be corrected
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM correct_balances WHERE over_credited > 0 LOOP
    RAISE NOTICE 'User %: Current=₦%, Correct=₦%, Excess=₦%', 
      r.user_id, r.current_balance, r.correct_balance, r.over_credited;
  END LOOP;
END $$;

-- Fix the balances (set to correct amount)
UPDATE profiles p
SET wallet_balance = cb.correct_balance
FROM correct_balances cb
WHERE p.id = cb.user_id
  AND cb.over_credited > 0
  AND cb.correct_balance >= 0; -- Don't go negative

-- Also fix any users who might have negative balance due to the bug
UPDATE profiles
SET wallet_balance = 0
WHERE wallet_balance < 0;
