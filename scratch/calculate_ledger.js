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

  const userId = 'cb96d3e9-0c6d-4b50-94d0-5b8c9e7d3f96';

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  const { data: payments } = await supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  const { data: orders } = await supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  const { data: logPurchases } = await supabase.from('log_purchases').select('*').eq('user_id', userId).order('created_at', { ascending: true });

  console.log("=== PROFILE ===");
  console.log("Current wallet_balance in DB:", profile.wallet_balance);

  console.log("\n=== LEDGER CALCULATION ===");
  let balance = 0;
  
  console.log("Starting balance: 0");

  const timeline = [];

  payments.forEach(p => {
    timeline.push({
      type: 'deposit',
      amount: Number(p.amount),
      date: new Date(p.created_at),
      desc: `Deposit ref: ${p.reference}`
    });
  });

  orders.forEach(o => {
    timeline.push({
      type: 'order',
      amount: -Number(o.price),
      status: o.status,
      date: new Date(o.created_at),
      desc: `Order for ${o.service} (${o.number}) [Status: ${o.status}]`
    });
  });

  logPurchases.forEach(lp => {
    timeline.push({
      type: 'log_purchase',
      amount: -Number(lp.price),
      date: new Date(lp.created_at),
      desc: `Log Purchase: ${lp.platform} (${lp.type})`
    });
  });

  // Sort timeline chronologically
  timeline.sort((a, b) => a.date - b.date);

  timeline.forEach(item => {
    const oldBalance = balance;
    if (item.type === 'deposit') {
      balance += item.amount;
      console.log(`[${item.date.toISOString()}] +₦${item.amount} | Balance: ₦${balance} | ${item.desc}`);
    } else if (item.type === 'log_purchase') {
      balance += item.amount;
      console.log(`[${item.date.toISOString()}] -₦${Math.abs(item.amount)} | Balance: ₦${balance} | ${item.desc}`);
    } else if (item.type === 'order') {
      // For orders: deduct price
      balance += item.amount;
      console.log(`[${item.date.toISOString()}] -₦${Math.abs(item.amount)} | Balance: ₦${balance} | ${item.desc}`);
      
      // If status is cancelled/canceled/timeout/banned, it should refund
      const s = item.status.toLowerCase();
      if (['canceled', 'cancelled', 'timeout', 'banned'].includes(s)) {
        const refund = Math.abs(item.amount);
        balance += refund;
        console.log(`[${item.date.toISOString()}] +₦${refund} (REFUND) | Balance: ₦${balance} | Refund for cancelled order`);
      }
    }
  });

  console.log("\nCalculated Expected Balance:", balance);
  console.log("Difference (DB Balance - Expected):", profile.wallet_balance - balance);
}

main();
