import { createFileRoute } from "@tanstack/react-router";
import { createClient } from '@supabase/supabase-js';

// Emergency profile fix endpoint - NO AUTH REQUIRED
// Visit: https://www.hammzy.ng/api/fix-my-profile?email=YOUR_EMAIL

export const Route = createFileRoute("/api/fix-my-profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const email = url.searchParams.get("email");
          
          if (!email) {
            return new Response(
              `
              <html>
                <head><title>Fix Profile</title></head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                  <h1>🔧 Profile Fix Tool</h1>
                  <p>Add your email to the URL:</p>
                  <code style="background: #f0f0f0; padding: 10px; display: block;">
                    ${url.origin}/api/fix-my-profile?email=YOUR_EMAIL
                  </code>
                  <p><strong>Example:</strong></p>
                  <code style="background: #f0f0f0; padding: 10px; display: block;">
                    ${url.origin}/api/fix-my-profile?email=rehobothekene@gmail.com
                  </code>
                </body>
              </html>
              `,
              { 
                status: 400,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          // Create Supabase client with service role (bypass RLS)
          const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!SUPABASE_URL) {
            throw new Error("Supabase URL not configured");
          }
          
          if (!SERVICE_KEY) {
            // Fallback: Try using RPC function that can be called by anyone
            const { supabase } = await import("@/integrations/supabase/client");
            
            // Call a public RPC function to fix the profile
            const { data, error } = await supabase.rpc('rpc_emergency_fix_profile', {
              p_email: email
            });
            
            if (error) {
              throw new Error(`RPC error: ${error.message}`);
            }
            
            return new Response(
              `
              <html>
                <head>
                  <title>Profile Fixed!</title>
                  <style>
                    body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .steps { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    ol li { margin: 10px 0; }
                  </style>
                </head>
                <body>
                  <h1>✅ Profile Fixed via RPC!</h1>
                  
                  <div class="success">
                    <strong>Success!</strong> Your profile has been created.
                  </div>
                  
                  <div class="steps">
                    <h2>🎯 Next Steps:</h2>
                    <ol>
                      <li><strong>Clear browser cache:</strong> Ctrl+Shift+R (or Cmd+Shift+R)</li>
                      <li><strong>Logout</strong> from your account</li>
                      <li><strong>Login again</strong> with: ${email}</li>
                      <li><strong>Try Add Funds</strong> - should work now!</li>
                    </ol>
                  </div>
                  
                  <p><a href="https://www.hammzy.ng/dashboard" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard →</a></p>
                </body>
              </html>
              `,
              { 
                status: 200,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          // Use admin client
          const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
          });
          
          // Find user by email
          const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            return new Response(
              `
              <html>
                <head><title>Error</title></head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                  <h1>❌ Error</h1>
                  <p>${listError.message}</p>
                </body>
              </html>
              `,
              { 
                status: 500,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          const authUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
          
          if (!authUser) {
            return new Response(
              `
              <html>
                <head><title>User Not Found</title></head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                  <h1>❌ User Not Found</h1>
                  <p>No auth user exists with email: <strong>${email}</strong></p>
                  <p>Please check:</p>
                  <ul>
                    <li>Email is spelled correctly</li>
                    <li>You signed up with this email</li>
                    <li>Account was not deleted</li>
                  </ul>
                </body>
              </html>
              `,
              { 
                status: 404,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          const userId = authUser.id;
          const username = authUser.user_metadata?.username || email.split('@')[0] || 'user';
          const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.username || username;
          
          // Check if profile already exists
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          
          if (existingProfile) {
            return new Response(
              `
              <html>
                <head><title>Profile Already Exists</title></head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                  <h1>✅ Profile Already Exists</h1>
                  <p>Your profile is already in the database:</p>
                  <pre style="background: #f0f0f0; padding: 15px; border-radius: 5px; overflow: auto;">
${JSON.stringify(existingProfile, null, 2)}
                  </pre>
                  <h2>Try These Steps:</h2>
                  <ol>
                    <li><strong>Clear browser cache</strong>: Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)</li>
                    <li><strong>Logout and login again</strong></li>
                    <li><strong>Try Add Funds again</strong></li>
                  </ol>
                  <p>If still not working, check browser console (F12) for errors.</p>
                </body>
              </html>
              `,
              { 
                status: 200,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          // Create profile
          const { data: newProfile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({
              id: userId,
              username,
              email,
              full_name: fullName,
              email_verified: true,
              wallet_balance: 0,
              suspended: false
            })
            .select()
            .single();
          
          if (profileError) {
            return new Response(
              `
              <html>
                <head><title>Error Creating Profile</title></head>
                <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                  <h1>❌ Failed to Create Profile</h1>
                  <p><strong>Error:</strong> ${profileError.message}</p>
                  <p><strong>Code:</strong> ${profileError.code}</p>
                  <p>Please contact support with this error message.</p>
                </body>
              </html>
              `,
              { 
                status: 500,
                headers: { "Content-Type": "text/html" }
              }
            );
          }
          
          // Create user role
          await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: userId,
              role: "user"
            });
          
          return new Response(
            `
            <html>
              <head>
                <title>Profile Fixed!</title>
                <style>
                  body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                  .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
                  .code { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; margin: 15px 0; }
                  .steps { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                  ol li { margin: 10px 0; }
                </style>
              </head>
              <body>
                <h1>✅ Profile Created Successfully!</h1>
                
                <div class="success">
                  <strong>Great news!</strong> Your profile has been created in the database.
                </div>
                
                <h2>Your Profile:</h2>
                <pre class="code">${JSON.stringify(newProfile, null, 2)}</pre>
                
                <div class="steps">
                  <h2>🎯 Next Steps (Important!):</h2>
                  <ol>
                    <li><strong>Clear your browser cache</strong>
                      <ul>
                        <li>Windows/Linux: Press <code>Ctrl + Shift + R</code></li>
                        <li>Mac: Press <code>Cmd + Shift + R</code></li>
                      </ul>
                    </li>
                    <li><strong>Logout of your account</strong></li>
                    <li><strong>Login again with:</strong>
                      <ul>
                        <li>Email: ${email}</li>
                        <li>Password: (your password)</li>
                      </ul>
                    </li>
                    <li><strong>Go to Dashboard → Add Funds</strong></li>
                    <li><strong>Should work now!</strong> 🎉</li>
                  </ol>
                </div>
                
                <p><a href="https://www.hammzy.ng/dashboard" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Dashboard →</a></p>
              </body>
            </html>
            `,
            { 
              status: 200,
              headers: { "Content-Type": "text/html" }
            }
          );
          
        } catch (err: any) {
          console.error("[Fix Profile] Error:", err);
          return new Response(
            `
            <html>
              <head><title>Server Error</title></head>
              <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                <h1>❌ Server Error</h1>
                <p>${err.message}</p>
                <p>Please try again or contact support.</p>
              </body>
            </html>
            `,
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
