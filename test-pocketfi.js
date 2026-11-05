#!/usr/bin/env node
/**
 * PocketFi API Test Script
 * Run: node test-pocketfi.js
 */

import { config } from 'dotenv';
config();

const BUSINESS_ID = process.env.POCKETFI_BUSINESS_ID || "30311";
const PUBLIC_KEY = process.env.POCKETFI_PUBLIC_KEY || "";
const SECRET_KEY = process.env.POCKETFI_SECRET_KEY || "";

console.log('\n🔍 PocketFi Diagnostic Test\n');
console.log('=' .repeat(60));

// Step 1: Check environment variables
console.log('\n1️⃣  Environment Variables Check:');
console.log('-'.repeat(60));
console.log(`✓ BUSINESS_ID: ${BUSINESS_ID}`);
console.log(`✓ PUBLIC_KEY: ${PUBLIC_KEY ? `${PUBLIC_KEY.substring(0, 20)}... (${PUBLIC_KEY.length} chars)` : '❌ MISSING'}`);
console.log(`✓ SECRET_KEY: ${SECRET_KEY ? `${SECRET_KEY.substring(0, 20)}... (${SECRET_KEY.length} chars)` : '❌ MISSING'}`);

if (!PUBLIC_KEY || !SECRET_KEY) {
  console.log('\n❌ ERROR: Missing API credentials!');
  console.log('   Please check your .env file.');
  process.exit(1);
}

// Step 2: Test API connection
console.log('\n2️⃣  Testing PocketFi API Connection:');
console.log('-'.repeat(60));

async function testPocketFiAPI() {
  const url = `https://api.pocketfi.ng/api/v1/virtual-accounts/fetch?businessId=${BUSINESS_ID}`;
  
  console.log(`📡 Calling: ${url}`);
  console.log(`🔑 Using Authorization: Bearer ${PUBLIC_KEY.substring(0, 20)}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: PocketFi API is working!');
      console.log(`   Found ${data.data?.length || 0} virtual account(s)`);
      
      if (data.data && data.data.length > 0) {
        console.log('\n📋 Sample Account:');
        const account = data.data[0];
        console.log(`   Email: ${account.email}`);
        console.log(`   Name: ${account.first_name} ${account.last_name}`);
        console.log(`   Accounts: ${account.accounts?.length || 0}`);
        if (account.accounts && account.accounts[0]) {
          console.log(`   Bank: ${account.accounts[0].bankName}`);
          console.log(`   Account #: ${account.accounts[0].accountNumber}`);
        }
      }
      
      return true;
    } else {
      console.log('\n❌ FAILED: API returned error');
      
      if (response.status === 401) {
        console.log('\n🔴 ERROR TYPE: Unauthorized (401)');
        console.log('   Possible causes:');
        console.log('   - API key is invalid or expired');
        console.log('   - API key was revoked by PocketFi');
        console.log('   - Account may be suspended');
        console.log('\n   ⚡ ACTION: Contact PocketFi support to verify account status');
      } else if (response.status === 403) {
        console.log('\n🔴 ERROR TYPE: Forbidden (403)');
        console.log('   Your account may be suspended or restricted');
        console.log('\n   ⚡ ACTION: Contact PocketFi support immediately');
      } else if (response.status >= 500) {
        console.log('\n🟡 ERROR TYPE: Server Error');
        console.log('   PocketFi service may be down');
        console.log('\n   ⚡ ACTION: Try again in a few minutes or contact PocketFi');
      }
      
      return false;
    }
  } catch (error) {
    console.log('\n❌ NETWORK ERROR:', error.message);
    console.log('   Check your internet connection');
    return false;
  }
}

// Step 3: Test creating a new account
async function testCreateAccount() {
  console.log('\n3️⃣  Testing Account Creation:');
  console.log('-'.repeat(60));
  
  const testData = {
    first_name: "Test",
    last_name: "User",
    email: `test${Date.now()}@example.com`,
    phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
    businessId: BUSINESS_ID,
    bank: "paga"
  };
  
  console.log('📝 Test Account Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch('https://api.pocketfi.ng/api/v1/virtual-accounts/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PUBLIC_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('📄 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data.status) {
      console.log('\n✅ SUCCESS: Can create new accounts!');
      if (data.banks && data.banks[0]) {
        console.log(`   Created Account: ${data.banks[0].accountNumber}`);
        console.log(`   Bank: ${data.banks[0].bankName}`);
        console.log(`   Name: ${data.banks[0].accountName}`);
      }
      return true;
    } else {
      console.log('\n❌ FAILED: Cannot create accounts');
      return false;
    }
  } catch (error) {
    console.log('\n❌ ERROR:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const fetchTest = await testPocketFiAPI();
  
  if (fetchTest) {
    // Only test creation if fetch works
    await testCreateAccount();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:');
  console.log('-'.repeat(60));
  
  if (fetchTest) {
    console.log('✅ PocketFi API is accessible');
    console.log('✅ Your credentials are valid');
    console.log('✅ Account is active');
    console.log('\n💡 If deposits still don\'t work in your app:');
    console.log('   1. Check Supabase database connection');
    console.log('   2. Check browser console for errors');
    console.log('   3. Verify webhook URL is correct');
  } else {
    console.log('❌ PocketFi API is not working');
    console.log('\n🔥 URGENT ACTIONS NEEDED:');
    console.log('   1. Contact PocketFi Support');
    console.log('      - Website: https://pocketfi.ng');
    console.log('      - Mention Business ID: ' + BUSINESS_ID);
    console.log('   2. Ask them to check your account status');
    console.log('   3. Request new API credentials if needed');
    console.log('\n📧 Support Message Template:');
    console.log('   "My Business ID ' + BUSINESS_ID + ' API is returning errors."');
    console.log('   "Please verify account status and provide new credentials."');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
})();
