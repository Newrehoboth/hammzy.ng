import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);

    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("id, username, email, full_name, suspended, wallet_balance, created_at")
      .order("created_at", { ascending: false });
    if (profilesError) throw profilesError;

    const { data: roles, error: rolesError } = await context.supabase.from("user_roles").select("user_id, role");
    if (rolesError) throw rolesError;
    
    const { data: orders, error: ordersError } = await context.supabase
      .from("orders")
      .select("user_id, price, status");
    if (ordersError) throw ordersError;

    const { data: logPurchases, error: logPurchasesError } = await context.supabase
      .from("log_purchases")
      .select("user_id, price");
    if (logPurchasesError) throw logPurchasesError;

    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });
    
    const spendMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    
    (orders ?? []).forEach((o) => {
      const status = (o.status || "").toLowerCase();
      const isRefunded = ["canceled", "cancelled", "banned", "timeout"].includes(status);
      if (!isRefunded) {
        spendMap.set(o.user_id, (spendMap.get(o.user_id) ?? 0) + Number(o.price));
      }
      countMap.set(o.user_id, (countMap.get(o.user_id) ?? 0) + 1);
    });

    (logPurchases ?? []).forEach((lp) => {
      spendMap.set(lp.user_id, (spendMap.get(lp.user_id) ?? 0) + Number(lp.price));
      countMap.set(lp.user_id, (countMap.get(lp.user_id) ?? 0) + 1);
    });

    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap.get(p.id) ?? ["user"],
      totalSpent: spendMap.get(p.id) ?? 0,
      orderCount: countMap.get(p.id) ?? 0,
    }));
  });

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    
    const { count: userCount, error: userCountError } = await context.supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    if (userCountError) throw userCountError;

    // Fetch all user profiles to sum up total wallet balances
    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("wallet_balance");
    if (profilesError) throw profilesError;
    const totalUserBalance = (profiles ?? []).reduce((s, p) => s + Number(p.wallet_balance ?? 0), 0);

    const { data: orders, error: ordersError } = await context.supabase.from("orders").select("price, status");
    if (ordersError) throw ordersError;

    const { data: logPurchases, error: logPurchasesError } = await context.supabase.from("log_purchases").select("price");
    if (logPurchasesError) throw logPurchasesError;

    // Calculate revenue from non-refunded orders
    const activeOrders = (orders ?? []).filter((o) => {
      const status = (o.status || "").toLowerCase();
      return !["canceled", "cancelled", "banned", "timeout"].includes(status);
    });
    const ordersRevenue = activeOrders.reduce((s, o) => s + Number(o.price), 0);

    // Calculate revenue from log purchases
    const logsRevenue = (logPurchases ?? []).reduce((s, lp) => s + Number(lp.price), 0);

    let revenue = ordersRevenue + logsRevenue;

    // Fetch successful deposits as main revenue source if they exist
    try {
      const { data: payments } = await context.supabase
        .from("payments")
        .select("amount, status");
      if (payments && payments.length > 0) {
        const successfulDeposits = payments
          .filter((p: any) => p.status?.toLowerCase() === "success")
          .reduce((s: number, p: any) => s + Number(p.amount), 0);
        if (successfulDeposits > 0) {
          revenue = successfulDeposits;
        }
      }
    } catch (e) {
      console.warn("Could not fetch paystack_payments for admin stats:", e);
    }

    return {
      users: userCount ?? 0,
      orders: (orders?.length ?? 0) + (logPurchases?.length ?? 0),
      totalUserBalance,
      revenue,
    };
  });

export const adminRecentOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, number, country, provider, price, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: orders, error: ordersError } = await context.supabase
      .from("orders")
      .select("id, number, country, provider, price, status, created_at, user_id")
      .order("created_at", { ascending: false });
    if (ordersError) throw ordersError;

    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("id, email, username, full_name");
    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p) => {
      profileMap.set(p.id, p);
    });

    return (orders ?? []).map((o) => ({
      ...o,
      user: profileMap.get(o.user_id) ?? { email: "unknown", username: "unknown" },
    }));
  });

export const adminListLogPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: logs, error: logsError } = await context.supabase
      .from("log_purchases")
      .select("id, platform, type, credential, price, created_at, user_id")
      .order("created_at", { ascending: false });
    if (logsError) throw logsError;

    const { data: profiles, error: profilesError } = await context.supabase
      .from("profiles")
      .select("id, email, username, full_name");
    if (profilesError) throw profilesError;

    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p) => {
      profileMap.set(p.id, p);
    });

    return (logs ?? []).map((l) => ({
      ...l,
      user: profileMap.get(l.user_id) ?? { email: "unknown", username: "unknown" },
    }));
  });

