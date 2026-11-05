import { createFileRoute } from "@tanstack/react-router";
import { verifyPocketFiWebhookSignature } from "@/lib/api/pocketfi.server";

export const Route = createFileRoute("/webhook/pocketfi")({
  server: {
    handlers: {
      POST: async () => {
        const { getRequest } = await import("@tanstack/react-start/server");
        const request = getRequest();

        if (!request) {
          return new Response(JSON.stringify({ message: "No request context" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const rawBody = await request.text();
          
          // Log all request headers for debugging
          const headersMap: Record<string, string> = {};
          request.headers.forEach((value, key) => {
            headersMap[key] = value;
          });
          console.log("[PocketFi Webhook] Received Headers:", JSON.stringify(headersMap, null, 2));

          // Resolve signature from various possible header forms
          let signature = "";
          const possibleHeaders = [
            "http_pocketfi_signature",
            "http-pocketfi-signature",
            "pocketfi-signature",
            "pocketfi_signature",
            "x-pocketfi-signature",
            "x-pocketfi_signature"
          ];

          for (const headerName of possibleHeaders) {
            const val = request.headers.get(headerName) || request.headers.get(headerName.toUpperCase());
            if (val) {
              signature = val;
              console.log(`[PocketFi Webhook] Found signature using header "${headerName}":`, signature);
              break;
            }
          }

          // If still not found, check if any header key contains "signature" or "pocketfi"
          if (!signature) {
            for (const [key, val] of Object.entries(headersMap)) {
              if (key.toLowerCase().includes("signature") || key.toLowerCase().includes("pocketfi")) {
                signature = val;
                console.log(`[PocketFi Webhook] Fallback matched header "${key}":`, signature);
                break;
              }
            }
          }

          // Verify the webhook signature
          const isValid = verifyPocketFiWebhookSignature(rawBody, signature);
          if (!isValid) {
            console.error(`[PocketFi Webhook] INVALID SIGNATURE - rejecting webhook. Signature received: "${signature}"`);
            return new Response(JSON.stringify({ message: "Invalid signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const data = JSON.parse(rawBody);
          console.log("[PocketFi Webhook] Received verified payload:", JSON.stringify(data, null, 2));

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Extract payment parameters
          const amount = Number(data.order?.amount);
          const reference = String(data.transaction?.reference || `pfi_${Date.now()}`);
          
          if (!amount || isNaN(amount) || amount <= 0) {
            return new Response(JSON.stringify({ message: "Invalid amount" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Locate the user parameters
          let email = data.customer?.email || data.email || data.customer_email || data.order?.email || "";
          let accountNumber = data.account_number || data.accountNumber || data.banks?.[0]?.accountNumber || data.virtual_account || "";

          // Fallback: search for any 10-digit number in the description
          if (!accountNumber && data.order?.description) {
            const match = data.order.description.match(/\b\d{10}\b/);
            if (match) {
              accountNumber = match[0];
            }
          }

          // Credit user wallet using the new all-in-one atomic RPC (bypasses RLS)
          const { data: newBalance, error: rpcError } = await supabaseAdmin.rpc(
            "rpc_process_webhook_payment",
            {
              p_reference: reference,
              p_amount: amount,
              p_account_number: accountNumber,
              p_email: email,
            }
          );

          if (rpcError) {
            console.error("[PocketFi Webhook] Database RPC error:", rpcError);
            return new Response(JSON.stringify({ message: `Database error: ${rpcError.message}` }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (newBalance === null || newBalance === -1) {
            console.error(`[PocketFi Webhook] Could not associate payment reference ${reference} with any user. Email: ${email}, Account: ${accountNumber}`);
            return new Response(JSON.stringify({ message: "User not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
          }

          console.log(`[PocketFi Webhook] Successfully processed payment ${reference}. New balance: ₦${newBalance}`);

          return new Response(JSON.stringify({ message: "success", newBalance }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("[PocketFi Webhook] Processing error:", err);
          return new Response(JSON.stringify({ message: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
