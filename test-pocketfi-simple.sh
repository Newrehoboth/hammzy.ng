#!/bin/bash

# PocketFi API Test Script
# Simple curl-based test

echo ""
echo "🔍 PocketFi Diagnostic Test"
echo ""
echo "============================================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

BUSINESS_ID="${POCKETFI_BUSINESS_ID:-30311}"
PUBLIC_KEY="${POCKETFI_PUBLIC_KEY}"

echo ""
echo "1️⃣  Environment Variables Check:"
echo "------------------------------------------------------------"
echo "✓ BUSINESS_ID: $BUSINESS_ID"
if [ -n "$PUBLIC_KEY" ]; then
    echo "✓ PUBLIC_KEY: ${PUBLIC_KEY:0:20}... (${#PUBLIC_KEY} chars)"
else
    echo "❌ PUBLIC_KEY: MISSING"
    echo ""
    echo "ERROR: POCKETFI_PUBLIC_KEY not found in .env file"
    exit 1
fi

echo ""
echo "2️⃣  Testing PocketFi API Connection:"
echo "------------------------------------------------------------"
echo "📡 Calling: https://api.pocketfi.ng/api/v1/virtual-accounts/fetch"
echo ""

# Make API call and capture response
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "https://api.pocketfi.ng/api/v1/virtual-accounts/fetch?businessId=$BUSINESS_ID" \
  -H "Authorization: Bearer $PUBLIC_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json")

# Split response and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

echo "📥 Response Status: $HTTP_STATUS"
echo ""
echo "📄 Response Data:"
echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Analyze results
if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ SUCCESS: PocketFi API is working!"
    echo ""
    echo "🎉 Your PocketFi integration is ACTIVE!"
    echo ""
    echo "If deposits still don't work in your app, check:"
    echo "  1. Browser console for JavaScript errors"
    echo "  2. Supabase database connection"
    echo "  3. User profile has correct fields"
    
elif [ "$HTTP_STATUS" == "401" ]; then
    echo "❌ FAILED: Unauthorized (401)"
    echo ""
    echo "🔴 ERROR TYPE: Invalid or Expired Credentials"
    echo ""
    echo "Possible causes:"
    echo "  - API key is invalid or expired"
    echo "  - API key was revoked by PocketFi"
    echo "  - Account may be suspended"
    echo ""
    echo "⚡ ACTION REQUIRED:"
    echo "  Contact PocketFi support immediately!"
    echo "  Website: https://pocketfi.ng"
    echo "  Mention Business ID: $BUSINESS_ID"
    
elif [ "$HTTP_STATUS" == "403" ]; then
    echo "❌ FAILED: Forbidden (403)"
    echo ""
    echo "🔴 ERROR TYPE: Account Suspended or Restricted"
    echo ""
    echo "⚡ URGENT ACTION REQUIRED:"
    echo "  Your PocketFi account appears to be suspended!"
    echo "  Contact: https://pocketfi.ng"
    echo "  Business ID: $BUSINESS_ID"
    
elif [ "$HTTP_STATUS" -ge 500 ]; then
    echo "🟡 Server Error ($HTTP_STATUS)"
    echo ""
    echo "PocketFi service may be temporarily down"
    echo ""
    echo "⚡ ACTION:"
    echo "  Try again in a few minutes"
    echo "  If persists, contact PocketFi support"
    
else
    echo "❌ Unexpected response: $HTTP_STATUS"
    echo ""
    echo "⚡ ACTION: Contact PocketFi support"
fi

echo ""
echo "============================================================"
echo ""
