# Tiger SMS WhatsApp/Instagram Debug

## Summary
User reports that WhatsApp and Instagram are not showing in the Alternative tab (Tiger SMS), but they appear on the Tiger SMS platform website.

## Investigation Results

### API Testing
Tested Tiger SMS API directly and confirmed:

**United States (ID: 187)**
- WhatsApp (wa): 161,976 in stock, $1.00
- Instagram (ig): 59,165 in stock, $0.0347

**United Kingdom (ID: 16)**
- WhatsApp (wa): 241,180 in stock, $0.297
- WhatsApp2 (wa2): 99 in stock, $0.05
- Instagram (ig): 238,732 in stock, $0.0439

**Nigeria (ID: 19)**
- WhatsApp (wa): 12,041 in stock, $0.45
- Instagram (ig): 54,245 in stock, $0.0518

### Code Flow
1. User selects country → calls `getFivesimProducts({ country: countryId })`
2. Server calls Tiger SMS API → `tigerGetPricesForCountry(countryId)`
3. API returns services with codes like `"wa"`, `"ig"`, etc.
4. Code filters by `count > 0` ✓
5. Code maps service codes to display names:
   - `"wa"` → `"Whatsapp"`
   - `"ig"` → `"Instagram+Threads"`
6. Frontend receives products array with `.name` property
7. Frontend filters by search query (if any)
8. Frontend sorts: featured services first (whatsapp, instagram, tiktok, telegram, snapchat), then rest

### Service Name Mapping (services.json)
```json
{
  "wa": "Whatsapp",
  "ig": "Instagram+Threads"
}
```

## Questions for User

To debug this issue, please answer:

1. **Which country did you select** in the Alternative tab when checking?
   - [ ] United States
   - [ ] United Kingdom  
   - [ ] Nigeria
   - [ ] Other: _______

2. **What did you see** after selecting the country?
   - [ ] No services at all (empty page)
   - [ ] Some services, but not WhatsApp/Instagram
   - [ ] Loading forever
   - [ ] Error message

3. **If you saw some services, which ones?** (list 3-5):
   - 
   - 
   - 

4. **Did you type anything in the search box?**
   - [ ] Yes: _______
   - [ ] No, it was empty

5. **Browser console errors?**
   - [ ] Yes (please share screenshot)
   - [ ] No

## Possible Causes

1. ✅ Tiger SMS API not returning services - **RULED OUT** (tested, working)
2. ✅ Service name mapping missing - **RULED OUT** (wa/ig mapped correctly)
3. ⚠️  Country-specific availability - **POSSIBLE** (user selected different country than tested)
4. ⚠️  Search filter hiding results - **POSSIBLE** (user typed something in search)
5. ⚠️  Frontend caching old data - **POSSIBLE**
6. ⚠️  API key issue in production - **POSSIBLE** (works locally, might not in Lovable Cloud)

## Next Steps

1. User answers questions above
2. Check browser console for errors
3. Verify Tiger SMS API key is set in Lovable Cloud environment variables
4. Clear browser cache and retry
5. If issue persists, add debug logging to see what API returns in production