export const adminSetSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string(), suspended: z.boolean() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ suspended: data.suspended })
      .eq("id", data.userId);
    if (error) throw error;
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.suspended ? "876000h" : "none",
    });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own admin account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const adminSendEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ 
    userId: z.string(), 
    subject: z.string().min(1), 
    message: z.string().min(1) 
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    
    // Get user profile to fetch their email
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("email, username, full_name")
      .eq("id", data.userId)
      .single();
    
    if (profileError || !profile) throw new Error("User not found");
    if (!profile.email) throw new Error("User has no email address");

    // Send email using Resend API
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const userName = profile.username || profile.full_name || "User";
    
    const { error: sendError } = await resend.emails.send({
      from: "Hammzy Digitals <onboarding@resend.dev>",
      to: profile.email,
      subject: data.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Purple Header -->
            <tr>
              <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                <div style="background-color: rgba(255,255,255,0.15); display: inline-block; padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">HAMMZY DIGITALS UPDATE</p>
                </div>
                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">${data.subject}</h1>
              </td>
            </tr>
            
            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">HAMMZY DIGITALS UPDATE</p>
                
                <h2 style="margin: 0 0 20px 0; color: #111; font-size: 18px; font-weight: 700;">👋 Hello ${userName}!</h2>
                
                <div style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                  ${data.message.split('\n').map(line => `<p style="margin: 0 0 15px 0;">${line}</p>`).join('')}
                </div>
                
                <p style="margin: 30px 0 10px 0; color: #111; font-size: 15px; font-weight: 600;">HAMMZY DIGITALS</p>
                <p style="margin: 0; color: #666; font-size: 14px;">Your Digital Services, Made Simple.</p>
              </td>
            </tr>
            
            <!-- Footer Icons Section -->
            <tr>
              <td style="padding: 30px 30px 40px 30px; border-top: 1px solid #e5e5e5;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding: 10px;">
                      <div style="display: inline-block; text-align: center; margin: 0 15px;">
                        <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                          <span style="font-size: 24px;">📱</span>
                        </div>
                        <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Virtual</p>
                        <p style="margin: 0; color: #999; font-size: 11px;">Numbers</p>
                      </div>
                    </td>
                    <td align="center" style="padding: 10px;">
                      <div style="display: inline-block; text-align: center; margin: 0 15px;">
                        <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                          <span style="font-size: 24px;">👤</span>
                        </div>
                        <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Social</p>
                        <p style="margin: 0; color: #999; font-size: 11px;">Accounts</p>
                      </div>
                    </td>
                    <td align="center" style="padding: 10px;">
                      <div style="display: inline-block; text-align: center; margin: 0 15px;">
                        <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                          <span style="font-size: 24px;">🎁</span>
                        </div>
                        <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Special</p>
                        <p style="margin: 0; color: #999; font-size: 11px;">Offers</p>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 20px 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0 0 10px 0; color: #999; font-size: 12px;">© 2026 Hammzy Digitals. All rights reserved.</p>
                <p style="margin: 0; color: #999; font-size: 11px;">This email was sent from Hammzy Digitals admin panel.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    if (sendError) {
      console.error("[Admin] Email send error:", sendError);
      throw new Error(`Failed to send email: ${sendError.message}`);
    }

    return { ok: true, email: profile.email };
  });

export const adminSendBulkEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ 
    subject: z.string().min(1), 
    message: z.string().min(1) 
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    
    // Get all user emails
    const { data: profiles, error: profileError } = await context.supabase
      .from("profiles")
      .select("email, username, full_name")
      .not("email", "is", null);
    
    if (profileError) throw new Error("Failed to fetch users");
    if (!profiles || profiles.length === 0) throw new Error("No users found");

    // Send email using Resend API
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const emailPromises = profiles.map(async (profile) => {
      const userName = profile.username || profile.full_name || "User";
      
      try {
        await resend.emails.send({
          from: "Hammzy Digitals <onboarding@resend.dev>",
          to: profile.email,
          subject: data.subject,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${data.subject}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Purple Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <div style="background-color: rgba(255,255,255,0.15); display: inline-block; padding: 8px 20px; border-radius: 20px; margin-bottom: 20px;">
                      <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">HAMMZY DIGITALS UPDATE</p>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">${data.subject}</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">HAMMZY DIGITALS UPDATE</p>
                    
                    <h2 style="margin: 0 0 20px 0; color: #111; font-size: 18px; font-weight: 700;">👋 Hello ${userName}!</h2>
                    
                    <div style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
                      ${data.message.split('\n').map(line => `<p style="margin: 0 0 15px 0;">${line}</p>`).join('')}
                    </div>
                    
                    <p style="margin: 30px 0 10px 0; color: #111; font-size: 15px; font-weight: 600;">HAMMZY DIGITALS</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">Your Digital Services, Made Simple.</p>
                  </td>
                </tr>
                
                <!-- Footer Icons Section -->
                <tr>
                  <td style="padding: 30px 30px 40px 30px; border-top: 1px solid #e5e5e5;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 10px;">
                          <div style="display: inline-block; text-align: center; margin: 0 15px;">
                            <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                              <span style="font-size: 24px;">📱</span>
                            </div>
                            <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Virtual</p>
                            <p style="margin: 0; color: #999; font-size: 11px;">Numbers</p>
                          </div>
                        </td>
                        <td align="center" style="padding: 10px;">
                          <div style="display: inline-block; text-align: center; margin: 0 15px;">
                            <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                              <span style="font-size: 24px;">👤</span>
                            </div>
                            <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Social</p>
                            <p style="margin: 0; color: #999; font-size: 11px;">Accounts</p>
                          </div>
                        </td>
                        <td align="center" style="padding: 10px;">
                          <div style="display: inline-block; text-align: center; margin: 0 15px;">
                            <div style="width: 50px; height: 50px; background-color: #f0f0f0; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                              <span style="font-size: 24px;">🎁</span>
                            </div>
                            <p style="margin: 0; color: #111; font-size: 12px; font-weight: 600;">Special</p>
                            <p style="margin: 0; color: #999; font-size: 11px;">Offers</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 30px; background-color: #f9f9f9; text-align: center; border-top: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 10px 0; color: #999; font-size: 12px;">© 2026 Hammzy Digitals. All rights reserved.</p>
                    <p style="margin: 0; color: #999; font-size: 11px;">This email was sent from Hammzy Digitals admin panel.</p>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `,
        });
        return { success: true, email: profile.email };
      } catch (error) {
        console.error(`[Admin] Failed to send email to ${profile.email}:`, error);
        return { success: false, email: profile.email, error };
      }
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { 
      ok: true, 
      sent: successful, 
      failed: failed,
      total: profiles.length 
    };
  });