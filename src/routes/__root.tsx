import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        {/* Development Error Display */}
        <div className="mt-4 text-left max-w-full overflow-hidden">
          <details className="bg-muted border border-border rounded-lg p-3 text-xs text-destructive font-mono cursor-pointer">
            <summary className="font-semibold text-foreground/80 hover:text-foreground select-none">
              View Error Details (Development)
            </summary>
            <div className="mt-2 whitespace-pre-wrap overflow-x-auto max-h-48 text-left select-text">
              {error.message || String(error)}
              {error.stack && (
                <div className="mt-2 pt-2 border-t border-border opacity-70 text-[10px]">
                  {error.stack}
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hammzy Digitals — Virtual Phone Numbers & Social Media Logs Nigeria" },
      { 
        name: "description", 
        content: "Buy virtual phone numbers & premium social media logs in Nigeria. Instant SMS verification for WhatsApp, Telegram, Instagram. Fast, secure & affordable. 170+ countries available." 
      },
      { name: "keywords", content: "virtual phone numbers Nigeria, buy phone numbers online, SMS verification, OTP verification, temporary phone number, social media logs, Instagram logs, Facebook logs, WhatsApp verification, Telegram verification, virtual number Nigeria, disposable phone number" },
      { name: "author", content: "Hammzy Digitals" },
      { name: "robots", content: "index, follow" },
      { name: "googlebot", content: "index, follow" },
      { name: "language", content: "English" },
      { name: "geo.region", content: "NG" },
      { name: "geo.placename", content: "Nigeria" },
      
      // Open Graph
      { property: "og:title", content: "Hammzy Digitals — Virtual Phone Numbers & Social Media Logs" },
      { 
        property: "og:description", 
        content: "Get instant virtual phone numbers from 170+ countries. Buy premium social media logs. Fast SMS & OTP verification for all platforms." 
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://hammzy.ng" },
      { property: "og:site_name", content: "Hammzy Digitals" },
      { property: "og:locale", content: "en_NG" },
      
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Hammzy Digitals — Virtual Phone Numbers & Social Media Logs" },
      { 
        name: "twitter:description", 
        content: "Buy virtual phone numbers & premium social media logs. Instant verification for WhatsApp, Telegram, Instagram & more." 
      },
      
      // Additional SEO
      { name: "theme-color", content: "#8b5cf6" },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: "https://hammzy.ng",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Hammzy Digitals",
              "url": "https://hammzy.ng",
              "description": "Buy virtual phone numbers from 170+ countries and premium social media logs in Nigeria. Instant SMS & OTP verification.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://hammzy.ng/numbers?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Hammzy Digitals",
              "url": "https://hammzy.ng",
              "logo": "https://hammzy.ng/hammzy-logo.jpeg",
              "description": "Leading provider of virtual phone numbers and social media logs in Nigeria",
              "email": "hammzydigital@gmail.com",
              "areaServed": {
                "@type": "Country",
                "name": "Nigeria"
              },
              "serviceType": ["Virtual Phone Numbers", "SMS Verification", "Social Media Logs"]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              "name": "Virtual Phone Numbers",
              "description": "Buy virtual phone numbers from 170+ countries for SMS verification",
              "brand": {
                "@type": "Brand",
                "name": "Hammzy Digitals"
              },
              "offers": {
                "@type": "AggregateOffer",
                "priceCurrency": "NGN",
                "lowPrice": "200",
                "highPrice": "5000",
                "availability": "https://schema.org/InStock"
              }
            })
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthRouterInvalidator() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [lastSessionId, setLastSessionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!loading) {
      const currentSessionId = session?.access_token;
      if (currentSessionId !== lastSessionId) {
        setLastSessionId(currentSessionId);
        router.invalidate();
      }
    }
  }, [session, loading, router, lastSessionId]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations.length > 0) {
          console.log(
            `[ServiceWorker] Found ${registrations.length} registered service worker(s) on origin ${window.location.origin}. Unregistering to prevent local development conflicts.`,
          );
          for (const registration of registrations) {
            registration.unregister().then((success) => {
              if (success) {
                console.log("[ServiceWorker] Successfully unregistered rogue service worker.");
                window.location.reload();
              }
            });
          }
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AuthProvider>
        <AuthRouterInvalidator />
        <Outlet />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
