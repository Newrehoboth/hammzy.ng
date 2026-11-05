import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Tables } from "@/integrations/supabase/types";
import {
  getDaisyCountries,
  daisyGetProducts,
  daisyGetPrices,
  daisyGetPriceForService,
  daisyGetBalance,
  daisyBuyNumber,
  daisyGetStatus,
  daisyFinishOrder,
  daisyCancelOrder,
  daisyBanOrder,
  type DaisyCountry,
  type DaisyProduct,
  type DaisySms,
  type DaisyOrder,
  type DaisyStatusResult,
} from "@/lib/api/daisysms.server";
import {
  getatextGetServices,
  getatextRentNumber,
  getatextGetRentalStatus,
  getatextCancelRental,
  getatextCompleteRental,
  type GetatextService,
} from "@/lib/api/getatext.server";

// Re-export types so route files don't need to import from the .server file directly
export type {
  DaisyCountry,
  DaisyProduct,
  DaisySms,
  DaisyOrder,
  DaisyStatusResult,
};

// Legacy type aliases for backwards compat with route files that use Fivesim* names
export type FivesimCountry = DaisyCountry;
export type FivesimProduct = DaisyProduct;
export type FivesimSms = DaisySms;
export type FivesimOrder = DaisyOrder;
export type FivesimOperatorPrice = { name: string; cost: number; count: number; successRate: number };

// Re-export GetAText types
export type { GetatextService };

// ─── Metadata stored in the orders.reference column ──────────────────────────

export type OrderProvider = "DAISY_SMS" | "GETATEXT";

export interface FivesimMetadata {
  activationId: string;
  expiresAt: string;
  countryCode: string; // ISO 2-letter code for flag display
  sms: DaisySms[];
  provider?: OrderProvider; // which API was used
}

export type OrderWithMeta = Tables<"orders"> & { parsedMeta: FivesimMetadata };

export function parseFivesimMetadata(reference: string | null): FivesimMetadata {
  if (!reference) {
    return { activationId: "", expiresAt: "", countryCode: "US", sms: [], provider: "DAISY_SMS" };
  }
  try {
    const parsed = JSON.parse(reference);
    return {
      activationId: parsed.activationId ?? "",
      expiresAt: parsed.expiresAt ?? "",
      countryCode: parsed.countryCode ?? "US",
      sms: parsed.sms ?? [],
      provider: parsed.provider ?? "DAISY_SMS",
    };
  } catch {
    return {
      activationId: reference,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      countryCode: "US",
      sms: [],
      provider: "DAISY_SMS",
    };
  }
}

