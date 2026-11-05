# 🚨 SIMPLE FIX - DO THIS NOW

Your profile is missing. Here's the fastest fix:

---

## ⚡ OPTION 1: Run SQL (2 Minutes - FASTEST!)

### Step 1: Login to Supabase
Go to: **https://supabase.com/dashboard/sign-in**

If you forgot your password:
1. Click "Forgot Password?"
2. Enter your email
3. Check inbox and reset

### Step 2: Open SQL Editor
**https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn/sql/new**

### Step 3: Copy This SQL

```sql
DO $$
DECLARE user_id_var uuid;
BEGIN
  SELECT id INTO user_id_var FROM auth.users WHERE email = 'rehobothekene@gmail.com';
  
  INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
  VALUES (user_id_var, 'topper', 'rehobothekene@gmail.com', 'Ekene', true, 0, false)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, updated_at = now();
  
  INSERT INTO public.user_roles (user_id, role) VALUES (user_id_var, 'user') ON CONFLICT DO NOTHING;
END $$;

SELECT * FROM public.profiles WHERE email = 'rehobothekene@gmail.com';
```

### Step 4: Click RUN

You should see your profile data.

### Step 5: Test Your App
1. **Clear browser cache**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Logout** from https://www.hammzy.ng
3. **Login again**:
   - Email: rehobothekene@gmail.com
   - Password: Ekene123!!
4. **Dashboard → Add Funds**
5. **SHOULD WORK! ✅**

---

## 💡 OPTION 2: Can't Access Supabase?

Tell me and I'll create a different way to fix it.

But Option 1 is the fastest - takes 2 minutes!

---

## 📁 Detailed SQL File

For the complete SQL with all checks and notices, see:
**`RUN-THIS-SQL-NOW.sql`**

Just copy that entire file into Supabase SQL editor.

---

**DO OPTION 1 NOW - It will work! 🚀**
