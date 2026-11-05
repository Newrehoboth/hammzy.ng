# Preview Feature Implementation

## Summary
Added preview/sample viewing functionality for RakibSocials API products, similar to their website where users can view sample Facebook profiles before purchasing.

## Changes Made

### 1. Backend API Functions (`src/lib/api/rakibsocials.server.ts`)
- ✅ Added `getProductDetails()` - Fetches individual product details including preview samples
- ✅ Added `getProductPreviews()` - Dedicated function to fetch preview links
- ✅ Enhanced logging to show product structure for debugging

### 2. Server Functions (`src/lib/logs.functions.ts`)
- ✅ Added `getProductPreviews` server function - Securely fetches previews for frontend
- ✅ Updated product mapping to extract preview links from multiple possible field names:
  - `p.previews`
  - `p.samples`
  - `p.preview_links`
  - `p.sample_links`
  - `p.preview` (string)
  - `p.sample` (string)

### 3. UI Updates (`src/routes/logs.tsx`)
- ✅ Added state management for loading previews
- ✅ Modified `openProduct()` to fetch additional previews when viewing RakibSocials products
- ✅ Enhanced preview display section with:
  - Checkboxes (matching RakibSocials UI style)
  - Loading state indicator
  - Scrollable preview list (max-height with overflow)
  - Click-to-open external links
  - Combined display of static + dynamically loaded previews

## How It Works

1. **Product Listing**: When fetching products from RakibSocials API, we automatically extract any preview links from the product data

2. **Product Details**: When user clicks on a product:
   - Modal opens showing product details
   - If it's a RakibSocials product (`rakib_` prefix), system fetches additional previews
   - Loading spinner shows while fetching
   - Preview links display with checkboxes (visual match to RakibSocials)

3. **Preview Display**:
   - Each preview shows as a row with checkbox + clickable URL
   - Clicking the URL opens in new tab
   - External link icon indicates it opens externally
   - Hover effects for better UX

## Testing

### Local Testing (http://localhost:8086)
1. Go to `/logs` page
2. Click on any RakibSocials API product (not admin-uploaded)
3. Modal should open with product details
4. If previews exist, they'll show in "Sample Previews" section
5. Click preview links to view sample accounts

### Expected Behavior
- ✅ Products with previews: Show preview URLs with checkboxes
- ✅ Products without previews: Section hidden
- ✅ Loading previews: Spinner shows while fetching
- ✅ Preview links clickable: Opens in new tab

## API Field Detection
The code checks for previews in this order:
```javascript
if (Array.isArray(p.previews)) → use this
else if (Array.isArray(p.samples)) → use this
else if (Array.isArray(p.preview_links)) → use this
else if (Array.isArray(p.sample_links)) → use this
else if (typeof p.preview === 'string') → use [this]
else if (typeof p.sample === 'string') → use [this]
```

## Notes
- Preview feature only works for RakibSocials API products (ID starts with `rakib_`)
- Admin-uploaded products can also have preview links via the `preview_links` field
- The API structure will be logged in console for debugging: check "Sample product structure" log
- If RakibSocials API doesn't provide preview links in their response, the feature gracefully shows no previews

## Next Steps
1. Test locally at http://localhost:8086/logs
2. Check browser console for API response structure
3. If previews don't show, check the logged "Sample product structure" to see what fields RakibSocials actually returns
4. May need to contact RakibSocials support if their API doesn't expose preview data
