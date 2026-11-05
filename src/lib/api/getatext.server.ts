import process from "node:process";

const BASE_URL = "https://getatext.com/api/v1";

// Fallback key used when the env var isn't available (e.g. Vercel serverless)
const GETATEXT_FALLBACK_KEY = "94801bd075eae6f1ab7d092504e";

function getApiKey(): string {
  const key = process.env.GETATEXT_API_KEY || GETATEXT_FALLBACK_KEY;
  return key;
}

async function getatextRequest<T>(
  method: "GET" | "POST",
  endpoint: string,
  body?: Record<string, unknown>,
  timeoutMs = 20000
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Auth: getApiKey(),
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.error(`[GetAText] API returned non-JSON/HTML (${response.status}):`, text.slice(0, 300));
      throw new Error("Standard Server is temporarily undergoing maintenance. Please try again in a few moments.");
    }

    if (!response.ok) {
      const msg = data?.errors ?? data?.message ?? `HTTP ${response.status}`;
      throw new Error(`GetAText API error (${response.status}): ${msg}`);
    }

    // Some endpoints return {errors: null, ...} even on success — treat errors:null as success
    if (data?.errors && data.errors !== "null" && data.errors !== null) {
      throw new Error(`GetAText API error: ${data.errors}`);
    }

    return data as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Connection to GetAText timed out.");
    }
    throw err;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetatextService {
  service_name: string;   // Display name e.g. "Whatsapp"
  api_name: string;       // API code e.g. "whatsapp"
  price: string;          // e.g. "0.55"  (USD)
  stock: number;          // available numbers
  ttl: number;            // minutes the rental lasts
  multiple_sms?: string | boolean;
}

export interface GetatextRental {
  id: number;
  status: string;         // "success" on purchase
  message: string;
  errors: string | null;
  end_time: string;
  number: string;
  service_name: string;
  price: string;          // USD
  new_balance: string;
}

export interface GetatextRentalStatus {
  id: number;
  status: string;         // "active" | "cancelled" | "completed" | "expired"
  code: string | null;    // the SMS verification code when received
  errors: string | null;
  end_time: string;
  number: string;
  service_name: string;
  cost: string;
  balance: string;
}

export interface GetatextBalanceResponse {
  status: string;
  balance: string;
  errors: string | null;
}

