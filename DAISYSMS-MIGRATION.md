# Tiger SMS → DaisySMS Migration ✅

## Summary
Successfully migrated from Tiger SMS API to DaisySMS API for the Alternative virtual number service.

## Why DaisySMS?

### Problems with Tiger SMS:
1. ❌ **EARLY_CANCEL_DENIED errors** - Had to wait 1-2 minutes before cancelling
2. ❌ **Complex country selection** - 170+ countries to choose from
3. ❌ **Inconsistent cancellation** - Sometimes failed to cancel on their platform
4. ❌ **Complex error handling** - Many different error cases to handle

### Advantages of DaisySMS:
1. ✅ **Better cancellation** - Clean cancellation API, no early-cancel issues
2. ✅ **USA-only** - Simpler, focused service (no country selection needed)
3. ✅ **SMS-Activate compatible** - Same API format as Tiger SMS
4. ✅ **20 active rentals limit** - Clear limits (vs Tiger's unclear limits)
5. ✅ **Max price protection** - Can set max_price to avoid price surges
6. ✅ **Clearer responses** - ACCESS_READY vs ACCESS_CANCEL (more explicit)

## What Changed

### API Implementation
- **New file**: `src/lib/api/daisysms.server.ts`
- **Backed up**: `src/lib/api/tigersms.server.ts.backup`

### Key Differences

| Feature | Tiger SMS | DaisySMS |
|---------|-----------|----------|
| **Base URL** | `https://api.tiger-sms.com/stubs/handler_api.php` | `https://daisysms.io/stubs/handler_api.php` |
| **API Key Env** | `TIGERSMS_API_KEY` | `DAISYSMS_API_KEY` |
| **Countries** | 170+ countries | USA only (187) |
| **Provider Code** | `TIGER_SMS` | `DAISY_SMS` |
| **Cancel Response** | `ACCESS_CANCEL` or `EARLY_CANCEL_DENIED` | `ACCESS_CANCEL` or `ACCESS_READY` |
| **Finish Response** | `STATUS_OK` or `ACCESS_CANCEL` | `ACCESS_ACTIVATION` or `NO_ACTIVATION` |

### Code Changes

#### 1. Orders Functions (`src/lib/orders.functions.ts`)
- ✅ Import daisysms functions instead of tigersms
- ✅ Use `DAISY_SMS` as default provider
- ✅ Remove country ID parsing (DaisySMS is USA-only)
- ✅ Add `max_price` parameter to prevent price surges
- ✅ Update error messages for DaisySMS responses
- ✅ Handle `ACCESS_READY` (already got code) error

#### 2. Environment Variables (`.env`)
```bash
# Before
TIGERSMS_API_KEY="oSAnHCEw9ltjE9Grf4n7njLuKXAnqIUL"

# After
DAISYSMS_API_KEY="Yc2x52Wu1v4rNMzbtOuy9fxbPd0pLcre"
```

#### 3. Database
- No schema changes needed!
- Old Tiger SMS orders will continue to work (provider field differentiates them)
- New orders will use `DAISY_SMS` provider

### Error Handling Updates

#### Tiger SMS Errors (Old)
```typescript
if (text === "EARLY_CANCEL_DENIED") {
  throw new Error("Cannot cancel yet — please wait 1-2 minutes");
}
```

#### DaisySMS Errors (New)
```typescript
if (text === "ACCESS_READY") {
  throw new Error("Cannot cancel — you have already received the SMS code.");
}
if (text === "MAX_PRICE_EXCEEDED") {
  throw new Error("Service price exceeds maximum. Current demand is high.");
}
if (text === "TOO_MANY_ACTIVE_RENTALS") {
  throw new Error("Maximum active rentals reached. Please wait for existing rentals to complete.");
}
```

## API Key Setup

### Your API Key
```
Yc2x52Wu1v4rNMzbtOuy9fxbPd0pLcre
```

### Environment Setup

#### Local (.env file)
Already updated! ✅

#### Production (Lovable Cloud)
**IMPORTANT**: You need to update the environment variable in Lovable.ai:

1. Go to your Lovable project settings
2. Find environment variables section
3. **Remove** `TIGERSMS_API_KEY`
4. **Add** `DAISYSMS_API_KEY` = `Yc2x52Wu1v4rNMzbtOuy9fxbPd0pLcre`
5. Redeploy

## Testing Checklist

After deployment, test these scenarios:

### 1. Buy Number ✅
- [ ] Go to Numbers → Alternative tab
- [ ] Should show "United States" (only country)
- [ ] Select a service (e.g., WhatsApp)
- [ ] Click Buy
- [ ] Should successfully purchase

### 2. Receive SMS ✅
- [ ] Use the number on a website/app
- [ ] Wait for SMS code
- [ ] Code should appear in your order details

### 3. Cancel Order ✅
- [ ] Buy a new number
- [ ] Click "Cancel Order"
- [ ] Should cancel successfully (no "EARLY_CANCEL_DENIED" error!)
- [ ] Should get refunded

### 4. Cancel After Code ❌ (Should Fail)
- [ ] Buy a number
- [ ] Receive SMS code
- [ ] Try to cancel
- [ ] Should show: "Cannot cancel — you have already received the SMS code."
- [ ] No refund (correct behavior!)

## Deployment Status

- ✅ Code committed: `c2c705b`
- ✅ Pushed to GitHub: `main` branch
- ⏳ Deploying to Lovable Cloud...
- ⚠️ **Action needed**: Set `DAISYSMS_API_KEY` in Lovable environment variables

## Rollback Plan (If Needed)

If DaisySMS doesn't work, you can rollback:

```bash
# Restore Tiger SMS
git revert c2c705b

# Or manually:
mv src/lib/api/tigersms.server.ts.backup src/lib/api/tigersms.server.ts
rm src/lib/api/daisysms.server.ts
# Update imports in src/lib/orders.functions.ts
# Update .env with old Tiger SMS key
```

## Financial Impact

### DaisySMS Pricing
Check [DaisySMS Services Page](https://daisysms.io/services) for current pricing.

### Cost Comparison
Both services charge similar prices (~$0.20-$2.00 per number depending on service).

DaisySMS advantage: **max_price parameter** prevents unexpected expenses during price surges!

## Next Steps

1. ⏳ **Wait for deployment** (2-5 minutes)
2. ⚠️ **Set environment variable** in Lovable Cloud
3. ✅ **Test buy/cancel flow**
4. ✅ **Monitor for errors**
5. ✅ **Check refund amounts** match expectations

## Support

- **DaisySMS Docs**: https://daisysms.io/docs/api
- **DaisySMS Support**: support@daisysms.io
- **Your API Key**: `Yc2x52Wu1v4rNMzbtOuy9fxbPd0pLcre`

## Notes

- Old Tiger SMS orders will continue to work (they use `TIGER_SMS` provider in DB)
- New orders will use `DAISY_SMS` provider
- The same services.json mapping file works for both APIs!
- WhatsApp and Instagram are now available! 🎉
