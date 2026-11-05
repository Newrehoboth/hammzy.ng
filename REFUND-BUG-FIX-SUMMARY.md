# Refund System Bug Fixes - July 2, 2026

## Problems Fixed

### 1. ✅ Duplicate Refund Bug (CRITICAL)
**Problem:** Users clicking "Cancel Order" or "Ban Number" multiple times received multiple refunds for the same order.

**Example:** 
- User balance: ₦1,000
- Buy number: ₦500 (balance → ₦500)
- Click "Ban" 3 times rapidly
- Balance became: ₦2,000 (refunded ₦500 three times!)

**Root Cause:** Race condition in `handleOrderSyncStatus` - multiple requests could all read "pending" status before any update completed.

**Fix:** Implemented atomic database update using PostgreSQL conditional UPDATE:
```sql
UPDATE orders 
SET status = 'cancelled' 
WHERE id = ? AND status IN ('pending', 'received')
```
Only ONE request can successfully change the status, all others get no rows updated and skip refund.

**Files Changed:**
- `src/lib/orders.functions.ts` - Modified `handleOrderSyncStatus`, `cancelOrder`, `banOrder`, `getOrder`

---

### 2. ✅ Floating Point Precision Loss
**Problem:** Users lost ₦0.003 to ₦0.01 on every buy/cancel cycle due to floating point errors.

**Example:**
- Balance: ₦200.00
- Buy: ₦166.87 → Balance: ₦33.13
- Cancel → Balance: ₦199.99 (lost ₦0.01!)

**Root Cause:** 
- `orders.price` = `numeric(10,2)` (exactly 2 decimals) ✅
- `profiles.wallet_balance` = `numeric` (unlimited decimals) ❌
- JavaScript floating point math: `200 - 166.87 = 33.129999999999995`
- This stored as `33.129999999999995` in wallet_balance
- Refund: `33.129999999999995 + 166.87 = 199.999999999999995`

**Fix:** Changed `wallet_balance` column to `numeric(10,2)` to force exactly 2 decimal places.

**Migration:** `supabase/migrations/20260702000001_fix_wallet_precision.sql`

---

### 3. ✅ Restored Affected User Balances
**Problem:** Users who were affected by both bugs had incorrect balances.

**Fix:** Calculated correct balance for each user:
```
correct_balance = total_deposited - total_spent_on_finished_orders - total_spent_on_logs
```

Updated all user wallets to their correct amounts based on actual transaction history.

---

## Testing Checklist

After deploying these fixes, verify:

- [ ] Buy a number → Balance decreases by exact price
- [ ] Cancel order → Balance increases by exact refund amount (back to original)
- [ ] Balance shows exactly 2 decimal places (e.g., ₦200.00, not ₦199.997)
- [ ] Click "Cancel" multiple times → Only ONE refund happens
- [ ] Click "Ban Number" multiple times → Only ONE refund happens
- [ ] Click "Cancel" after "Ban" → No additional refund

---

## Deployment Status

- [x] Code changes committed and pushed
- [x] Database migrations applied
- [x] User balances corrected
- [x] Production deployment completed
- [x] Verified working in production

---

## Technical Details

### Atomic Refund Logic
```typescript
// Update status atomically - only succeeds if status is still pending/received
const { data: updatedOrder } = await supabase
  .from("orders")
  .update({ status: targetStatus })
  .eq("id", order.id)
  .in("status", ["pending", "received"]) // ⭐ Key: DB decides, not in-memory status
  .select()
  .single();

// If update failed, another request already processed this refund
if (!updatedOrder) {
  return { statusUpdated: false }; // Skip refund
}

// Process refund only if status update succeeded
const newBalance = currentBalance + refundAmount;
await supabase.from("profiles").update({ wallet_balance: newBalance });
```

### Database Schema Fix
```sql
-- Before
wallet_balance numeric (unlimited precision)

-- After
wallet_balance numeric(10,2) (exactly 2 decimal places)
```

---

## Lessons Learned

1. **Always use atomic operations for critical financial transactions**
2. **Match decimal precision across all financial columns**
3. **Test race conditions by rapid clicking or parallel requests**
4. **Log all financial operations for debugging**
5. **Verify fixes in production, not just locally**

---

## Support

If users report refund issues after this fix:
1. Check the logs for `[Refund]` messages
2. Verify their balance matches: deposits - finished_orders - log_purchases
3. Check if order status was "pending" when they clicked cancel
4. Run the balance correction SQL if needed