export function serializeFivesimMetadata(meta: FivesimMetadata): string {
  return JSON.stringify(meta);
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export const USD_TO_NGN_RATE = 1400;
export const PROFIT_MARGIN_MULTIPLIER = 1.55;

export function calculateFinalNairaPrice(apiPriceUsd: number): number {
  return apiPriceUsd * PROFIT_MARGIN_MULTIPLIER * USD_TO_NGN_RATE;
}

// GetAText prices are also in USD
export function calculateGetatextNairaPrice(apiPriceUsd: number): number {
  return apiPriceUsd * PROFIT_MARGIN_MULTIPLIER * USD_TO_NGN_RATE;
}

// ─── Refund / Status helper ───────────────────────────────────────────────────

export async function handleOrderSyncStatus(order: any, nextStatus: string, context: any) {
  const targetStatus = nextStatus.toLowerCase();

  if (
    targetStatus === "canceled" ||
    targetStatus === "banned" ||
    targetStatus === "timeout" ||
    targetStatus === "cancelled"
  ) {
    const refundAmount = Number(order.price);
    if (refundAmount > 0) {
      // Atomic cancel + refund inside a SECURITY DEFINER RPC. Running through the
      // authenticated client (RLS-safe) avoids relying on the service-role key,
      // which on Lovable Cloud can be a non-JWT key that PostgREST rejects — the
      // cause of refunds silently failing while the UI still reported success.
      const { data: result, error: rpcError } = await context.supabase.rpc(
        "rpc_refund_order",
        { p_order_id: order.id, p_status: targetStatus }
      );

      if (rpcError) {
        console.error(`[Refund] rpc_refund_order failed for order ${order.id}:`, rpcError);
        throw new Error(`Refund failed: ${rpcError.message}`);
      }

      const row = Array.isArray(result) ? result[0] : result;
      if (!row || !row.status_updated) {
        console.log(`[Refund] Skipping — order ${order.id} already processed.`);
        return { statusUpdated: false, refunded: false };
      }

      console.log(
        `[Refund] ₦${refundAmount} refunded to ${order.user_id} for order ${order.id}. New balance: ₦${row.new_balance}`
      );
      return { statusUpdated: true, refunded: Boolean(row.refunded) };
    }
  }
  return { statusUpdated: false };
}

// ─── Server Functions ─────────────────────────────────────────────────────────
// All validators use Zod schemas for TanStack Start compatibility

// 1. Get Countries (Daisy SMS — Alternative tab, USA only)
export const getFivesimCountries = createServerFn({ method: "GET" }).handler(async () => {
  return getDaisyCountries();
});

// 1b. Get GetAText Services (Standard tab — USA only)
export const getGetatextServices = createServerFn({ method: "GET" }).handler(async () => {
  const services = await getatextGetServices();
  // Normalize to the same shape as TigerProduct for UI compatibility
  // Note: fallback services have stock=100 as a placeholder — don't filter by stock
  return services
    .map((s) => ({
      name: s.service_name,          // display name e.g. "Whatsapp"
      apiName: s.api_name,           // API code e.g. "whatsapp"
      qty: s.stock,
      price: calculateGetatextNairaPrice(parseFloat(s.price ?? "0")),
      ttl: s.ttl ?? 10,
    }));
});

// 2. Get Products for a Country (Daisy SMS — USA only, so country param is ignored)
export const getFivesimProducts = createServerFn({ method: "POST" })
  .validator(
    z.object({
      country: z.union([z.string(), z.number()]),
      operator: z.string().optional(),
    })
  )
  .handler(async () => {
    const products = await daisyGetProducts();
    return products.map(p => ({
      name: p.name,
      qty: p.qty,
      price: calculateFinalNairaPrice(p.price),
    }));
  });

// 2b. Get Operator Prices (Daisy SMS has no per-operator breakdown, return single "any" entry)
export interface OperatorPriceNormalized {
  name: string;
  cost: number;
  count: number;
  successRate: number;
}

export const getFivesimOperatorPrices = createServerFn({ method: "POST" })
  .validator(
    z.object({
      country: z.union([z.string(), z.number()]),
      product: z.string(),
    })
  )
  .handler(async ({ data }): Promise<OperatorPriceNormalized[]> => {
    const priceInfo = await daisyGetPriceForService(data.product);
    if (!priceInfo) return [];

    return [
      {
        name: "any",
        cost: calculateFinalNairaPrice(priceInfo.cost),
        count: priceInfo.count,
        successRate: 0, // DaisySMS doesn't expose success rates
      },
    ];
  });

// 2c. Get operators for a country (Tiger SMS = always just "any")
export const getFivesimCountryOperators = createServerFn({ method: "POST" })
  .validator(z.object({ country: z.union([z.string(), z.number()]) }))
  .handler(async () => {
    return ["any"];
  });

// 3. Get Daisy SMS Profile (Balance)
export const getFivesimProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const balance = await daisyGetBalance();
    return {
      id: 0,
      email: "",
      balance,
      rating: 0,
      frozen_balance: 0,
      total_active_orders: 0,
    };
  });

