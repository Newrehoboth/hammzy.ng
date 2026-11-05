import crypto from "node:crypto";

const BASE_URL = "https://api.pocketfi.ng/api/v1";
const BUSINESS_ID = process.env.POCKETFI_BUSINESS_ID ?? "30311";
const PUBLIC_KEY = process.env.POCKETFI_PUBLIC_KEY ?? "";
const SECRET_KEY = process.env.POCKETFI_SECRET_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PocketFiVirtualAccount {
  bankName: string;         // e.g. "paga"
  accountNumber: string;    // e.g. "3132067635"
  accountName: string;      // customer full name
}

export interface PocketFiCreateResponse {
  status: boolean;
  service: string;
  businessId: number;
  banks: PocketFiVirtualAccount[];
}

export interface PocketFiFetchResponse {
  status: boolean;
  data: Array<{
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    accounts: PocketFiVirtualAccount[];
  }>;
}

export interface PocketFiWebhookPayload {
  order: {
    amount: number;
    settlement_amount: number;
    fee: number;
    description: string;
  };
  transaction: {
    reference: string;
  };
}

// ─── API Helper ────────────────────────────────────────────────────────────────

async function pocketfiRequest<T>(
  method: "GET" | "POST",
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const key = PUBLIC_KEY || process.env.POCKETFI_PUBLIC_KEY;
  if (!key) throw new Error("POCKETFI_PUBLIC_KEY is not set.");

  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`[PocketFi] ${method} ${endpoint}`, body ? JSON.stringify(body) : '');
  
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  
  console.log(`[PocketFi] Response (${res.status}):`, JSON.stringify(data));
  
  if (!res.ok || data.status === false) {
    const errorMsg = data.message ?? `PocketFi API error (${res.status})`;
    console.error(`[PocketFi] Error:`, errorMsg, data);
    throw new Error(errorMsg);
  }
  return data as T;
}

// ─── Create a dedicated Paga virtual account for a user ───────────────────────

export async function createPagaVirtualAccount(params: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): Promise<PocketFiVirtualAccount> {
  const data = await pocketfiRequest<PocketFiCreateResponse>(
    "POST",
    "/virtual-accounts/create",
    {
      first_name: params.firstName,
      last_name: params.lastName,
      email: params.email,
      phone: params.phone,
      businessId: BUSINESS_ID,
      bank: "paga",
    }
  );

  const pagaAccount = data.banks?.find((b) => b.bankName === "paga") ?? data.banks?.[0];
  if (!pagaAccount) throw new Error("PocketFi did not return a Paga account.");
  return pagaAccount;
}

// ─── Fetch all virtual accounts (for admin/debugging) ─────────────────────────

export async function fetchAllVirtualAccounts() {
  return pocketfiRequest<PocketFiFetchResponse>("GET", `/virtual-accounts/fetch?businessId=${BUSINESS_ID}`);
}

// ─── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify a PocketFi webhook request.
 * PocketFi sends HMAC-SHA512(rawBody, secretKey) in the `http_pocketfi_signature` header.
 */
export function verifyPocketFiWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = SECRET_KEY || process.env.POCKETFI_SECRET_KEY;
  if (!secret) {
    console.error("[PocketFi] POCKETFI_SECRET_KEY not set — rejecting webhook.");
    return false;
  }
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  const isValid = expected.toLowerCase() === signature.trim().toLowerCase();
  if (!isValid) {
    console.warn(`[PocketFi] Signature verification failed. Expected: ${expected.toLowerCase()}, Received: ${signature.trim().toLowerCase()}`);
  }
  return isValid;
}