// ─── Services list (synced from GetAText /prices-info on 2026-07-08) ───────────
// Prices are in USD; the UI converts to Naira with the 55% margin multiplier.
// api_name values are the EXACT slugs required by the GetAText API.
export const GETATEXT_FALLBACK_SERVICES: GetatextService[] = [
  { service_name: "WhatsApp", api_name: "whatsapp", price: "1.43", stock: 0, ttl: 15, multiple_sms: "true" },
  { service_name: "Google / Gmail / Youtube", api_name: "google", price: "0.6", stock: 0, ttl: 10, multiple_sms: "true" },
  { service_name: "Telegram", api_name: "telegram", price: "1", stock: 0, ttl: 15, multiple_sms: "true" },
  { service_name: "1688", api_name: "1688", price: "0.24", stock: 11947, ttl: 10, multiple_sms: "false" },
  { service_name: "1Q", api_name: "1q", price: "0.1", stock: 11944, ttl: 10, multiple_sms: "false" },
  { service_name: "360NRS", api_name: "360nrs", price: "0.19", stock: 11947, ttl: 10, multiple_sms: "false" },
  { service_name: "3Fun", api_name: "3fun", price: "0.2", stock: 11943, ttl: 10, multiple_sms: "true" },
  { service_name: "7-Eleven", api_name: "7-eleven", price: "0.19", stock: 11945, ttl: 10, multiple_sms: "true" },
  { service_name: "AARP", api_name: "aarp", price: "0.15", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Abra", api_name: "abra", price: "0.19", stock: 11947, ttl: 10, multiple_sms: "false" },
  { service_name: "MoneyPatrol", api_name: "moneypatrol", price: "0.19", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Airbnb", api_name: "airbnb", price: "0.24", stock: 11945, ttl: 10, multiple_sms: "true" },
  { service_name: "Alibaba", api_name: "alibaba", price: "0.19", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Alibaba Cloud", api_name: "alibabacloud", price: "0.08", stock: 11948, ttl: 10, multiple_sms: "true" },
  { service_name: "Aliexpress", api_name: "aliexpress", price: "0.31", stock: 11948, ttl: 10, multiple_sms: "true" },
  { service_name: "Allset", api_name: "allset", price: "0.15", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Amazon / AWS", api_name: "amazon", price: "0.2", stock: 192, ttl: 10, multiple_sms: "true" },
  { service_name: "AOL", api_name: "aol", price: "0.09", stock: 11130, ttl: 10, multiple_sms: "true" },
  { service_name: "Apple / Icloud", api_name: "apple", price: "0.14", stock: 11700, ttl: 10, multiple_sms: "true" },
  { service_name: "Badi", api_name: "badi", price: "0.15", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Badoo", api_name: "badoo", price: "0.15", stock: 11873, ttl: 10, multiple_sms: "true" },
  { service_name: "Battle.net / Blizzard", api_name: "battle.net/blizzard", price: "0.28", stock: 11948, ttl: 10, multiple_sms: "true" },
  { service_name: "Bilibili", api_name: "bilibili", price: "0.4", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "BlaBlaCar", api_name: "blablacar", price: "0.2", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "BLK", api_name: "blk", price: "0.1", stock: 11859, ttl: 10, multiple_sms: "false" },
  { service_name: "BlueVine", api_name: "bluevine", price: "0.15", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Bumble", api_name: "bumble", price: "0.18", stock: 11845, ttl: 10, multiple_sms: "true" },
  { service_name: "Burner", api_name: "burner", price: "0.1", stock: 11941, ttl: 10, multiple_sms: "true" },
  { service_name: "ChargePoint", api_name: "chargepoint", price: "0.1", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Chipotle", api_name: "chipotle", price: "0.1", stock: 11666, ttl: 10, multiple_sms: "false" },
  { service_name: "Claude / Anthropic", api_name: "claude", price: "0.36", stock: 11945, ttl: 10, multiple_sms: "false" },
  { service_name: "Clubhouse", api_name: "clubhouse", price: "0.15", stock: 11946, ttl: 10, multiple_sms: "false" },
  { service_name: "Coffee Meets Bagel / CMB", api_name: "coffeemeetsbagel/cmb", price: "0.09", stock: 11827, ttl: 10, multiple_sms: "false" },
  { service_name: "Crypto.com", api_name: "crypto.com", price: "0.19", stock: 11947, ttl: 10, multiple_sms: "true" },
  { service_name: "CVS", api_name: "cvs", price: "0.1", stock: 11648, ttl: 10, multiple_sms: "true" },
  { service_name: "Deliveroo", api_name: "deliveroo", price: "0.18", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Depop", api_name: "depop", price: "0.24", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "DocuSign", api_name: "docusign", price: "0.1", stock: 11947, ttl: 10, multiple_sms: "true" },
  { service_name: "Dollar General", api_name: "dollargeneral", price: "0.19", stock: 11932, ttl: 10, multiple_sms: "true" },
  { service_name: "DoorDash", api_name: "doordash", price: "0.2", stock: 10478, ttl: 15, multiple_sms: "true" },
  { service_name: "DraftKings", api_name: "draftkings", price: "0.35", stock: 11942, ttl: 10, multiple_sms: "true" },
  { service_name: "eBay", api_name: "ebay", price: "0.3", stock: 11279, ttl: 10, multiple_sms: "true" },
  { service_name: "Facebook", api_name: "facebook", price: "0.66", stock: 84, ttl: 15, multiple_sms: "true" },
  { service_name: "Fiverr", api_name: "fiverr", price: "0.12", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Freelancer", api_name: "freelancer", price: "0.24", stock: 11947, ttl: 10, multiple_sms: "false" },
  { service_name: "Gemini", api_name: "gemini", price: "0.5", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "GoDaddy", api_name: "godaddy", price: "0.24", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Google Business Profile", api_name: "googlebusinessprofile", price: "0.19", stock: 11936, ttl: 10, multiple_sms: "false" },
  { service_name: "Google Voice", api_name: "google-voice", price: "0.3", stock: 11865, ttl: 10, multiple_sms: "true" },
  { service_name: "Grab", api_name: "grab", price: "0.24", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Grindr", api_name: "grindr", price: "0.11", stock: 10999, ttl: 10, multiple_sms: "true" },
  { service_name: "Happn", api_name: "happn", price: "0.2", stock: 11947, ttl: 10, multiple_sms: "true" },
  { service_name: "Hinge", api_name: "hinge", price: "0.3", stock: 11731, ttl: 10, multiple_sms: "true" },
  { service_name: "Humble Bundle", api_name: "humblebundle", price: "0.17", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Indeed", api_name: "indeed", price: "0.14", stock: 11941, ttl: 10, multiple_sms: "true" },
  { service_name: "Instacart", api_name: "instacart", price: "0.15", stock: 11920, ttl: 10, multiple_sms: "true" },
  { service_name: "Instagram / Threads", api_name: "instagram/threads", price: "0.25", stock: 5412, ttl: 20, multiple_sms: "true" },
  { service_name: "KakaoTalk", api_name: "kakaotalk", price: "0.14", stock: 11930, ttl: 10, multiple_sms: "true" },
  { service_name: "LINE", api_name: "line", price: "0.05", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "LinkedIn", api_name: "linkedin", price: "0.1", stock: 11914, ttl: 10, multiple_sms: "false" },
  { service_name: "Lyft", api_name: "lyft", price: "0.13", stock: 11911, ttl: 10, multiple_sms: "false" },
  { service_name: "Match / Meetic", api_name: "match", price: "0.2", stock: 4186, ttl: 10, multiple_sms: "true" },
  { service_name: "Mercari", api_name: "mercari", price: "0.19", stock: 11923, ttl: 10, multiple_sms: "false" },
  { service_name: "Microsoft / Outlook / Hotmail", api_name: "microsoft", price: "0.18", stock: 11945, ttl: 15, multiple_sms: "true" },
  { service_name: "Netflix", api_name: "netflix", price: "0.1", stock: 11916, ttl: 10, multiple_sms: "true" },
  { service_name: "Nextdoor", api_name: "nextdoor", price: "0.1", stock: 11907, ttl: 10, multiple_sms: "true" },
  { service_name: "Nike", api_name: "nike", price: "0.2", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "OfferUp", api_name: "offerup", price: "0.1", stock: 11694, ttl: 10, multiple_sms: "false" },
  { service_name: "OkCupid", api_name: "okcupid", price: "0.1", stock: 11433, ttl: 10, multiple_sms: "true" },
  { service_name: "ChatGPT / OpenAI", api_name: "chatgpt", price: "0.07", stock: 11806, ttl: 10, multiple_sms: "true" },
  { service_name: "Plenty Of Fish", api_name: "plentyoffish", price: "0.14", stock: 10252, ttl: 10, multiple_sms: "true" },
  { service_name: "Poshmark", api_name: "poshmark", price: "0.1", stock: 11220, ttl: 10, multiple_sms: "false" },
  { service_name: "Reddit", api_name: "reddit", price: "0.19", stock: 11932, ttl: 10, multiple_sms: "true" },
  { service_name: "SHEIN", api_name: "shein", price: "0.14", stock: 11770, ttl: 10, multiple_sms: "true" },
  { service_name: "Signal", api_name: "signal", price: "0.1", stock: 9345, ttl: 10, multiple_sms: "false" },
  { service_name: "Snapchat", api_name: "snapchat", price: "0.07", stock: 6820, ttl: 20, multiple_sms: "true" },
  { service_name: "Temu", api_name: "temu", price: "0.09", stock: 11946, ttl: 10, multiple_sms: "true" },
  { service_name: "Ticketmaster", api_name: "ticketmaster", price: "0.11", stock: 10825, ttl: 10, multiple_sms: "true" },
  { service_name: "TikTok / Doujin", api_name: "tiktok", price: "0.08", stock: 6895, ttl: 15, multiple_sms: "true" },
  { service_name: "Tinder", api_name: "tinder", price: "0.1", stock: 8353, ttl: 10, multiple_sms: "true" },
  { service_name: "Twitch", api_name: "twitch", price: "0.2", stock: 11901, ttl: 10, multiple_sms: "false" },
  { service_name: "Uber / Postmates", api_name: "uber", price: "0.1", stock: 10297, ttl: 10, multiple_sms: "true" },
  { service_name: "Ubisoft", api_name: "ubisoft", price: "0.24", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Upwork", api_name: "upwork", price: "0.1", stock: 11946, ttl: 10, multiple_sms: "true" },
  { service_name: "Vercel", api_name: "vercel", price: "0.1", stock: 11946, ttl: 10, multiple_sms: "true" },
  { service_name: "Viber", api_name: "viber", price: "0.14", stock: 5620, ttl: 10, multiple_sms: "false" },
  { service_name: "VK", api_name: "vk", price: "0.1", stock: 11838, ttl: 10, multiple_sms: "true" },
  { service_name: "Walmart", api_name: "walmart", price: "0.39", stock: 0, ttl: 20, multiple_sms: "true" },
  { service_name: "WeChat", api_name: "wechat", price: "0.14", stock: 3825, ttl: 25, multiple_sms: "true" },
  { service_name: "X.com / Twitter", api_name: "x-twitter", price: "0.16", stock: 11882, ttl: 15, multiple_sms: "false" },
  { service_name: "Yahoo", api_name: "yahoo", price: "0.1", stock: 8530, ttl: 10, multiple_sms: "true" },
  { service_name: "Zoho", api_name: "zoho", price: "0.24", stock: 11932, ttl: 10, multiple_sms: "true" },
  { service_name: "Craigslist", api_name: "craigslist", price: "0.14", stock: 11908, ttl: 10, multiple_sms: "false" },
  { service_name: "Chick-fil-A", api_name: "chick-fil-a", price: "0.15", stock: 11935, ttl: 15, multiple_sms: "true" },
  { service_name: "Discord", api_name: "discord", price: "0.14", stock: 11925, ttl: 10, multiple_sms: "true" },
  { service_name: "Etsy", api_name: "etsy", price: "0.12", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Fetch Rewards", api_name: "fetchrewards", price: "0.1", stock: 11942, ttl: 15, multiple_sms: "false" },
  { service_name: "Bestbuy", api_name: "bestbuy", price: "0.15", stock: 11946, ttl: 10, multiple_sms: "false" },
  { service_name: "Fanduel", api_name: "fanduel", price: "0.2", stock: 11947, ttl: 15, multiple_sms: "false" },
  { service_name: "Bet365", api_name: "bet365", price: "0.16", stock: 11920, ttl: 15, multiple_sms: "true" },
  { service_name: "DraftKings", api_name: "draftkings", price: "0.35", stock: 11942, ttl: 10, multiple_sms: "true" },
  { service_name: "Sephora", api_name: "sephora", price: "0.12", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Taco Bell", api_name: "tacobell", price: "0.25", stock: 11949, ttl: 15, multiple_sms: "false" },
  { service_name: "Thumbtack", api_name: "thumbtack", price: "0.2", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "TradingView", api_name: "tradingview", price: "0.17", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Truth Social", api_name: "truthsocial", price: "0.08", stock: 11144, ttl: 10, multiple_sms: "true" },
  { service_name: "Webull", api_name: "webull", price: "0.2", stock: 11945, ttl: 10, multiple_sms: "false" },
  { service_name: "Whatnot", api_name: "whatnot", price: "0.1", stock: 5137, ttl: 15, multiple_sms: "false" },
  { service_name: "Zillow", api_name: "zillow", price: "0.11", stock: 11910, ttl: 10, multiple_sms: "true" },
  { service_name: "Swagbucks / InboxDollars", api_name: "swagbucks", price: "0.08", stock: 11949, ttl: 10, multiple_sms: "false" },
  { service_name: "Freecash", api_name: "freecash", price: "0.12", stock: 11949, ttl: 10, multiple_sms: "true" },
  { service_name: "Cursor", api_name: "cursor", price: "0.1", stock: 11946, ttl: 10, multiple_sms: "false" },
  { service_name: "Sam's Club", api_name: "samsclub", price: "0.1", stock: 11936, ttl: 10, multiple_sms: "true" },
  { service_name: "Wonder", api_name: "wonder", price: "0.18", stock: 11936, ttl: 10, multiple_sms: "true" },
  { service_name: "Not Listed (Generic)", api_name: "generic-service", price: "1", stock: 11945, ttl: 10, multiple_sms: "true" },
];

// ─── API Functions ─────────────────────────────────────────────────────────────

/**
 * Get all available services (USA only).
 *
 * Fetches live data from /prices-info (works on Vercel).
 * Falls back to the static list if the API is unavailable.
 */
export async function getatextGetServices(): Promise<GetatextService[]> {
  try {
    const data = await getatextRequest<{ prices: GetatextService[] }>("GET", "/prices-info", undefined, 12000);
    const services = data?.prices ?? [];
    if (services.length > 0 && services[0].api_name) {
      // Normalize price field to string to match the interface
      return services.map((s) => ({ ...s, price: String(s.price), multiple_sms: String(s.multiple_sms) }));
    }
  } catch (err: any) {
    console.warn("[GetAText] prices-info unavailable, using fallback:", err?.message);
  }
  return GETATEXT_FALLBACK_SERVICES;
}

/** Get GetAText account balance */
export async function getatextGetBalance(): Promise<number> {
  const data = await getatextRequest<GetatextBalanceResponse>("GET", "/balance");
  return parseFloat(data.balance ?? "0");
}

/** Rent a number for a given service (USA only) */
export async function getatextRentNumber(serviceCode: string): Promise<GetatextRental> {
  return getatextRequest<GetatextRental>("POST", "/rent-a-number", {
    service: serviceCode,
  });
}

/** Get the current status of a rental (polls for SMS code) */
export async function getatextGetRentalStatus(id: number): Promise<GetatextRentalStatus> {
  return getatextRequest<GetatextRentalStatus>("POST", "/rental-status", { id });
}

/** Cancel a rental */
export async function getatextCancelRental(id: number): Promise<void> {
  await getatextRequest("POST", "/cancel-rental", { id });
}

/** Mark a rental as completed (releases the number back to the pool) */
export async function getatextCompleteRental(id: number): Promise<void> {
  await fetch(`${BASE_URL}/rental-status/${id}/completed`, {
    method: "POST",
    headers: {
      Auth: getApiKey(),
      "Content-Type": "application/json",
    },
  });
}
