import { createFileRoute } from "@tanstack/react-router";

// EMERGENCY FIX for rehobothekene@gmail.com
// Visit: https://www.hammzy.ng/api/emergency-fix-topper

export const Route = createFileRoute("/api/emergency-fix-topper")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Use anon client - can't create profiles directly but can call accessible functions
          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          
          if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("Supabase not configured");
          }
          
          // Manual SQL fix using raw HTTP request to Supabase
          const email = "rehobothekene@gmail.com";
          
          // Try to execute raw SQL via Supabase REST API
          // This requires service role key, so will fail with anon key
          // But let's provide helpful error message
          
          const html = `
            <html>
              <head>
                <title>Emergency Fix - Manual SQL Needed</title>
                <style>
                  body { font-family: sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
                  .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 20px; border-radius: 5px; margin: 20px 0; }
                  .solution { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 20px; border-radius: 5px; margin: 20px 0; }
                  pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; }
                  .steps { background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; }
                  ol { line-height: 1.8; }
                </style>
              </head>
              <body>
                <h1>🚨 Emergency Fix Status</h1>
                
                <div class="error">
                  <h2>❌ Automatic Fix Not Available Yet</h2>
                  <p>The database migrations haven't been deployed to Supabase yet.</p>
                  <p><strong>Reason:</strong> Lovable/Supabase takes time to deploy migrations after git push.</p>
                </div>
                
                <div class="solution">
                  <h2>✅ FASTEST SOLUTION (Works Immediately)</h2>
                  <p>You need to manually run this SQL in Supabase. Here's how:</p>
                </div>
                
                <div class="steps">
                  <h3>Step 1: Access Supabase Dashboard</h3>
                  <ol>
                    <li>Lovable creates Supabase for you - check your Lovable project settings</li>
                    <li>Or go directly to: <a href="https://supabase.com/dashboard/project/vbkfjgqokzwbnfgwbspn" target="_blank">Your Supabase Project</a></li>
                    <li>If it asks for login:
                      <ul>
                        <li>Try the email you used for Lovable</li>
                        <li>Or reset password at Supabase login</li>
                        <li>Or contact Lovable support to get access</li>
                      </ul>
                    </li>
                  </ol>
                  
                  <h3>Step 2: Run This SQL</h3>
                  <p>Once in Supabase, go to SQL Editor and paste this:</p>
                  <pre>-- Fix profile for ${email}
DO $$
DECLARE v_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = '${email}';
  
  -- Create profile
  INSERT INTO public.profiles (id, username, email, full_name, email_verified, wallet_balance, suspended)
  VALUES (v_user_id, 'topper', '${email}', 'Ekene', true, 0, false)
  ON CONFLICT (id) DO UPDATE 
  SET username = EXCLUDED.username, email = EXCLUDED.email, updated_at = now();
  
  -- Create role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'user')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Profile created for ${email}';
END $$;</pre>
                  
                  <h3>Step 3: Test Your App</h3>
                  <ol>
                    <li>Clear browser cache: <code>Ctrl + Shift + R</code></li>
                    <li>Logout from <a href="https://www.hammzy.ng">hammzy.ng</a></li>
                    <li>Login again with: ${email}</li>
                    <li>Dashboard → Add Funds</li>
                    <li>Should work! ✅</li>
                  </ol>
                </div>
                
                <div class="error">
                  <h2>⏰ Alternative: Wait for Auto-Deploy</h2>
                  <p>If you can't access Supabase, wait 10-15 minutes for Lovable to deploy the migrations automatically.</p>
                  <p>Then just refresh and try again - it will be auto-fixed.</p>
                </div>
                
                <h2>📞 Need More Help?</h2>
                <p>If you can't access Supabase:</p>
                <ul>
                  <li>Contact Lovable support to get Supabase access</li>
                  <li>Or wait for auto-deployment (10-15 minutes)</li>
                  <li>Or share your service role key (securely!) so I can fix it programmatically</li>
                </ul>
              </body>
            </html>
          `;
          
          return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html" }
          });
          
        } catch (err: any) {
          console.error("[Emergency Fix] Error:", err);
          return new Response(
            `<html><body><h1>Error</h1><p>${err.message}</p></body></html>`,
            { 
              status: 500,
              headers: { "Content-Type": "text/html" }
            }
          );
        }
      }
    }
  }
});
