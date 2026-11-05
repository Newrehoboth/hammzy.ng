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

  const email = 'rehobothekene@gmail.com';
  const refundAmount = 644.49;

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, wallet_balance')
    .eq('email', email)
    .single();

  if (pErr || !profile) {
    console.error("User profile not found:", pErr);
    return;
  }

  const currentBalance = Number(profile.wallet_balance ?? 0);
  const newBalance = currentBalance + refundAmount;

  // Let's use the admin RPC function to add the balance safely
  const { data: resBalance, error: rpcError } = await supabase.rpc('rpc_admin_add_balance', {
    p_user_id: profile.id,
    p_amount: refundAmount
  });

  if (rpcError) {
    console.error("RPC balance adjustment failed, trying direct update:", rpcError);
    const { error: uErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', profile.id);
    
    if (uErr) {
      console.error("Direct update failed too:", uErr);
    } else {
      console.log(`Successfully credited user ${email} directly. New balance: ₦${newBalance}`);
    }
  } else {
    console.log(`Successfully credited user ${email} via admin RPC. New balance: ₦${resBalance}`);
  }
}

main();
