#!/bin/bash

# EMERGENCY FIX: Create profile for rehobothekene@gmail.com
# This uses Supabase REST API directly

echo ""
echo "🚨 EMERGENCY PROFILE FIX"
echo "============================================================"
echo ""

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | grep SUPABASE | xargs)
fi

SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_PUBLISHABLE_KEY}"
EMAIL="rehobothekene@gmail.com"

echo "Target: $EMAIL"
echo "URL: $SUPABASE_URL"
echo ""

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Missing Supabase credentials"
    exit 1
fi

echo "Attempting to call emergency fix RPC..."
echo ""

# Try calling the RPC function
RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/rpc_emergency_fix_profile" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"p_email\": \"${EMAIL}\"}")

echo "Response:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ SUCCESS! Profile created!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Clear browser cache (Ctrl+Shift+R)"
    echo "2. Logout from https://www.hammzy.ng"
    echo "3. Login again"
    echo "4. Try Add Funds - should work!"
    echo ""
elif echo "$RESPONSE" | grep -q "function.*not.*found"; then
    echo "⚠️  RPC function not deployed yet"
    echo ""
    echo "The database migration hasn't run yet."
    echo ""
    echo "Options:"
    echo "1. Wait 5-10 minutes for Lovable to deploy"
    echo "2. Try visiting: https://www.hammzy.ng/api/fix-my-profile?email=$EMAIL"
    echo "3. Run migrations manually in Supabase"
    echo ""
else
    echo "❌ Unexpected response"
    echo ""
    echo "Try:"
    echo "1. Wait for deployment to complete"
    echo "2. Visit: https://www.hammzy.ng/api/fix-my-profile?email=$EMAIL"
    echo ""
fi
