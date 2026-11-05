import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'hammzydigital@gmail.com',
    password: 'admin123',
  });
  if (authError) {
    console.error("Sign in failed:", authError.message);
    return;
  }
  supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });

  // Find user by email
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'rehobothekene@gmail.com');

  if (pErr || !profiles || profiles.length === 0) {
    console.log("No profile found for rehobothekene@gmail.com");
    console.log("Error:", pErr);
    return;
  }

  const user = profiles[0];
  console.log("=== USER PROFILE ===");
  console.log(JSON.stringify(user, null, 2));

  const userId = user.id;

  // Query user's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log("\n=== USER ORDERS ===");
  console.log(JSON.stringify(orders, null, 2));

  // Query user's payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log("\n=== USER PAYMENTS ===");
  console.log(JSON.stringify(payments, null, 2));

  // Query user's log purchases
  const { data: logPurchases } = await supabase
    .from('log_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  console.log("\n=== USER LOG PURCHASES ===");
  console.log(JSON.stringify(logPurchases, null, 2));
}

main();
