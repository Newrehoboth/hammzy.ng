#!/bin/bash

# Emergency Account Fix for rehobothekene@gmail.com
# This will create your missing profile automatically

echo ""
echo "🔧 Emergency Account Fix"
echo "============================================================"
echo ""

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep SUPABASE | xargs)
fi

SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_PUBLISHABLE_KEY}"
EMAIL="rehobothekene@gmail.com"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ ERROR: Supabase credentials not found"
    exit 1
fi

echo "✅ Found Supabase credentials"
echo ""

# Step 1: Get user ID
echo "1️⃣  Finding your user ID..."
echo "------------------------------------------------------------"

USER_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email" \
  -X POST \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_email\": \"${EMAIL}\"}")

echo "Response: $USER_RESPONSE"
echo ""

# Try alternative method - query auth.users directly won't work with anon key
# So we need to use a different approach

echo "❌ Cannot query auth.users with anon key"
echo ""
echo "============================================================"
echo "⚡ MANUAL FIX REQUIRED"
echo "============================================================"
echo ""
echo "Please follow these steps:"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard/sign-in"
echo ""
echo "2. Reset your password if needed:"
echo "   - Click 'Forgot Password?'"
echo "   - Check email: rehobothekene@gmail.com"
echo ""
echo "3. Once logged in, go to SQL Editor:"
echo "   https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn/sql/new"
echo ""
echo "4. Paste and run this SQL:"
echo ""
echo "------------------------------------------------------------"
cat << 'EOF'
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'rehobothekene@gmail.com';

-- Copy the ID from above, then replace USER_ID_HERE below and run:
INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
VALUES (
  'USER_ID_HERE',
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
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify it worked
SELECT * FROM public.profiles WHERE email = 'rehobothekene@gmail.com';
EOF
echo "------------------------------------------------------------"
echo ""
echo "5. After running SQL, refresh your app and try Add Funds again"
echo ""
echo "OR..."
echo ""
echo "============================================================"
echo "⚡ FASTER FIX: Use the deployed app!"
echo "============================================================"
echo ""
echo "The latest code has auto-fix built in. Just deploy:"
echo ""
echo "  git add ."
echo "  git commit -m 'Fix profile auto-creation'"
echo "  git push"
echo ""
echo "Wait 2 minutes for deployment, then:"
echo "1. Clear browser cache (Ctrl+Shift+R)"
echo "2. Login again"
echo "3. Try Add Funds - it should auto-create your profile!"
echo ""
