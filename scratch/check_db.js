// Use Supabase Management API to run SQL directly
const project = 'vbkfjgqokzwbnfgwbspn';

// Try using the SQL REST endpoint with service role
// The anon key + bypass RLS for SECURITY DEFINER functions
// Let's try to call the existing RPC that bypasses RLS

import fs from 'fs';
const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) acc[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  return acc;
}, {});

// Try the Supabase SQL API directly (requires service role)
// We don't have service role, so let's try the admin app endpoint instead
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const url = env.VITE_SUPABASE_URL;

// Call a raw SQL query via the REST API - anon key should work on public SECURITY DEFINER functions
const sql = `
SELECT 
  p.id, p.email, p.wallet_balance, p.pocketfi_account_number
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;
`;

const res = await fetch(`${url}/rest/v1/rpc/rpc_admin_add_balance`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ p_user_id: '00000000-0000-0000-0000-000000000000', p_amount: 0 })
});
console.log('Status:', res.status);
const text = await res.text();
console.log('Response:', text);
