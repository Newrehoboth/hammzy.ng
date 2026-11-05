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

export interface LogProductPublic {
  id: string;
  platform: string;
  subcategory: string | null;
  type: string;
  account_name: string | null;
  followers: string | null;
  price: number;
  description: string | null;
  preview_links: any[];
  stock: number;
  created_at: string;
  image?: string | null; // Product image URL from RakibSocials API
}

// Count unsold items per product using a secure database RPC
async function stockMap(supabaseClient: any, productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  const { data, error } = await supabaseClient.rpc("rpc_get_unsold_stock", {
    p_product_ids: productIds,
  });
  if (error) throw error;
  const map: Record<string, number> = {};
  (data ?? []).forEach((r: any) => {
    map[r.product_id] = Number(r.stock_count);
  });
  return map;
}

// ============ USER FACING ============

// List all log products with live stock for the marketplace
export const listLogProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LogProductPublic[]> => {
    // Get local products
    const { data, error } = await context.supabase
      .from("log_products")
      .select("id, platform, subcategory, type, account_name, followers, price, description, preview_links, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const products = data ?? [];
    const stocks = await stockMap(context.supabase, products.map((p: any) => p.id));
    const localProducts = products.map((p: any) => ({
      ...p,
      price: Number(p.price),
      preview_links: p.preview_links ?? [],
      stock: stocks[p.id] ?? 0,
      source: 'local' as const,
      image: null // Local products don't have image URLs yet
    }));
    
    // Get RakibSocials products
    try {
      const { listRakibProducts, getCategories } = await import("@/lib/api/rakibsocials.server");
      const [rakibData, categoriesData] = await Promise.all([
        listRakibProducts(),
        getCategories().catch(() => ({ results: [] }))
      ]);
      
      // Map category IDs to names
      const categoryMap: Record<number, string> = {};
      (categoriesData?.results || []).forEach((cat: any) => {
        categoryMap[cat.id] = cat.name;
      });
      
      const rakibProducts = rakibData?.results || [];
      const formattedRakib = rakibProducts.map((p: any) => {
        // Extract preview links from various possible fields
        let previewLinks: any[] = [];
        
        // Check common field names for previews
        if (Array.isArray(p.previews)) previewLinks = p.previews;
        else if (Array.isArray(p.samples)) previewLinks = p.samples;
        else if (Array.isArray(p.preview_links)) previewLinks = p.preview_links;
        else if (Array.isArray(p.sample_links)) previewLinks = p.sample_links;
        else if (p.preview) previewLinks = [p.preview];
        else if (p.sample) previewLinks = [p.sample];
        
        return {
          id: `rakib_${p.id}`,
          platform: categoryMap[p.category_id] || "Unknown",
          subcategory: null,
          type: p.name,
          account_name: null,
          followers: null,
          price: Number(p.price) * 2, // 100% markup
          description: p.description || null,
          preview_links: previewLinks,
          stock: p.stock || 0,
          created_at: new Date().toISOString(),
          source: 'rakib' as const,
          rakib_id: p.id,
          category_id: p.category_id,
          image: p.image || null // Store the product image URL from API
        };
      });
      console.log(`[Logs] Combined: ${localProducts.length} local + ${formattedRakib.length} Rakib products`);
      return [...localProducts, ...formattedRakib];
    } catch (err) {
      console.error('[RakibSocials] Failed to fetch products:', err);
      return localProducts;
    }
  });

// Get current wallet balance
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    
    if (error) {
      console.error(`[Wallet] Error fetching profile for user ${context.userId}:`, error);
      return 0;
    }
    
    return Number(data?.wallet_balance ?? 0);
  });

