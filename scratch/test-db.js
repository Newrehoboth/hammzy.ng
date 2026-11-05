import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually parse .env file to avoid dependency issues
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY
);

async function test() {
  console.log("Checking profiles table...");
  const { data, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error("Error reading profiles:", error);
  } else {
    console.log("Profiles found:", JSON.stringify(data, null, 2));
  }
}

test();
