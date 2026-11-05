import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function main() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'hammzydigital@gmail.com',
    password: 'admin123',
  });
  supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });

  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, country, provider, service, price, status, created_at')
    .eq('user_id', 'cb96d3e9-0c6d-4b50-94d0-5b8c9e7d3f96')
    .order('created_at', { ascending: false });

  console.log("ALL USER ORDERS:", JSON.stringify(orders, null, 2));
}

main();