export const verifyPaystackPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reference: z.string(), amountInNaira: z.number() }))
  .handler(async ({ data, context }) => {
    const { reference, amountInNaira } = data;
    try {
      // 1. Call Paystack API to verify reference
      const secretKey = process.env.PAYSTACK_SECRET_KEY!;
      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Paystack verification API returned non-ok:", res.status, errText);
        return { ok: false, error: `Paystack verification failed: ${res.statusText} (${res.status})` };
      }

      const paystackData = await res.json();
      if (!paystackData.status || paystackData.data.status !== "success") {
        return { ok: false, error: "Transaction was not successful on Paystack." };
      }

      // Verify amount matches (Paystack amount is in kobo, so divide by 100)
      const paidAmount = paystackData.data.amount / 100;
      if (Math.abs(paidAmount - amountInNaira) > 0.01) {
        return { ok: false, error: `Amount mismatch: Paid ₦${paidAmount} but expected ₦${amountInNaira}` };
      }

      // 2. Call the secure database RPC function to credit the wallet and log the payment
      // This runs with SECURITY DEFINER privileges on the database, so it doesn't need service_role keys.
      const { data: newBalance, error: rpcError } = await (context.supabase as any).rpc(
        "rpc_verify_and_credit_payment",
        {
          p_reference: reference,
          p_amount: amountInNaira,
          p_user_id: context.userId,
        }
      );

      if (rpcError) {
        console.error("Database RPC error:", rpcError);
        return { ok: false, error: `Database error: ${rpcError.message}` };
      }

      return { ok: true, newBalance: Number(newBalance) };
    } catch (err: any) {
      console.error("Server-side verification exception:", err);
      return { ok: false, error: err?.message || "Internal server error" };
    }
  });

// Get or generate user's dedicated Paga virtual account details via PocketFi
export const getOrCreatePocketFiAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Fetch user's profile (or create it if missing)
    let profile;
    const { data: existingProfile, error: getError } = await context.supabase
      .from("profiles")
      .select("pocketfi_bank_name, pocketfi_account_number, pocketfi_account_name, email, full_name, username")
      .eq("id", context.userId)
      .maybeSingle();

    if (getError && getError.code !== 'PGRST116') {
      console.error(`[PocketFi] Error fetching profile for user ${context.userId}:`, getError);
      throw new Error("Database error. Please try again.");
    }

    if (!existingProfile) {
      // Profile doesn't exist - create it NOW!
      console.log(`[PocketFi] Profile not found for user ${context.userId}, creating it...`);
      
      // Get user info from auth
      const { data: authUser } = await context.supabase.auth.getUser();
      const email = authUser?.user?.email || `${context.userId.substring(0, 8)}@hammzy.ng`;
      const username = authUser?.user?.user_metadata?.username || email.split('@')[0] || 'user';
      const fullName = authUser?.user?.user_metadata?.full_name || authUser?.user?.user_metadata?.username || username;
      
      // Create profile
      const { data: newProfile, error: createError } = await context.supabase
        .from("profiles")
        .insert({
          id: context.userId,
          username: username,
          email: email,
          full_name: fullName,
          email_verified: true,
          wallet_balance: 0,
          suspended: false
        })
        .select("pocketfi_bank_name, pocketfi_account_number, pocketfi_account_name, email, full_name, username")
        .single();
      
      if (createError) {
        console.error(`[PocketFi] Failed to create profile:`, createError);
        throw new Error("Could not create your profile. Please contact support.");
      }
      
      // Create user role
      await context.supabase.from("user_roles").insert({
        user_id: context.userId,
        role: "user"
      });
      
      console.log(`[PocketFi] Successfully created profile for user ${context.userId}`);
      profile = newProfile;
    } else {
      profile = existingProfile;
    }

    if (!profile) {
      throw new Error("Profile creation failed. Please try again.");
    }

    // If they already have an account, return it
    if (profile.pocketfi_account_number) {
      return {
        bankName: profile.pocketfi_bank_name,
        accountNumber: profile.pocketfi_account_number,
        accountName: profile.pocketfi_account_name,
      };
    }

    // 2. Otherwise generate a new one
    try {
      const nameParts = (profile.full_name || profile.username || "Hammzy Customer").trim().split(/\s+/);
      const firstName = nameParts[0] || "Hammzy";
      const lastName = nameParts.slice(1).join(" ") || "Customer";

      const { createPagaVirtualAccount } = await import("@/lib/api/pocketfi.server");
      
      const email = profile.email || `${context.userId.substring(0, 8)}@hammzy.ng`;
      
      // Generate unique phone from user ID hash
      // PocketFi requires valid Nigerian format (11 digits: 09xxxxxxxxx)
      const hash = parseInt(context.userId.substring(0, 8), 16);
      const phoneNumber = (hash % 100000000).toString().padStart(8, '0'); // Always 8 digits
      const phone = `090${phoneNumber}`; // 090 prefix + 8 digits = 11 digits total

      console.log(`[PocketFi] Creating account for user ${context.userId}: email=${email}, phone=${phone}, name=${firstName} ${lastName}`);

      const account = await createPagaVirtualAccount({
        userId: context.userId,
        firstName,
        lastName,
        email,
        phone,
      });

      console.log(`[PocketFi] Successfully created account: ${account.accountNumber} (${account.bankName})`);

      // 3. Save to profile
      const { error: updateError } = await context.supabase
        .from("profiles")
        .update({
          pocketfi_bank_name: account.bankName,
          pocketfi_account_number: account.accountNumber,
          pocketfi_account_name: account.accountName,
        })
        .eq("id", context.userId);

      if (updateError) {
        console.error("Failed to save PocketFi account details to profile:", updateError);
        throw updateError;
      }

      return account;
    } catch (err: any) {
      console.error("Error generating PocketFi virtual account:", err);
      const errorMsg = err.message || "Failed to generate virtual bank account";
      
      // Check for specific PocketFi errors
      if (errorMsg.includes("already exists") || errorMsg.includes("duplicate")) {
        throw new Error("An account already exists with this email. Please contact support if you need help.");
      }
      if (errorMsg.includes("POCKETFI_PUBLIC_KEY")) {
        throw new Error("Payment system configuration error. Please contact support.");
      }
      if (errorMsg.includes("API error") || errorMsg.includes("Unable to process")) {
        throw new Error("Payment service is temporarily unavailable. Please try again later or contact support.");
      }
      
      throw new Error(`Unable to create deposit account: ${errorMsg}`);
    }
  });

