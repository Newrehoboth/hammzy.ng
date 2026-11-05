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

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'rehobothekene@gmail.com');

  console.log("PROFILE:", JSON.stringify(profiles[0], null, 2));
}

main();
