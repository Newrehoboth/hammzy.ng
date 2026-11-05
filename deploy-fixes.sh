#!/bin/bash

echo ""
echo "🚀 Deploying PocketFi Security Fixes"
echo "============================================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found project directory"
echo ""

# Show what will be committed
echo "📋 Files to be committed:"
echo "------------------------------------------------------------"
git status --short
echo ""

# Ask for confirmation
read -p "Do you want to commit and deploy these changes? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "📦 Staging files..."
git add src/components/pocketfi-deposit.tsx
git add src/routes/webhook.pocketfi.ts
git add START-HERE.md
git add SOLUTION-POCKETFI-WORKING.md
git add FIX-POCKETFI-PAYMENT.md
git add RECOVER-SUPABASE-ACCESS.md
git add test-pocketfi-simple.sh
git add deploy-fixes.sh

echo "✅ Files staged"
echo ""

echo "💾 Committing changes..."
git commit -m "Security fix: Enable PocketFi webhook signature verification

- Fixed webhook security vulnerability (was bypassed before)
- Added proper signature verification to prevent fake deposits
- Improved error messages for better user experience
- Added diagnostic tools and documentation
- PocketFi API tested and confirmed working"

if [ $? -ne 0 ]; then
    echo "❌ Commit failed"
    exit 1
fi

echo "✅ Changes committed"
echo ""

echo "🚀 Pushing to remote repository..."
git push

if [ $? -ne 0 ]; then
    echo "❌ Push failed"
    echo ""
    echo "Try running: git push"
    exit 1
fi

echo "✅ Pushed to remote"
echo ""

echo "============================================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================================"
echo ""
echo "📊 Next Steps:"
echo ""
echo "1. If using Vercel/auto-deploy:"
echo "   → Check deployment status in your dashboard"
echo "   → Wait 1-2 minutes for build to complete"
echo ""
echo "2. If manual deployment needed:"
echo "   → Run: vercel --prod"
echo "   → Or your deployment command"
echo ""
echo "3. Test the fix:"
echo "   → Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   → Login to your app"
echo "   → Go to Dashboard → Add Funds"
echo "   → Should now work! ✅"
echo ""
echo "4. Monitor logs:"
echo "   → Watch for '[PocketFi] Creating account...'"
echo "   → Should see success messages"
echo ""
echo "🎉 Your PocketFi integration should now work correctly!"
echo ""