// Purchase one log from a product
export const purchaseLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string(), price: z.number().optional() }))
  .handler(async ({ data, context }) => {
    // Check if RakibSocials product
    if (data.productId.startsWith('rakib_')) {
      const rakibId = data.productId.replace('rakib_', '');
      
      // Get user balance
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", context.userId)
        .single();
      
      const balance = Number(profile?.wallet_balance || 0);

      // Fetch product details for accurate pricing and metadata
      const { getProductDetails, purchaseRakibLog } = await import("@/lib/api/rakibsocials.server");
      const productInfo = await getProductDetails(rakibId);
      const rawPrice = Number(productInfo?.product?.price || 0);
      const expectedPrice = data.price || (rawPrice > 0 ? rawPrice * 2 : 0);

      if (expectedPrice > 0 && balance < expectedPrice) {
        throw new Error(`Insufficient balance. This log costs ₦${expectedPrice.toFixed(2)}, but your wallet balance is ₦${balance.toFixed(2)}. Please top up your wallet.`);
      }
      
      // Purchase from RakibSocials
      const result = await purchaseRakibLog(rakibId, context.userId);
      if (!result.success) throw new Error(result.message || "Purchase failed");
      
      // Use expectedPrice as the definitive price — result.price from API is often missing or 0
      const price = Number(expectedPrice || result.price || 0);
      console.log("[PurchaseLog] price to deduct:", price, "| result.price:", result.price, "| expectedPrice:", expectedPrice);

      if (price <= 0) {
        console.warn("[PurchaseLog] Price is 0 or missing — deduction skipped. Check product pricing.");
      }

      // Deduct from wallet — use user's own supabase client (they have permission to update their own profile)
      const newBalance = Math.max(0, balance - price);
      const { error: updateErr } = await context.supabase
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", context.userId);
        
      if (updateErr) {
        console.error("[PurchaseLog] Failed to update balance:", updateErr);
        // Try with admin client as fallback
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          if (supabaseAdmin) {
            await supabaseAdmin.from("profiles").update({ wallet_balance: newBalance }).eq("id", context.userId);
          }
        } catch (adminErr) {
          console.error("[PurchaseLog] Admin fallback also failed:", adminErr);
        }
      }

      // Use admin client for inserting into log_purchases (may need elevated access)
      let db = context.supabase;
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (supabaseAdmin) db = supabaseAdmin;
      } catch (err) {
        console.warn("[PurchaseLog] Admin client fallback:", err);
      }
      
      // Format credentials and platform names cleanly
      const rawCred = result.credential || result.account;
      const credentialStr = typeof rawCred === 'object' ? JSON.stringify(rawCred) : String(rawCred || 'Contact support');
      const platformStr = result.platform || 'Social Media';
      const typeStr = productInfo?.product?.name || result.type || 'Social Media Log';
      
      // Record purchase in log_purchases
      const { error: insertErr } = await db.from("log_purchases").insert({
        user_id: context.userId,
        product_id: null,
        platform: platformStr,
        type: typeStr,
        credential: credentialStr,
        price: price
      });
      if (insertErr) console.error("[PurchaseLog] Failed to record purchase:", insertErr);
      
      return {
        credential: credentialStr,
        type: typeStr,
        platform: platformStr,
        price: price,
        newBalance: newBalance
      };
    }
    
    // Local purchase
    const { data: res, error } = await context.supabase.rpc("rpc_purchase_log", {
      p_product_id: data.productId,
    });
    if (error) {
      const msg = error.message || "Purchase failed";
      if (msg.includes("Insufficient balance")) throw new Error("Insufficient balance. Please top up your wallet.");
      if (msg.includes("Out of stock")) throw new Error("This log just sold out. Please try another.");
      throw new Error(msg);
    }
    const row = Array.isArray(res) ? res[0] : res;
    return {
      credential: row.credential as string,
      type: row.type as string,
      platform: row.platform as string,
      price: Number(row.price),
      newBalance: Number(row.new_balance),
    };
  });

