#!/usr/bin/env node
/**
 * EMERGENCY: Run this script to fix the profile RIGHT NOW
 * Usage: node run-fix-now.js
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const EMAIL = 'rehobothekene@gmail.com';

console.log('\n🔧 EMERGENCY PROFILE FIX\n');
console.log('='.repeat(60));
console.log(`\nTarget email: ${EMAIL}`);
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Using key: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : 'MISSING'}\n`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function fixProfile() {
  try {
    console.log('1️⃣  Calling emergency fix RPC...\n');
    
    // Try to call the RPC function
    const { data, error } = await supabase.rpc('rpc_emergency_fix_profile', {
      p_email: EMAIL
    });
    
    if (error) {
      console.log(`⚠️  RPC function not available yet: ${error.message}\n`);
      console.log('2️⃣  Trying direct SQL approach via REST API...\n');
      
      // Fallback: Try to insert directly using REST API
      // This works if we have service role key or if RLS allows it
      
      // First, get user from auth (only works with service role key)
      console.log('   Note: This requires service role key to work\n');
      
      console.log('❌ CANNOT FIX AUTOMATICALLY\n');
      console.log('='.repeat(60));
      console.log('\n📋 MANUAL FIX REQUIRED:\n');
      console.log('You need to run the SQL migration manually.');
      console.log('\nOptions:\n');
      console.log('1. Wait for Lovable to deploy migrations (5-10 minutes)');
      console.log('2. Access Supabase dashboard and run migration manually');
      console.log('3. Get the service role key and add to .env\n');
      
      return false;
    }
    
    console.log('✅ Success!\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n='.repeat(60));
    console.log('\n🎉 PROFILE FIXED!\n');
    console.log('Next steps:');
    console.log('1. Clear browser cache (Ctrl+Shift+R)');
    console.log('2. Logout and login again');
    console.log('3. Try Add Funds\n');
    
    return true;
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    return false;
  }
}

fixProfile().then(success => {
  process.exit(success ? 0 : 1);
});