// 4. Create Order (Daisy SMS — Alternative, USA only)
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      countrySlug: z.union([z.string(), z.number()]),  // ignored for DaisySMS (USA only)
      countryName: z.string(),
      countryCode: z.string(),   // ISO code for flag
      service: z.string(),
      operator: z.string().optional(), // ignored for DaisySMS
    })
  )
  .handler(async ({ data, context }) => {
    // Fetch user profile to get wallet balance
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .single();

    if (profileError || !profile) {
      console.error(`[Orders] Profile not found for user ${context.userId}:`, profileError);
      throw new Error("Your user profile is missing. Please contact support on WhatsApp to resolve this issue.");
    }

    const userBalance = Number(profile.wallet_balance ?? 0);
    if (userBalance <= 0) {
      throw new Error("Insufficient wallet balance. Please add funds to your wallet.");
    }

    // 1. Look up the price first so we know exactly how much to charge
    const priceInfo = await daisyGetPriceForService(data.service);
    if (!priceInfo || priceInfo.count === 0) {
      throw new Error(`No phone numbers available for ${data.service} right now. Please try again later.`);
    }

    const usdPrice = priceInfo.cost;
    const priceInNaira = calculateFinalNairaPrice(usdPrice);

    if (userBalance < priceInNaira) {
      throw new Error(
        `Insufficient wallet balance. This activation costs ₦${priceInNaira.toFixed(2)}, but your balance is ₦${userBalance.toFixed(2)}. Please add funds.`
      );
    }

    // 2. Call DaisySMS API to buy the number
    let daisyOrder: DaisyOrder;
    try {
      // Set max_price to current price to avoid unexpected price surges
      daisyOrder = await daisyBuyNumber(data.service, usdPrice);
    } catch (err: any) {
      console.error("DaisySMS Buy Number error:", err);
      throw new Error(err.message || "Failed to purchase number. Please try again.");
    }

    // 3. Deduct wallet balance
    const { error: deductError } = await context.supabase
      .from("profiles")
      .update({ wallet_balance: userBalance - priceInNaira })
      .eq("id", context.userId);

    if (deductError) {
      // Try to cancel the just-purchased number to not waste credit
      await daisyCancelOrder(daisyOrder.id).catch(() => {});
      throw new Error("Failed to deduct wallet balance. Transaction rolled back.");
    }

    // 4. Serialize metadata
    const metadata: FivesimMetadata = {
      activationId: daisyOrder.id,
      expiresAt: daisyOrder.expiresAt,
      countryCode: "US", // DaisySMS is USA only
      sms: [],
      provider: "DAISY_SMS",
    };

    // 5. Save order to DB
    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        number: daisyOrder.phone,
        country: "United States",
        provider: "DAISY_SMS",
        service: data.service,
        price: priceInNaira,
        status: daisyOrder.status,
        reference: serializeFivesimMetadata(metadata),
      })
      .select()
      .single();

    if (error) {
      // Rollback wallet deduction
      const { data: currentProf } = await context.supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", context.userId)
        .single();
      if (currentProf) {
        await context.supabase
          .from("profiles")
          .update({ wallet_balance: Number(currentProf.wallet_balance ?? 0) + priceInNaira })
          .eq("id", context.userId);
      }
      // Cancel on DaisySMS to not waste API credit
      await daisyCancelOrder(daisyOrder.id).catch(() => {});
      throw new Error(`Order save failed: ${error.message}`);
    }

    return order;
  });

// 4b. Create Order (GetAText — Standard / USA only)
export const createGetatextOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      service: z.string(),       // GetAText api_name e.g. "whatsapp"
      serviceName: z.string(),   // display name e.g. "Whatsapp"
    })
  )
  .handler(async ({ data, context }) => {
    // Fetch user profile
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .single();

    if (profileError || !profile) {
      console.error(`[Orders] Profile not found for user ${context.userId}:`, profileError);
      throw new Error("Your user profile is missing. Please contact support on WhatsApp to resolve this issue.");
    }

    const userBalance = Number(profile.wallet_balance ?? 0);
    if (userBalance <= 0) {
      throw new Error("Insufficient wallet balance. Please add funds to your wallet.");
    }

    // Get current price from GetAText
    const services = await getatextGetServices();
    const svc = services.find((s) => s.api_name.toLowerCase() === data.service.toLowerCase());
    if (!svc || svc.stock <= 0) {
      throw new Error(`${data.serviceName} is currently out of stock. Please try another service.`);
    }

    const priceInNaira = calculateGetatextNairaPrice(parseFloat(svc.price ?? "0"));

    const ttlMinutes = svc.ttl ?? 10;

    if (userBalance < priceInNaira) {
      throw new Error(
        `Insufficient wallet balance. This number costs ₦${priceInNaira.toFixed(2)}, but your balance is ₦${userBalance.toFixed(2)}. Please add funds.`
      );
    }

    // Rent the number from GetAText
    let rental;
    try {
      rental = await getatextRentNumber(data.service);
    } catch (err: any) {
      throw new Error(err.message || "Failed to rent number from GetAText. Please try again.");
    }

    // Deduct wallet balance
    const { error: deductError } = await context.supabase
      .from("profiles")
      .update({ wallet_balance: userBalance - priceInNaira })
      .eq("id", context.userId);

    if (deductError) {
      await getatextCancelRental(rental.id).catch(() => {});
      throw new Error("Failed to deduct wallet balance. Transaction rolled back.");
    }

    // Safely parse end_time from GetAText — the format can vary (with/without T, with/without Z, etc.)
    let expiresAt: string;
    if (rental.end_time) {
      try {
        const raw = String(rental.end_time).replace(" ", "T");
        const withZ = raw.endsWith("Z") || raw.includes("+") ? raw : raw + "Z";
        const d = new Date(withZ);
        expiresAt = isNaN(d.getTime())
          ? new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString()
          : d.toISOString();
      } catch {
        expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      }
    } else {
      expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    }

    const metadata: FivesimMetadata = {
      activationId: String(rental.id),
      expiresAt,
      countryCode: "US",
      sms: [],
      provider: "GETATEXT",
    };

    // Save to DB
    const { data: order, error } = await context.supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        number: rental.number,
        country: "United States",
        provider: "GETATEXT",
        service: data.serviceName,
        price: priceInNaira,
        status: "pending",
        reference: serializeFivesimMetadata(metadata),
      })
      .select()
      .single();

    if (error) {
      // Rollback
      const { data: currentProf } = await context.supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", context.userId)
        .single();
      if (currentProf) {
        await context.supabase
          .from("profiles")
          .update({ wallet_balance: Number(currentProf.wallet_balance ?? 0) + priceInNaira })
          .eq("id", context.userId);
      }
      await getatextCancelRental(rental.id).catch(() => {});
      throw new Error(`Order save failed: ${error.message}`);
    }

    return order;
  });