// List the current user's purchased logs
export const listMyLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let db = context.supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (supabaseAdmin) db = supabaseAdmin;
    } catch (err) {
      console.warn("[listMyLogs] Admin client fallback:", err);
    }

    const { data, error } = await db
      .from("log_purchases")
      .select("id, platform, type, credential, price, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listMyLogs] Database query error:", error);
      throw error;
    }

    return (data ?? []).map((r: any) => ({ ...r, price: Number(r.price) }));
  });

// Get preview samples for a product (RakibSocials API products)
export const getProductPreviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    // Only works for RakibSocials products
    if (!data.productId.startsWith('rakib_')) {
      return { previews: [] };
    }
    
    const rakibId = data.productId.replace('rakib_', '');
    
    try {
      const { getProductDetails } = await import("@/lib/api/rakibsocials.server");
      const result = await getProductDetails(rakibId);
      return { previews: result.previews || [] };
    } catch (err) {
      console.error('[RakibSocials] Failed to fetch previews:', err);
      return { previews: [] };
    }
  });

// ============ ADMIN ============

export const adminListLogProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: products, error } = await context.supabase
      .from("log_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Use secure database RPC to get total and unsold items
    const { data: stats, error: statsErr } = await (context.supabase as any).rpc(
      "rpc_admin_get_product_stats"
    );
    if (statsErr) throw statsErr;

    const stock: Record<string, number> = {};
    const total: Record<string, number> = {};
    
    (stats ?? []).forEach((r: any) => {
      total[r.product_id] = Number(r.total_count);
      stock[r.product_id] = Number(r.unsold_count);
    });

    return (products ?? []).map((p: any) => ({
      ...p,
      price: Number(p.price),
      stock: stock[p.id] ?? 0,
      sold: (total[p.id] ?? 0) - (stock[p.id] ?? 0),
      total: total[p.id] ?? 0,
    }));
  });

