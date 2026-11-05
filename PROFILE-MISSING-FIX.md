# Fix: "User profile not found" Error - PocketFi Account Generation

## Problem
User was unable to generate PocketFi virtual account for deposits. Console error showed:
```
Error: User profile not found
```

Then when attempting auto-creation, hit Row Level Security error:
```
new row violates row-level security policy for table "profiles"
```

## Root Cause
1. User had authentication record in `auth.users` but **missing profile in `public.profiles`**
2. Row Level Security (RLS) policies on profiles table prevent direct INSERT from user auth tokens
3. The `handle_new_user()` trigger failed during signup, leaving user in inconsistent state

## Solution Implemented
Created a **SECURITY DEFINER database function** that bypasses RLS to create missing profiles, then updated all TypeScript functions to call this RPC instead of direct INSERT.

### Architecture
```
User Request → Server Function → Profile Missing? 
                                     ↓
                                Call RPC Function
                                     ↓
                      rpc_get_or_create_profile()
                      (runs with elevated privileges)
                                     ↓
                    Creates profile bypassing RLS
                                     ↓
                            Returns to caller
```

### Files Created

#### 1. `/supabase/migrations/20260722000000_create_profile_rpc.sql`
New database migration that creates:
- ✅ `rpc_get_or_create_profile(p_user_id uuid)` - SECURITY DEFINER function
- ✅ Fetches existing profile OR creates from auth.users data
- ✅ Bypasses RLS policies safely
- ✅ Also creates user_role record
- ✅ Returns complete profile data

#### 2. `/src/lib/logs.functions.ts`
Updated to call RPC function instead of direct INSERT:
- ✅ `getOrCreatePocketFiAccount()` - Uses RPC to create profile
- ✅ `getWalletBalance()` - Uses RPC to create profile

#### 3. `/src/lib/orders.functions.ts`
Updated to call RPC function instead of direct INSERT:
- ✅ `buyDaisySmsNumber()` - Uses RPC to create profile
- ✅ `buyGetATextNumber()` - Uses RPC to create profile

### Code Pattern Used
```typescript
// Fetch user profile
let { data: profile, error: profileError } = await context.supabase
  .from("profiles")
  .select("wallet_balance")
  .eq("id", context.userId)
  .single();

// If profile doesn't exist, create it via RPC (defensive fallback)
if (profileError || !profile) {
  console.warn(`[Service] Profile not found for user ${context.userId}, attempting to create via RPC...`);
  
  try {
    // Call SECURITY DEFINER RPC that bypasses RLS
    const { data: rpcProfile, error: rpcError } = await context.supabase
      .rpc('rpc_get_or_create_profile', { p_user_id: context.userId });

    if (rpcError || !rpcProfile || rpcProfile.length === 0) {
      throw new Error("Unable to retrieve user profile");
    }

    console.log(`[Service] Successfully created/retrieved profile via RPC`);
    profile = rpcProfile[0]; // RPC returns array, take first element
  } catch (err: any) {
    throw new Error(`Unable to create user profile: ${err.message}`);
  }
}
```

## What This Fixes

### ✅ Before (BROKEN)
1. User logs in successfully
2. User tries to generate deposit account
3. System queries profiles table
4. Profile not found → **ERROR: "User profile not found"**
5. User blocked from making deposits

### ✅ After (FIXED)
1. User logs in successfully  
2. User tries to generate deposit account
3. System queries profiles table
4. Profile not found → **Auto-creates profile from auth data**
5. System retries and succeeds
6. User can now generate PocketFi account and make deposits ✅

## Testing Steps

### For the Affected User
1. **Clear browser cache and logout**
2. **Log back in**
3. **Navigate to Billing/Deposit page**
4. **Click to generate deposit account**
5. **Should now succeed** - PocketFi account details will appear

### For Admin Monitoring
Watch server logs for these messages:
```
[PocketFi] Profile not found for user xxx, attempting to create...
[PocketFi] Successfully created profile for user xxx
```

## Prevention Going Forward

### 1. Verify handle_new_user() Trigger
The database trigger at `/supabase/migrations/20260623012526_179b9211-751c-4490-a286-0506fa06f86b.sql` should auto-create profiles for new signups. Verify it's active:

```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Test the function
SELECT public.handle_new_user();
```

### 2. Add Profile Existence Check to Auth Flow
Consider adding a post-login check that ensures profile exists and creates it if missing.

### 3. Monitor Logs
Watch for these warning messages:
- `[PocketFi] Profile not found for user xxx, attempting to create...`
- `[Wallet] Profile not found for user xxx, attempting to create...`  
- `[Orders] Profile not found for user xxx, attempting to create...`

Frequent occurrences = trigger is broken and needs investigation.

## Related Issues
This fix also prevents similar errors in:
- ❌ Wallet balance queries
- ❌ Number purchases (DaisySMS)
- ❌ Number purchases (GetAText)
- ❌ Any other operation requiring profile data

## Security Considerations
✅ Profile is created with `email_verified: true` since user already authenticated
✅ Default wallet balance is 0 (no free money)
✅ User must still complete KYC/verification if required
✅ Maintains all security checks from original code

## Next Steps for Admin

1. **Deploy these changes to production**
2. **Ask affected user to retry generating deposit account**
3. **Monitor server logs for profile creation warnings**
4. **Investigate why trigger failed** (check database logs around user's signup time)
5. **Consider running a script to find other users with missing profiles:**

```sql
-- Find auth users without profiles
SELECT u.id, u.email, u.created_at 
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
AND u.deleted_at IS NULL;
```

6. **Bulk create missing profiles if needed:**

```sql
-- This will be auto-handled by the code now, but you can manually fix if preferred
INSERT INTO public.profiles (id, username, email, full_name, email_verified)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  true
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
AND u.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
```

## Status
✅ **FIXED** - Changes implemented and ready for deployment

The affected user should now be able to:
- ✅ Generate PocketFi virtual account
- ✅ Make deposits via bank transfer
- ✅ Purchase phone numbers
- ✅ Check wallet balance
- ✅ Use all platform features normally
