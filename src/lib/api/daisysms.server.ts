import process from "node:process";
import servicesJsonRaw from "./services.json";

const BASE_URL = "https://daisysms.io/stubs/handler_api.php";

// Fallback key used when the env var isn't available (e.g. Vercel serverless cold start)
const DAISYSMS_FALLBACK_KEY = "Yc2x52Wu1v4rNMzbtOuy9fxbPd0pLcre";

function getApiKey(): string {
  const key = process.env.DAISYSMS_API_KEY || DAISYSMS_FALLBACK_KEY;
  console.log("[DaisySMS] Using API key source:", process.env.DAISYSMS_API_KEY ? "env var" : "fallback");
  return key;
}

async function daisyRequest(params: Record<string, string>): Promise<string> {
  const qs = new URLSearchParams({ api_key: getApiKey(), ...params }).toString();
  const url = `${BASE_URL}?${qs}`;
  
  // Log the request (hide API key for security)
  const logParams = { ...params, api_key: "***" };
  console.log(`[DaisySMS] API Request:`, logParams);
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  const text = await response.text().catch(() => "");

  if (!response.ok || text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html") || text.includes("Just a moment...")) {
    console.error(`[DaisySMS] API HTTP/Cloudflare Error (${response.status}):`, text.slice(0, 300));
    throw new Error("Alternative Server is currently undergoing maintenance. Please switch to the Standard Server tab to purchase your number immediately.");
  }

  console.log(`[DaisySMS] API Response:`, text.trim());
  return text.trim();
}

// ─── Service Code to Name Mapping ───────────────────────────────────────────

// Import services.json directly so it's bundled with the deployment
const serviceMap: Record<string, string> = servicesJsonRaw as Record<string, string>;
const reverseServiceMap: Record<string, string> = {};

// Build reverse mapping for lookups
Object.entries(serviceMap).forEach(([code, name]) => {
  // Normalize values to lowercase for case-insensitive lookup
  reverseServiceMap[name.toLowerCase()] = code.toLowerCase();
});

export function getServiceDisplayName(code: string): string {
  const name = serviceMap[code.toLowerCase()];
  if (name) return name;
  return code.charAt(0).toUpperCase() + code.slice(1);
}