function parseBulk(bulk: string): string[] {
  return bulk
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

const productInput = z.object({
  platform: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().max(120).optional().nullable(),
  type: z.string().trim().min(1).max(200),
  accountName: z.string().trim().max(120).optional().nullable(),
  followers: z.string().trim().max(80).optional().nullable(),
  price: z.number().min(0),
  description: z.string().trim().max(4000).optional().nullable(),
  previewLinks: z.array(z.string().url().max(1000)).max(10).optional().default([]),
  bulkLogs: z.string(),
});

export const adminCreateLogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productInput)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const items = parseBulk(data.bulkLogs);
    if (items.length === 0) throw new Error("Add at least one log (one per line).");

    const { data: product, error } = await context.supabase
      .from("log_products")
      .insert({
        platform: data.platform,
        subcategory: data.subcategory || null,
        type: data.type,
        account_name: data.accountName || null,
        followers: data.followers || null,
        price: data.price,
        description: data.description || null,
        preview_links: data.previewLinks ?? [],
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;

    const { error: itemsErr } = await context.supabase
      .from("log_items")
      .insert(items.map((credential) => ({ product_id: product.id, credential })));
    if (itemsErr) throw itemsErr;

    return { ok: true, id: product.id, added: items.length };
  });

export const adminUpdateLogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    productInput.partial({ bulkLogs: true }).extend({
      id: z.string(),
      bulkLogs: z.string().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("log_products")
      .update({
        platform: data.platform,
        subcategory: data.subcategory || null,
        type: data.type,
        account_name: data.accountName || null,
        followers: data.followers || null,
        price: data.price,
        description: data.description || null,
        preview_links: data.previewLinks ?? [],
      })
      .eq("id", data.id);
    if (error) throw error;

    let added = 0;
    if (data.bulkLogs !== undefined) {
      // Delete all existing unsold items for this product first, then insert the new list
      const { error: deleteErr } = await context.supabase
        .from("log_items")
        .delete()
        .eq("product_id", data.id)
        .eq("sold", false);
      if (deleteErr) throw deleteErr;

      const items = parseBulk(data.bulkLogs);
      if (items.length > 0) {
        const { error: itemsErr } = await context.supabase
          .from("log_items")
          .insert(items.map((credential) => ({ product_id: data.id, credential })));
        if (itemsErr) throw itemsErr;
        added = items.length;
      }
    }
    return { ok: true, added };
  });

export const adminDeleteLogProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("log_products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminAddBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string(), amount: z.number() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: res, error } = await context.supabase.rpc("rpc_admin_add_balance", {
      p_user_id: data.userId,
      p_amount: data.amount,
    });
    if (error) throw error;
    return { ok: true, newBalance: Number(res) };
  });

// List current user's payments (deposits)
export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, reference, amount, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      reference: r.reference,
      amount: Number(r.amount),
      status: r.status,
      created_at: r.created_at,
    }));
  });

// Admin list all payments (deposits)
export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, reference, amount, status, created_at, user_id, profiles(email, username)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      reference: r.reference,
      amount: Number(r.amount),
      status: r.status,
      created_at: r.created_at,
      user_id: r.user_id,
      email: r.profiles?.email || r.profiles?.username || "Unknown User",
    }));
  });

// Admin get raw unsold items for a product to populate edit box
export const adminGetLogProductItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: items, error } = await context.supabase
      .from("log_items")
      .select("credential")
      .eq("product_id", data.productId)
      .eq("sold", false)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (items ?? []).map((item: any) => item.credential);
  });