// 5. Retrieve and Sync Single Order
export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) {
      throw new Error(error?.message || "Order not found");
    }
    if (order.user_id !== context.userId) {
      throw new Error("Forbidden");
    }

    const currentStatus = order.status.toLowerCase();
    const meta = parseFivesimMetadata(order.reference);
    const provider = meta.provider ?? "DAISY_SMS";

    // Poll provider for status updates if still active
    if (meta.activationId && (currentStatus === "pending" || currentStatus === "received")) {
      try {
        const updatedSms: DaisySms[] = [...(meta.sms ?? [])];
        let nextStatus = currentStatus;

        if (provider === "GETATEXT") {
          // ── GetAText polling ──
          const rentalId = parseInt(meta.activationId, 10);
          const result = await getatextGetRentalStatus(rentalId);

          // Map GetAText status to our internal status
          if (result.status === "expired" || result.status === "cancelled") {
            nextStatus = "cancelled";
            console.log(`[GetAText] Order ${order.id} detected as ${result.status} by GetAText API - will trigger refund`);
          } else if (result.status === "completed") {
            nextStatus = "finished";
          } else if (result.code) {
            nextStatus = "received";
          } else {
            nextStatus = "pending";
          }

          if (result.code && !updatedSms.some((s) => s.code === result.code)) {
            updatedSms.push({
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              sender: "Service",
              text: result.code,
              code: result.code,
            });
          }
        } else {
          // ── DaisySMS polling ──
          const daisyResult = await daisyGetStatus(meta.activationId);
          nextStatus = daisyResult.status;

          if (daisyResult.code && !updatedSms.some((s) => s.code === daisyResult.code)) {
            updatedSms.push({
              id: Date.now().toString(),
              created_at: new Date().toISOString(),
              sender: "Service",
              text: daisyResult.code,
              code: daisyResult.code,
            });
          }
        }

        const updatedMeta: FivesimMetadata = { ...meta, sms: updatedSms };

        // Handle refund if status transitioned to a terminal state
        const syncResult = await handleOrderSyncStatus(order, nextStatus, context);

        if (!syncResult.statusUpdated) {
          const { data: updatedOrder, error: updateError } = await context.supabase
            .from("orders")
            .update({ status: nextStatus, reference: serializeFivesimMetadata(updatedMeta) })
            .eq("id", order.id)
            .select()
            .single();

          if (!updateError && updatedOrder) {
            return { ...updatedOrder, parsedMeta: updatedMeta };
          }
        } else {
          const { data: updatedOrder, error: updateError } = await context.supabase
            .from("orders")
            .update({ reference: serializeFivesimMetadata(updatedMeta) })
            .eq("id", order.id)
            .select()
            .single();

          if (!updateError && updatedOrder) {
            return { ...updatedOrder, parsedMeta: updatedMeta };
          }
        }
      } catch (err) {
        console.error(`Error syncing ${provider} order:`, err);
      }
    }

    return { ...order, parsedMeta: meta };
  });

// 6. List My Orders
export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map((order) => ({
      ...order,
      parsedMeta: parseFivesimMetadata(order.reference),
    }));
  });