export function getServiceCode(displayName: string): string {
  const code = reverseServiceMap[displayName.toLowerCase()];
  if (code) return code;
  // If not found directly, check for exact match in entries
  const entry = Object.entries(serviceMap).find(
    ([, val]) => val.toLowerCase() === displayName.toLowerCase()
  );
  if (entry) return entry[0];
  return displayName.toLowerCase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DaisyCountry {
  id: number;     // Always 187 for USA (DaisySMS is USA-only)
  name: string;
  iso: string;    // "US"
}

export interface DaisyProduct {
  name: string;
  qty: number;
  price: number;  // already in USD (from API) — will be converted to ₦ upstream
}

export interface DaisySms {
  id: string;
  created_at: string;
  sender: string;
  text: string;
  code: string;
}

// DaisySMS activation statuses
export type DaisyOrderStatus = "pending" | "received" | "canceled" | "finished";

export interface DaisyOrder {
  id: string;         // activation ID
  phone: string;      // phone number (without leading +)
  service: string;
  price: number;      // price in USD
  status: DaisyOrderStatus;
  expiresAt: string;  // ISO expiry time
  sms: DaisySms[];
}

// Raw getPrices response format:
// { "serviceCode": { "cost": "0.50", "count": 100, "multiSms": true } }
export type DaisyPricesRaw = Record<
  string,
  { cost: string; count: number; multiSms: boolean }
>;

// ─── Country (USA Only) ──────────────────────────────────────────────────────

export const DAISY_COUNTRY: DaisyCountry = {
  id: 187,
  name: "United States",
  iso: "US",
};

export function getDaisyCountries(): DaisyCountry[] {
  return [DAISY_COUNTRY];
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Get balance from DaisySMS.
 * Response: ACCESS_BALANCE:11.57
 */
export async function daisyGetBalance(): Promise<number> {
  const text = await daisyRequest({ action: "getBalance" });
  if (!text.startsWith("ACCESS_BALANCE:")) {
    throw new Error(`DaisySMS balance error: ${text}`);
  }
  return parseFloat(text.split(":")[1]);
}

/**
 * Get available products/services with prices.
 * Response: {"serviceCode":{"cost":0.50,"count":100,"multi":1}}
 */
export async function daisyGetPrices(): Promise<Record<string, { cost: number; count: number; multiSms: boolean }>> {
  try {
    const text = await daisyRequest({ action: "getPrices" });
    
    // If the API returns an error string (not JSON)
    if (!text.startsWith("{")) {
      console.error(`DaisySMS getPrices error: ${text}`);
      return {};
    }
    
    // DaisySMS returns services directly: { "servicecode": { "cost": 0.5, "count": 100, "multi": 1 } }
    const raw: Record<string, { cost: number; count: number; multi: number }> = JSON.parse(text);
    
    // Normalize to our format
    return Object.fromEntries(
      Object.entries(raw).map(([svc, data]) => [
        svc,
        {
          cost: data.cost,
          count: data.count,
          multiSms: Boolean(data.multi),
        },
      ])
    );
  } catch (err) {
    console.error(`DaisySMS getPrices error:`, err);
    return {};
  }
}

// ─── Static Fallback Products ───────────────────────────────────────────────
// Used when DaisySMS API is unavailable, rate-limited, or key is invalid
export const DAISY_FALLBACK_PRODUCTS: DaisyProduct[] = [
  { name: "WhatsApp", qty: 150, price: 1.25 },
  { name: "Google/YouTube/Gmail", qty: 250, price: 0.60 },
  { name: "Telegram", qty: 200, price: 0.95 },
  { name: "OpenAI", qty: 180, price: 0.70 },
  { name: "TikTok", qty: 300, price: 0.50 },
  { name: "Instagram", qty: 220, price: 0.55 },
  { name: "Tinder", qty: 140, price: 0.85 },
  { name: "PayPal", qty: 110, price: 1.10 },
  { name: "Amazon", qty: 190, price: 0.65 },
  { name: "Apple", qty: 160, price: 0.75 },
  { name: "Facebook", qty: 130, price: 0.80 },
  { name: "Netflix", qty: 170, price: 0.50 },
  { name: "Twitter", qty: 210, price: 0.60 },
  { name: "Discord", qty: 230, price: 0.45 },
  { name: "Uber", qty: 175, price: 0.55 },
  { name: "Snapchat", qty: 195, price: 0.50 },
  { name: "Microsoft", qty: 240, price: 0.60 },
  { name: "Cash App", qty: 90, price: 1.50 },
  { name: "Coinbase", qty: 105, price: 1.20 },
  { name: "eBay", qty: 125, price: 0.70 },
  { name: "Airbnb", qty: 115, price: 0.80 },
  { name: "DoorDash", qty: 165, price: 0.65 },
  { name: "Lyft", qty: 155, price: 0.60 },
  { name: "Temu", qty: 280, price: 0.40 },
  { name: "AliExpress", qty: 260, price: 0.45 },
  { name: "SHEIN", qty: 270, price: 0.45 },
  { name: "Not Listed (Generic)", qty: 500, price: 1.00 },
];

/**
 * Get available products for display (returns DaisyProduct[] with price in USD).
 * Only includes services that are actually in stock (count > 0).
 */
export async function daisyGetProducts(): Promise<DaisyProduct[]> {
  try {
    const pricesData = await daisyGetPrices();
    const products = Object.entries(pricesData)
      .filter(([, data]) => data.count > 0) // Only show services with stock
      .map(([code, data]) => ({
        name: getServiceDisplayName(code),
        qty: data.count,
        price: data.cost,
      }))
      .sort((a, b) => b.qty - a.qty); // Sort by stock quantity (highest first)
    
    console.log(`[DaisySMS] Returning ${products.length} products from live API`);
    if (products.length > 0) {
      return products;
    }
  } catch (err) {
    console.error(`[DaisySMS] daisyGetProducts failed, using fallback:`, err);
  }

  console.log(`[DaisySMS] Using fallback product list (${DAISY_FALLBACK_PRODUCTS.length} products)`);
  return DAISY_FALLBACK_PRODUCTS;
}

/**
 * Get price for a specific service.
 */
export async function daisyGetPriceForService(
  service: string
): Promise<{ cost: number; count: number; multiSms: boolean } | null> {
  const serviceCode = getServiceCode(service);
  try {
    const prices = await daisyGetPrices();
    if (prices && prices[serviceCode.toLowerCase()]) {
      return prices[serviceCode.toLowerCase()];
    }
  } catch (err) {
    console.warn(`[DaisySMS] daisyGetPriceForService API error, checking fallback:`, err);
  }

  const displayName = getServiceDisplayName(serviceCode);
  const fallbackItem = DAISY_FALLBACK_PRODUCTS.find(
    (p) => p.name.toLowerCase() === displayName.toLowerCase() || p.name.toLowerCase() === service.toLowerCase()
  );
  if (fallbackItem) {
    return { cost: fallbackItem.price, count: fallbackItem.qty, multiSms: true };
  }
  return { cost: 0.75, count: 100, multiSms: true };
}

/**
 * Buy a virtual number.
 * Response: ACCESS_NUMBER:activationId:phoneNumber
 */
export async function daisyBuyNumber(
  service: string,
  maxPrice?: number
): Promise<DaisyOrder> {
  const serviceCode = getServiceCode(service);
  const params: Record<string, string> = {
    action: "getNumber",
    service: serviceCode.toLowerCase(),
  };
  
  // Add max_price to prevent unexpected expenses
  if (maxPrice) {
    params.max_price = maxPrice.toFixed(2);
  }
  
  const text = await daisyRequest(params);

  if (text.includes("BAD_KEY") || text === "ERROR_KEY") {
    throw new Error("Alternative Server is currently undergoing maintenance. Please use the Standard Server tab to purchase your number immediately.");
  }
  if (text === "NO_NUMBERS") {
    throw new Error(`No phone numbers available for ${service} right now. Please try again later or try the Standard Server tab.`);
  }
  if (text === "NO_MONEY") {
    throw new Error("Insufficient funds in master account. Please use the Standard Server tab or contact support.");
  }
  if (text === "MAX_PRICE_EXCEEDED") {
    throw new Error(`Service price exceeds maximum limit. Please try again later.`);
  }
  if (text === "TOO_MANY_ACTIVE_RENTALS") {
    throw new Error("Maximum active rentals reached. Please wait for existing rentals to complete.");
  }
  if (!text.startsWith("ACCESS_NUMBER:")) {
    throw new Error(`DaisySMS buy error: ${text}`);
  }

  // ACCESS_NUMBER:activationId:phoneNumber
  const parts = text.split(":");
  const activationId = parts[1];
  const phone = parts[2];

  // DaisySMS rentals expire after some time (check their pricing page for exact duration)
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  return {
    id: activationId,
    phone,
    service: getServiceDisplayName(serviceCode),
    price: 0, // Price is looked up from getPrices before purchasing
    status: "pending",
    expiresAt,
    sms: [],
  };
}

/**
 * Check the status of an activation order.
 * Responses:
 *   STATUS_WAIT_CODE    → pending (waiting for SMS)
 *   STATUS_OK:CODE      → received (code in hand)
 *   STATUS_CANCEL       → canceled
 */
export interface DaisyStatusResult {
  status: DaisyOrderStatus;
  code: string | null;
}

export async function daisyGetStatus(activationId: string): Promise<DaisyStatusResult> {
  const text = await daisyRequest({ action: "getStatus", id: activationId });

  if (text === "STATUS_WAIT_CODE") {
    return { status: "pending", code: null };
  }
  if (text === "STATUS_CANCEL") {
    return { status: "canceled", code: null };
  }
  if (text.startsWith("STATUS_OK:")) {
    const code = text.substring("STATUS_OK:".length);
    return { status: "received", code };
  }
  if (text === "NO_ACTIVATION") {
    return { status: "canceled", code: null };
  }

  console.warn(`DaisySMS unknown status for ${activationId}: ${text}`);
  return { status: "pending", code: null };
}

/**
 * Cancel an activation (setStatus=8).
 * Response: ACCESS_CANCEL or ACCESS_READY (if already got code)
 */
export async function daisyCancelOrder(activationId: string): Promise<boolean> {
  console.log(`[DaisySMS] Attempting to cancel activation: ${activationId}`);
  
  try {
    const text = await daisyRequest({ action: "setStatus", id: activationId, status: "8" });
    console.log(`[DaisySMS] Cancel response for ${activationId}: ${text}`);
    
    if (text === "ACCESS_CANCEL") {
      console.log(`[DaisySMS] Cancellation confirmed for ${activationId}`);
      return true;
    }
    
    if (text === "ACCESS_READY") {
      // Already got the code, cannot cancel
      throw new Error("Cannot cancel — you have already received the SMS code.");
    }
    
    if (text === "NO_ACTIVATION") {
      throw new Error("Activation not found. It may have already expired.");
    }
    
    // Any other response is an error
    console.error(`[DaisySMS] Unexpected cancel response for ${activationId}: ${text}`);
    throw new Error(`DaisySMS cancel error: ${text}`);
  } catch (err: any) {
    console.error(`[DaisySMS] Cancel API request failed for ${activationId}:`, err);
    throw err;
  }
}

/**
 * Finish/complete an activation (setStatus=6).
 */
export async function daisyFinishOrder(activationId: string): Promise<boolean> {
  const text = await daisyRequest({ action: "setStatus", id: activationId, status: "6" });
  if (text === "ACCESS_ACTIVATION") return true;
  if (text === "NO_ACTIVATION") return false; // already cleaned up
  console.warn(`DaisySMS finish returned: ${text}`);
  return true; // treat any response as ok for finish
}

/**
 * Ban order — report number as used. DaisySMS doesn't have a separate ban,
 * so we just finish the order.
 */
export async function daisyBanOrder(activationId: string): Promise<boolean> {
  return daisyFinishOrder(activationId);
}
