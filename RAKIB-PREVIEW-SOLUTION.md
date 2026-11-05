# RakibSocials Preview Links Solution

## Current Situation
The RakibSocials API (`https://rakibsocials.com/api/v1`) **does not expose preview/sample links** in their product data.

### What the API Returns:
```json
{
  "id": 148,
  "name": "USA Facebook 0-50 Friend",
  "category_id": 45,
  "description": "USA facebook ( 0-50 FRIENDS)(real+fake friendss mix) YEAR 2024-2025",
  "price": "1325.00",
  "stock": 25,
  "in_stock": true,
  "image": "https://rakibsocials.com/media/log_image/facebook_VnNNLGz.png"
}
```

**NO `previews`, `samples`, or `preview_links` field exists!**

## Temporary Solution Implemented

Added a **"View Samples on RakibSocials"** button that opens the product page on their website:
- Button appears for all RakibSocials API products
- Opens in new tab: `https://rakibsocials.com/product/{id}/`
- Users can view samples there before returning to buy

## Permanent Solutions (Choose One)

### Option 1: Contact RakibSocials Support ⭐ RECOMMENDED
**Email/Contact RakibSocials and ask:**
"Hi, I'm using your API and need to show preview/sample account links to my customers before they purchase. How can I get preview links via your API? Is there a separate endpoint or field I should use?"

Their support might provide:
- Hidden API endpoint: `/api/v1/products/{id}/previews`
- Additional parameter: `/api/v1/products?include_previews=true`
- Instructions on how to access preview data

### Option 2: Manual Admin Entry
For products where previews are critical:
1. Admin uploads the same product manually through admin panel
2. Add preview links in the "Preview Links" field
3. This overrides the API product or supplements it

### Option 3: Web Scraping (Not Recommended)
Scrape their product pages to extract preview links:
- Requires web scraping library
- May break if they change their HTML structure
- Might violate their terms of service
- Not reliable

### Option 4: Hybrid Approach
- Use API for product listing and stock
- Allow admin to manually add preview links for popular products in database
- Show "View on RakibSocials" button as fallback

## Current User Experience

**For RakibSocials Products:**
1. User browses products → sees RakibSocials products with 100% markup
2. User clicks product → modal opens with details
3. User sees "View Sample Accounts" section with button
4. User clicks → Opens RakibSocials website in new tab
5. User views samples → Returns to your site
6. User clicks "Proceed to Purchase" → Buys from your platform

## Action Required

**Contact RakibSocials support ASAP to ask about preview API access.**

Until then, the "View on RakibSocials" button allows users to see samples before purchasing.
