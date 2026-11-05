import { createStart, createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }

    // Server function RPC calls go through /_serverFn/... paths.
    // For these, we must re-throw so TanStack Start serializes the error
    // as JSON and the client receives the actual error message (e.g.
    // "Insufficient balance", "Out of stock") instead of "fetch failed".
    try {
      const req = getRequest();
      if (req?.url?.includes("/_serverFn")) {
        throw error;
      }
    } catch (innerErr) {
      // If getRequest() itself throws (no request context), re-throw original.
      throw error;
    }

    // For page/SSR requests, return the branded error HTML page.
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
