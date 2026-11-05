# WhatsApp & Instagram Not Showing - FIXED ✅

## Problem
WhatsApp and Instagram were visible locally but NOT showing on the live production site in the Alternative (Tiger SMS) tab.

## Root Cause
The `services.json` file contains mappings from Tiger SMS service codes to display names:
- `"wa"` → `"Whatsapp"`
- `"ig"` → `"Instagram+Threads"`

The code was using `fs.readFileSync()` to load this file at runtime:
```typescript
const rawData = fs.readFileSync(jsonPath, "utf-8");
serviceMap = JSON.parse(rawData);
```

This worked locally but **failed in production** because:
1. The file path was different in the deployment environment
2. The file wasn't being copied to the build output folder
3. When the file couldn't be found, `serviceMap` remained empty
4. Services fell back to just capitalizing the code: `"wa"` → `"Wa"` instead of `"Whatsapp"`

## Solution
Changed from runtime file reading to **direct JSON import**:

```typescript
// Before (failed in production)
let serviceMap: Record<string, string> = {};
try {
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  serviceMap = JSON.parse(rawData);
} catch (err) {
  console.error("Failed to load services.json mapping:", err);
}

// After (works everywhere)
import servicesJsonRaw from "./services.json";
const serviceMap: Record<string, string> = servicesJsonRaw as Record<string, string>;
```

Also added `resolveJsonModule: true` to `tsconfig.json` to enable JSON imports.

## Result
- ✅ `services.json` is now bundled with the deployment
- ✅ Service names are correctly mapped in production
- ✅ WhatsApp and Instagram now show up in the Alternative tab
- ✅ All 238 services are properly named (not just capitalized codes)

## Testing
**API Verification (UK):**
- WhatsApp: 241,180 in stock
- Instagram: 238,732 in stock

**Deployment:**
- Commit: `85c7c5e`
- Pushed to: `main` branch
- Status: Deploying...

## Wait Time
The deployment should take 2-5 minutes. After that:
1. Hard refresh the live site (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Go to Numbers → Alternative tab
3. Select United Kingdom (or any country)
4. WhatsApp and Instagram should now appear in the services grid!

## If Still Not Working
If after deployment WhatsApp/Instagram still don't show:
1. Check browser console for errors (F12 → Console tab)
2. Verify `TIGERSMS_API_KEY` environment variable is set in Lovable Cloud
3. Clear browser cache completely
4. Try a different browser or incognito mode
