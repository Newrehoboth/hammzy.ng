import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  console.log("Attempting sign in as admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hammzydigital@gmail.com',
    password: 'admin123',
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    return;
  }

  console.log("Sign in successful. User ID:", authData.user.id);
  const token = authData.session.access_token;
  
  // Set the session header
  supabase.auth.setSession({
    access_token: token,
    refresh_token: authData.session.refresh_token,
  });

  // Query profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id,email,username,wallet_balance,pocketfi_account_number,created_at').order('created_at', { ascending: false });
  console.log("\n=== PROFILES ===");
  if (pErr) console.error("Error:", pErr);
  else console.log(JSON.stringify(profiles, null, 2));

  // Query orders
  const { data: orders, error: oErr } = await supabase.from('orders').select('id,user_id,number,country,provider,service,price,status,created_at').order('created_at', { ascending: false });
  console.log("\n=== ORDERS ===");
  if (oErr) console.error("Error:", oErr);
  else console.log(JSON.stringify(orders, null, 2));

  // Query payments
  const { data: payments, error: payErr } = await supabase.from('payments').select('id,user_id,reference,amount,status,created_at').order('created_at', { ascending: false });
  console.log("\n=== PAYMENTS ===");
  if (payErr) console.error("Error:", payErr);
  else console.log(JSON.stringify(payments, null, 2));

  // Query log purchases
  const { data: logPurchases, error: lpErr } = await supabase.from('log_purchases').select('id,user_id,platform,type,price,created_at').order('created_at', { ascending: false });
  console.log("\n=== LOG PURCHASES ===");
  if (lpErr) console.error("Error:", lpErr);
  else console.log(JSON.stringify(logPurchases, null, 2));
}

main();
