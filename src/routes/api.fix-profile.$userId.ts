import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/fix-profile/$userId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { userId } = params;
          
          // Import Supabase admin client
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          
          // Get user from auth
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
          
          if (authError || !authUser) {
            return new Response(
              JSON.stringify({ 
                error: "User not found",
                userId,
                message: "No auth user exists with this ID"
              }),
              { 
                status: 404,
                headers: { "Content-Type": "application/json" }
              }
            );
          }
          
          const email = authUser.user.email;
          const username = authUser.user.user_metadata?.username || email?.split('@')[0] || 'user';
          const fullName = authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.username || username;
          
          // Check if profile already exists
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          
          if (existingProfile) {
            return new Response(
              JSON.stringify({ 
                success: true,
                message: "Profile already exists",
                profile: existingProfile
              }),
              { 
                status: 200,
                headers: { "Content-Type": "application/json" }
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
              JSON.stringify({ 
                error: "Failed to create profile",
                details: profileError.message
              }),
              { 
                status: 500,
                headers: { "Content-Type": "application/json" }
              }
            );
          }
          
          // Create user role
          await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: userId,
              role: "user"
            })
            .select();
          
          return new Response(
            JSON.stringify({ 
              success: true,
              message: "Profile created successfully!",
              profile: newProfile,
              nextSteps: [
                "Clear your browser cache (Ctrl+Shift+R)",
                "Logout and login again",
                "Go to Dashboard → Add Funds",
                "Should work now!"
              ]
            }),
            { 
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
          
        } catch (err: any) {
          console.error("[Fix Profile] Error:", err);
          return new Response(
            JSON.stringify({ 
              error: "Internal server error",
              message: err.message
            }),
            { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      }
    }
  }
});
