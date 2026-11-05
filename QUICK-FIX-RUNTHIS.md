# ⚡ QUICK FIX - 2 Minutes

## The Problem
Your user account exists BUT your profile is missing from the database.

## The Solution
Run this SQL in Supabase to create your profile.

---

## Step 1: Login to Supabase

Go to: **https://supabase.com/dashboard/sign-in**

**Email**: Use whatever email you signed up with
**Password**: If you forgot, click "Forgot Password?" and reset it

---

## Step 2: Open SQL Editor

Once logged in, go to:
**https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn/sql/new**

---

## Step 3: Copy and Paste This SQL

```sql
-- Fix for rehobothekene@gmail.com

-- First, find your user ID
DO $$
DECLARE
  user_id_var uuid;
BEGIN
  -- Get user ID
  SELECT id INTO user_id_var 
  FROM auth.users 
  WHERE email = 'rehobothekene@gmail.com';
  
  IF user_id_var IS NULL THEN
    RAISE EXCEPTION 'User not found with email rehobothekene@gmail.com';
  END IF;
  
  RAISE NOTICE 'Found user ID: %', user_id_var;
  
  -- Create profile
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    full_name, 
    email_verified, 
    wallet_balance, 
    suspended
  )
  VALUES (
    user_id_var,
    'topper',
    'rehobothekene@gmail.com',
    'Ekene',
    true,
    0,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();
  
  RAISE NOTICE 'Profile created/updated successfully';
  
  -- Create user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id_var, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'User role created';
  
  -- Show the profile
  RAISE NOTICE 'Your profile:';
END $$;

-- Verify it worked
SELECT 
  id,
  username,
  email,
  full_name,
  wallet_balance,
  email_verified,
  suspended,
  created_at
FROM public.profiles 
WHERE email = 'rehobothekene@gmail.com';
```

---

## Step 4: Click "RUN"

Click the **RUN** button (or press Ctrl+Enter)

You should see:
- ✅ "Profile created/updated successfully"
- ✅ A table showing your profile with:
  - username: topper
  - email: rehobothekene@gmail.com
  - wallet_balance: 0
  - full_name: Ekene

---

## Step 5: Test Your App

1. Go back to: **https://www.hammzy.ng/dashboard**
2. **Clear your browser cache**: Press `Ctrl + Shift + R` (or `Cmd + Shift + R` on Mac)
3. **Logout and login again**:
   - Email: rehobothekene@gmail.com
   - Password: Ekene123!!
4. Click **"Add Funds"**
5. **Should work now!** ✅

---

## Alternative: Can't Access Supabase?

If you can't login to Supabase dashboard, I can create an API endpoint to fix it.

Tell me and I'll make a quick fix URL you can visit.

---

## Why This Happened

Your auth user was created but the trigger that creates profiles failed or wasn't running.

The SQL above manually creates your profile so everything works.

---

## Need Help?

If it doesn't work:
1. Screenshot the SQL result
2. Screenshot any errors
3. Tell me and I'll help immediately

This should take 2 minutes max! 🚀
