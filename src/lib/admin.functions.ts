import { createServerFn } from "@tanstack/react-start";
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
  .validator((d: { userId: string; suspended: boolean }) => d)
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
  .validator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot delete your own admin account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });