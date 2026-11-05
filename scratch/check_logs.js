import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Parse .env manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*["']?([^"'\r\n]+)["']?/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  }
}
loadEnv();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function check() {
  console.log("Supabase URL:", process.env.SUPABASE_URL);

  // Get log products
  const { data: products, error: pError } = await supabase
    .from('log_products')
    .select('*');

  if (pError) {
    console.error("Error fetching log_products:", pError);
  } else {
    console.log("Log products:", products);
  }

  // Get log items stock counts
  const { data: stock, error: sError } = await supabase
    .from('log_items')
    .select('id, product_id, sold');

  if (sError) {
    console.error("Error fetching log_items:", sError);
  } else {
    // Count unsold items
    const unsoldCounts = {};
    stock.forEach(item => {
      if (!item.sold) {
        unsoldCounts[item.product_id] = (unsoldCounts[item.product_id] || 0) + 1;
      }
    });
    console.log("Unsold items count per product:", unsoldCounts);
  }
}

check();
