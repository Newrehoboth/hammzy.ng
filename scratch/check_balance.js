import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length) acc[key.trim()] = val.join('=').replace(/^"|"$/g, '').trim();
  return acc;
}, {});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function main() {
  // Get profiles
  const { data: users, error: uErr } = await supabase.from('profiles').select('*').limit(5);
  console.log("PROFILES:", JSON.stringify(users, null, 2));
  if (uErr) console.log("Profile Error:", JSON.stringify(uErr));

  // Get recent orders
  const { data: orders, error: oErr } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
  console.log("RECENT ORDERS:", JSON.stringify(orders, null, 2));
  if (oErr) console.log("Order Error:", JSON.stringify(oErr));
}
main();
