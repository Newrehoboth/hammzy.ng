import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

async function main() {
  const { data: users, error: uErr } = await supabase.from('profiles').select('*').limit(5);
  console.log("Profiles:", users);

  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(10);
  console.log("Recent Transactions:", txs);
}
main();
