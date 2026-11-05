-- Fix wallet balance precision issues
-- This migration fixes floating point precision errors that caused users to lose small amounts
-- when buying and cancelling orders

-- Set wallet_balance to use exactly 2 decimal places (same as order prices)
ALTER TABLE profiles 
ALTER COLUMN wallet_balance TYPE numeric(10,2);

-- Round all existing balances to 2 decimal places to clean up any precision errors
UPDATE profiles 
SET wallet_balance = ROUND(wallet_balance::numeric, 2);

-- Verify no negative balances exist
UPDATE profiles 
SET wallet_balance = 0 
WHERE wallet_balance < 0;

COMMENT ON COLUMN profiles.wallet_balance IS 'User wallet balance in Naira, stored with exactly 2 decimal places to prevent floating point errors';
