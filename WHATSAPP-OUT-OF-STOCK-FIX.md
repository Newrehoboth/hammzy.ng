# WhatsApp "No Operators Available" Fix - RESOLVED

## Issue
User reported that regular "Whatsapp" service shows "No operators available" modal when clicked in the Alternative tab, even though DaisySMS dashboard showed WhatsApp numbers available with 571 units in stock.

## Root Cause ⚠️
The problem was a **service code mapping mismatch** between the old Tiger SMS codes and new DaisySMS codes:

1. **Tiger SMS** used short codes like `"wa"` for WhatsApp
2. **DaisySMS** uses full names like `"whatsapp"` 
3. Our `services.json` only had Tiger SMS codes: `"wa": "Whatsapp"`
4. When DaisySMS returned `"whatsapp"` (571 in stock):
   - `getServiceDisplayName("whatsapp")` returned `"Whatsapp"` ✅
   - User clicked "Whatsapp"
   - `getServiceCode("Whatsapp")` looked it up and returned `"wa"` ❌
   - We sent `"wa"` to DaisySMS API
   - DaisySMS didn't recognize `"wa"` → returned empty array
   - Modal showed "No operators available" even though 571 were in stock!

**Verified with API**: DaisySMS actually has:
- `whatsapp`: cost=$1.68, count=571 ✅
- `whatsapp_canada`: cost=$0.60, count=799 ✅
- `instagram`: cost=$0.37, count=425 ✅
- `telegram`: cost=$1.19, count=395 ✅

## Solution Implemented

### 1. Added DaisySMS Service Codes to Mapping
**File**: `src/lib/api/services.json`

Added all DaisySMS service codes so bidirectional lookups work:

```json
{
  "wa": "Whatsapp",              // Old Tiger SMS code
  "whatsapp": "Whatsapp",        // DaisySMS code ✅
  "whatsapp_canada": "Whatsapp Canada",
  "instagram": "Instagram",
  "instagram_canada": "Instagram Canada", 
  "instagram_re": "Instagram (Refill)",
  "telegram": "Telegram",
  "telegram_canada": "Telegram Canada",
  "snapchat": "Snapchat",
  "snapchat_du": "Snapchat",
  "tiktok": "TikTok",
  "tiktok_du": "TikTok",
  "discord": "Discord",
  "google": "Google",
  "google_canada": "Google Canada",
  "facebook": "Facebook",
  "facebook_du": "Facebook"
}
```

Now the round-trip works:
1. DaisySMS API → `"whatsapp"` (code)
2. Display → `"Whatsapp"` (user sees this)
3. User clicks → `getServiceCode("Whatsapp")` → `"whatsapp"` ✅
4. Send to DaisySMS → recognizes `"whatsapp"` → returns 571 operators ✅
### 2. Pre-Check Before Opening Modal (Safety Net)
**File**: `src/routes/numbers.index.tsx`

Added availability check BEFORE opening the operator modal:

```typescript
const handleOpenOperatorModal = async (product: FivesimProduct) => {
  if (!selectedCountry) return;
  
  // Pre-check if operators are available before opening modal
  const loadingToast = toast.loading(`Checking availability for ${product.name}...`);
  try {
    const operators = await getFivesimOperatorPrices({ 
      data: { country: selectedCountry.id, product: product.name } 
    });
    
    toast.dismiss(loadingToast);
    
    if (operators.length === 0 || operators[0].count === 0) {
      toast.error(`${product.name} is currently out of stock. Please try another service or check back later.`);
      return;
    }
    
    setSelectedProduct(product);
    setModalOpen(true);
  } catch (err) {
    toast.dismiss(loadingToast);
    toast.error("Failed to check availability. Please try again.");
  }
};
```

### 3. Visual Stock Indicators
**File**: `src/routes/numbers.index.tsx`

Added visual feedback for stock status on product cards:

- **Out of Stock**: Grayed out card, disabled button, red "Out of stock" text
- **Low Stock** (< 10): Amber colored stock count
- **In Stock**: Normal appearance, clickable

```typescript
const isOutOfStock = p.qty === 0;
const isLowStock = p.qty > 0 && p.qty < 10;
```

### 4. Enhanced Server-Side Filtering
**File**: `src/lib/api/daisysms.server.ts`

Added logging and comments to `daisyGetProducts()` to make filtering explicit:

```typescript
export async function daisyGetProducts(): Promise<DaisyProduct[]> {
  const pricesData = await daisyGetPrices();
  const products = Object.entries(pricesData)
    .filter(([, data]) => data.count > 0) // Only show services with stock
    .map(([code, data]) => ({
      name: getServiceDisplayName(code),
      qty: data.count,
      price: data.cost,
    }))
    .sort((a, b) => b.qty - a.qty);
  
  console.log(`[DaisySMS] Returning ${products.length} products with stock > 0`);
  return products;
}
```

## User Experience Improvements

### Before
1. User clicks "Whatsapp" (₦624)
2. Modal opens immediately
3. Shows "No operators available for this service"
4. Confusing experience - why show it if it's unavailable?

### After
1. User clicks "Whatsapp" (₦624)
2. Loading toast: "Checking availability for Whatsapp..."
3. Error toast: "Whatsapp is currently out of stock. Please try another service or check back later."
4. Modal doesn't open
5. Card is visually grayed out with "Out of stock" indicator

## Testing
1. ✅ Services with `count > 0` → Opens operator modal normally
2. ✅ Services with `count = 0` → Shows error toast, modal stays closed
3. ✅ Out-of-stock cards visually distinct (grayed out, disabled button)
4. ✅ Low stock warning (amber color for stock < 10)

## Related Files
- `src/routes/numbers.index.tsx` - Frontend UI and click handlers
- `src/lib/api/daisysms.server.ts` - DaisySMS API integration
- `src/lib/orders.functions.ts` - Server functions for products/operators

## Notes
- The filtering at server level (`daisyGetProducts`) should prevent showing out-of-stock items
- The pre-check at click level is a safety net for race conditions
- Visual indicators help users understand availability at a glance
- This solution works for both DaisySMS (Alternative tab) and future providers
