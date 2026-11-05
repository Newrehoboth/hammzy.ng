# Emergency Fix: PocketFi Payment System Not Working

## 🔴 Current Status
**Problem**: PocketFi deposits stopped working - users see "contact support" message
**Likely Cause**: Account suspended due to security issues OR API credentials expired

## 🚨 What Happened?

Based on the code analysis:
1. **Your PocketFi credentials ARE configured** (Business ID: 30311)
2. **Security vulnerability** was present (webhook signature bypass)
3. **API keys were exposed** in public repository
4. **PocketFi likely suspended your account** for security reasons

## ✅ Immediate Fix Steps

### Step 1: Contact PocketFi Support (URGENT - Do This First!)

**What to do:**
1. Visit PocketFi website: https://pocketfi.ng
2. Find their support contact (email, phone, WhatsApp)
3. Send this message:

```
Subject: Account Suspended? Business ID 30311 - Need Help

Hello PocketFi Support,

My virtual account service (Business ID: 30311) suddenly stopped working.

Details:
- Business ID: 30311
- Issue: API calls are failing / account may be suspended
- When it started: [mention when you first saw the "contact support" message]

Could you please:
1. Check if my account is active
2. Verify if my API credentials are still valid
3. Provide new credentials if needed
4. Help restore service

I've fixed security issues on my end and need to get service restored urgently.

Thank you!
```

**Expected Response:**
- They'll verify your account status
- May provide new API credentials
- Will explain what happened

### Step 2: Test PocketFi API Credentials

Once you hear back from support, test if your credentials work:

```bash
# Run this command in terminal
cd /Users/user/Documents/virtual-connect/virtual-connect

# Test PocketFi API
curl -X GET "https://api.pocketfi.ng/api/v1/virtual-accounts/fetch?businessId=30311" \
  -H "Authorization: Bearer 36144|qGgfQn5uzsf9VmeL1JIVBxh2KNw1ujwTLhZBr1xk664647e0" \
  -H "Content-Type: application/json"
```

**If you get:**
- ✅ **200 OK response**: Credentials work! Issue is elsewhere
- ❌ **401 Unauthorized**: Credentials expired - need new ones from PocketFi
- ❌ **403 Forbidden**: Account suspended - contact PocketFi
- ❌ **500 Error**: PocketFi service issue - wait or contact them

### Step 3: Update Credentials (if PocketFi provides new ones)

If PocketFi gives you new credentials:

1. **Update .env file:**
```bash
# Edit this file
nano /Users/user/Documents/virtual-connect/virtual-connect/.env
```

2. **Replace these lines:**
```env
POCKETFI_BUSINESS_ID="YOUR_NEW_BUSINESS_ID"
POCKETFI_PUBLIC_KEY="YOUR_NEW_PUBLIC_KEY"
POCKETFI_SECRET_KEY="YOUR_NEW_SECRET_KEY"
```

3. **Also update production env files:**
```bash
# Update these too
nano /Users/user/Documents/virtual-connect/virtual-connect/.env.vercel
nano /Users/user/Documents/virtual-connect/virtual-connect/.env.vercel.prod
```

4. **Update Vercel environment variables** (if deployed):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update: POCKETFI_BUSINESS_ID, POCKETFI_PUBLIC_KEY, POCKETFI_SECRET_KEY
   - Redeploy

### Step 4: Security Fixes (DONE ✅)

I've already fixed these for you:
- ✅ Webhook signature verification now properly rejects fake webhooks
- ✅ Better error messages for users
- ✅ Improved logging

### Step 5: Deploy the Fixes

```bash
cd /Users/user/Documents/virtual-connect/virtual-connect

# Commit the security fixes
git add .
git commit -m "Security fix: Enable PocketFi webhook signature verification"

# Push to deploy (if using Vercel/auto-deploy)
git push
```

## 🧪 How to Test After Fix

### Test 1: Check if API works
Run the curl command from Step 2 above

### Test 2: Try creating account
1. Login to your app
2. Go to Dashboard → Add Funds
3. Should see "Securing your personal Paga deposit account..." loading message
4. Should then see account number OR helpful error message

### Test 3: Check logs
Look for these in your server logs:
```
[PocketFi] Creating account for user xxx...
[PocketFi] Successfully created account: 31234567 (paga)
```

OR error messages like:
```
[PocketFi] Error: POCKETFI_PUBLIC_KEY is not set
[PocketFi] API error (401): Unauthorized
```

## 🔍 Diagnostic: What's Wrong?

Run this diagnostic to understand the issue:

```bash
cd /Users/user/Documents/virtual-connect/virtual-connect

# Check if env variables are loaded
node -e "
require('dotenv').config();
console.log('PocketFi Config Check:');
console.log('BUSINESS_ID:', process.env.POCKETFI_BUSINESS_ID);
console.log('PUBLIC_KEY:', process.env.POCKETFI_PUBLIC_KEY ? 'SET (' + process.env.POCKETFI_PUBLIC_KEY.length + ' chars)' : 'MISSING');
console.log('SECRET_KEY:', process.env.POCKETFI_SECRET_KEY ? 'SET (' + process.env.POCKETFI_SECRET_KEY.length + ' chars)' : 'MISSING');
"
```

## 💡 Alternative Solutions While Waiting

### Option 1: Enable Manual Deposits

If PocketFi takes time to restore, enable manual deposits temporarily:

Edit `/src/components/pocketfi-deposit.tsx` - uncomment the WhatsApp contact button:

```typescript
// Change this section (line 67-77) from commented to active
<div className="rounded-xl border border-border bg-card p-4">
  <h4 className="font-semibold text-sm mb-2">Manual Deposit</h4>
  <p className="text-xs text-muted-foreground mb-3">
    Contact support via WhatsApp to make a manual deposit.
  </p>
  <Button 
    className="w-full" 
    onClick={() => window.open('https://wa.me/YOUR_PHONE_NUMBER', '_blank')}
  >
    Contact Support on WhatsApp
  </Button>
</div>
```

Replace `YOUR_PHONE_NUMBER` with your actual WhatsApp business number (format: 2348012345678)

### Option 2: Try Alternative Payment Provider

If PocketFi doesn't work out, consider:
- **Paystack** (already integrated in your code!)
- **Flutterwave**
- **Monnify**
- **Squad**

## 📞 Who to Contact

### PocketFi Support
- Website: https://pocketfi.ng
- Email: support@pocketfi.ng (check their website)
- Phone: Check their contact page

### If You Need Help
Let me know:
1. What response you got from PocketFi
2. What the API test showed
3. Any error messages you're seeing

## ⚠️ Important Security Notes

**Your API keys were exposed in git history.**

After fixing PocketFi:
1. Rotate ALL API keys (not just PocketFi)
2. Remove sensitive data from git history
3. Use proper secret management (Vercel env vars)
4. Never commit .env files

## 🎯 Success Checklist

- [ ] Contacted PocketFi support
- [ ] Verified account status
- [ ] Got new credentials (if needed)
- [ ] Updated .env files
- [ ] Deployed security fixes
- [ ] Tested account creation
- [ ] Confirmed deposits work
- [ ] Updated production environment variables

## What I Fixed For You

1. ✅ **Webhook Security**: Now properly validates signatures (prevents fake deposits)
2. ✅ **Better Error Messages**: Users see helpful errors instead of generic failures
3. ✅ **Recovery Guide**: Created RECOVER-SUPABASE-ACCESS.md for your Supabase issue

**Next Step**: Contact PocketFi support and let me know what they say!