// 7. Cancel Order
export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Forbidden");

    const meta = parseFivesimMetadata(order.reference);
    if (!meta.activationId) throw new Error("No activation ID found");

    // 🔒 CRITICAL: Check if user has received SMS codes
    if (meta.sms && meta.sms.length > 0) {
      console.log(`[Cancel] Order ${order.id} has ${meta.sms.length} SMS code(s). Refund DENIED.`);
      throw new Error("Cannot cancel — you have already received the verification code.");
    }

    // 🔒 CRITICAL: Check if order status is "received" (got code)
    const currentStatus = order.status?.toLowerCase();
    if (currentStatus === "received" || currentStatus === "finished") {
      console.log(`[Cancel] Order ${order.id} status is "${currentStatus}". Refund DENIED.`);
      throw new Error("Cannot cancel — you have already received the verification code.");
    }

    let finalStatus = "cancelled";
    const provider = meta.provider ?? "DAISY_SMS";

    // Cancel on the provider's platform first — if this fails, we don't proceed with local refund
    try {
      if (provider === "GETATEXT") {
        console.log(`[Cancel] Cancelling GetAText rental ${meta.activationId} for order ${order.id}`);
        await getatextCancelRental(parseInt(meta.activationId, 10));
        console.log(`[Cancel] GetAText rental ${meta.activationId} cancelled successfully`);
      } else {
        console.log(`[Cancel] Cancelling DaisySMS activation ${meta.activationId} for order ${order.id}`);
        const success = await daisyCancelOrder(meta.activationId);
        console.log(`[Cancel] DaisySMS cancellation result: ${success ? 'SUCCESS' : 'FAILED'}`);
        if (!success) {
          throw new Error("DaisySMS did not confirm cancellation");
        }
      }
      finalStatus = "cancelled";
    } catch (err: any) {
      const errorMsg = err.message?.toLowerCase() || "";
      
      // "Already got code" = DaisySMS won't refund (not a temporary error)
      if (errorMsg.includes("already received the sms code") || errorMsg.includes("cannot cancel")) {
        console.log(`[Cancel] ${provider} already got SMS for ${meta.activationId}. Cannot refund.`);
        throw new Error("Cannot cancel — you have already received the SMS code.");
      }
      
      // Already expired/not found = safe to refund locally (money already unrecoverable)
      if (errorMsg.includes("no_activation") || errorMsg.includes("already expired") || errorMsg.includes("not found")) {
        console.log(`[Cancel] ${provider} activation ${meta.activationId} already expired/cancelled. Proceeding with local refund.`);
        finalStatus = "cancelled";
      } else {
        // For any other error, don't proceed with refund to prevent double-charging
        console.error(`[Cancel] ${provider} cancel FAILED for ${meta.activationId}:`, err);
        throw new Error(`Failed to cancel on ${provider} platform: ${err.message}. Please try again or contact support.`);
      }
    }

    console.log(`[Cancel] Calling handleOrderSyncStatus for order ${order.id} with status ${finalStatus}`);
    const syncResult = await handleOrderSyncStatus(order, finalStatus, context);
    console.log(`[Cancel] handleOrderSyncStatus result:`, syncResult);

    if (!syncResult.statusUpdated) {
      const { data: currentOrder, error: currentError } = await context.supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .maybeSingle();

      if (currentError) throw currentError;
      const currentStatus = currentOrder?.status?.toLowerCase();
      if (currentStatus === "cancelled" || currentStatus === "canceled" || currentStatus === "banned" || currentStatus === "timeout") {
        return currentOrder;
      }

      throw new Error("Refund was not applied, so the order was not cancelled. Please try again.");
    }

    const { data: updatedOrder, error: updatedError } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .maybeSingle();

    if (updatedError) throw updatedError;
    if (!updatedOrder) throw new Error("Order cancelled, but the updated order could not be loaded.");
    return updatedOrder;
  });

// 8. Finish Order
export const finishOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Forbidden");

    const meta = parseFivesimMetadata(order.reference);
    if (!meta.activationId) throw new Error("No activation ID found");
    const provider = meta.provider ?? "DAISY_SMS";

    if (provider === "GETATEXT") {
      await getatextCompleteRental(parseInt(meta.activationId, 10));
    } else {
      await daisyFinishOrder(meta.activationId);
    }

    const { data: updatedOrder, error: updateError } = await context.supabase
      .from("orders")
      .update({ status: "finished" })
      .eq("id", order.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedOrder;
  });

// 9. Ban Order (report number and cancel)
export const banOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error || !order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Forbidden");

    const meta = parseFivesimMetadata(order.reference);
    if (!meta.activationId) throw new Error("No activation ID found");

    let nextStatus = "banned";

    try {
      await daisyBanOrder(meta.activationId);
    } catch (err: any) {
      console.warn(`[Ban] DaisySMS ban failed for activation ${meta.activationId}: ${err.message}. Banning locally.`);
    }

    const syncResult = await handleOrderSyncStatus(order, nextStatus, context);

    if (!syncResult.statusUpdated) {
      const { data: currentOrder } = await context.supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();

      if (currentOrder) return currentOrder;
      throw new Error("Order already cancelled/banned or no longer active");
    }

    const { data: updatedOrder } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", order.id)
      .single();

    return updatedOrder || order;
  });