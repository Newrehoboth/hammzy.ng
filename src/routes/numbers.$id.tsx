import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, XCircle, Copy, Download, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Flag } from "@/components/flag";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getOrder,
  cancelOrder,
  finishOrder,
  type FivesimSms,
} from "@/lib/orders.functions";
import { ServiceLogo } from "@/components/service-logo";

export const Route = createFileRoute("/numbers/$id")({
  head: () => ({ meta: [{ title: "Number Details — Hammzy Digitals" }] }),
  loader: async ({ params }) => {
    try {
      const order = await getOrder({ data: { orderId: params.id } });
      if (!order) throw notFound();
      return { order };
    } catch (err) {
      console.error(err);
      throw notFound();
    }
  },
  component: NumberDetails,
  notFoundComponent: () => (
    <AppShell>
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">Number or activation order not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/numbers">Back to marketplace</Link>
        </Button>
      </div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell>
      <div className="p-12 text-center text-muted-foreground">
        Something went wrong loading this number. Please check your credentials or try again.
      </div>
    </AppShell>
  ),
});

function NumberDetails() {
  const { order: initialOrder } = Route.useLoaderData();
  const [order, setOrder] = useState(initialOrder);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Time left state
  const [timeLeft, setTimeLeft] = useState("");
  const expiresAt = order.parsedMeta?.expiresAt;

  // Poll for updates if the order is still waiting for SMS
  useEffect(() => {
    const status = order.status.toLowerCase();
    if (status !== "pending" && status !== "received") {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getOrder({ data: { orderId: order.id } });
        setOrder(updated);
      } catch (err) {
        console.warn("Auto-sync failed:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [order.id, order.status]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft("—");
      return;
    }

    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${min}:${sec.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleFinish = async () => {
    setActionLoading(true);
    const t = toast.loading("Completing activation...");
    try {
      const updated = await finishOrder({ data: { orderId: order.id } });
      toast.success("Activation completed successfully!");
      // Sync local state
      const synced = await getOrder({ data: { orderId: order.id } });
      setOrder(synced);
    } catch (err: any) {
      toast.error(err.message || "Failed to finish activation.");
    } finally {
      toast.dismiss(t);
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    const t = toast.loading("Cancelling activation order...");
    try {
      const updated = await cancelOrder({ data: { orderId: order.id } });
      toast.success("Activation order cancelled and refunded!");
      // Sync local state
      const synced = await getOrder({ data: { orderId: order.id } });
      setOrder(synced);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order.");
    } finally {
      toast.dismiss(t);
      setActionLoading(false);
    }
  };

  const status = order.status.toLowerCase();
  const isActive = status === "pending" || status === "received";
  const formattedService = order.service ? order.service.charAt(0).toUpperCase() + order.service.slice(1) : "Unknown";
  const smsMessages: FivesimSms[] = order.parsedMeta?.sms ?? [];

  // Get status badge variant
  const getBadgeVariant = (s: string) => {
    if (s === "finished") return "secondary";
    if (s === "pending" || s === "received") return "outline";
    return "destructive";
  };

  const troubleshootingTips = [
    "Your IP address' country should be the same as the country of the phone number you bought. Be sure to use proxy e.g (proxy-seller.com) or VPN",
    "Can't receive OTP? Try requesting the SMS message for the service you need again."
  ];

  return (
    <AppShell>
      <Link
        to="/numbers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Marketplace
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <Flag code={order.parsedMeta?.countryCode || "US"} className="size-12 z-10" />
              <ServiceLogo name={order.service ?? undefined} size="lg" className="z-20 border-2 border-card" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{order.number}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    void navigator.clipboard?.writeText(order.number);
                    toast.success("Number copied");
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {order.country} · {formattedService}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActive && (
              <>
                <Button variant="hero" onClick={handleFinish} disabled={actionLoading}>
                  Complete Activation
                </Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleCancel} disabled={actionLoading}>
                  <XCircle className="size-4" /> Cancel Order
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-4">
          <Meta
            label="Status"
            value={
              <Badge variant={getBadgeVariant(status)} className="capitalize">
                {order.status === "received" ? "code received" : order.status}
              </Badge>
            }
          />
          <Meta label="Cost" value={`₦${Number(order.price).toFixed(2)}`} />
          <Meta
            label="Expires"
            value={
              isActive ? (
                <span className="font-mono text-amber-500 font-semibold">{timeLeft}</span>
              ) : (
                "Finalized"
              )
            }
          />
          <Meta label="SMS Received" value={String(order.parsedMeta?.sms?.length || 0)} />
        </div>
      </div>

      {/* Troubleshooting Tips Carousel */}
      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground mb-3">Troubleshooting Tips</h3>
            <div className="relative">
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-500/20 text-amber-600 font-bold text-xs mr-2">
                  {currentTipIndex + 1}
                </span>
                {troubleshootingTips[currentTipIndex]}
              </p>
            </div>
            {troubleshootingTips.length > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {troubleshootingTips.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentTipIndex(i)}
                      className={`size-1.5 rounded-full transition-all ${
                        i === currentTipIndex
                          ? "bg-amber-500 w-6"
                          : "bg-amber-500/30 hover:bg-amber-500/50"
                      }`}
                      aria-label={`Go to tip ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-amber-600 hover:bg-amber-500/10"
                    onClick={() =>
                      setCurrentTipIndex((prev) =>
                        prev === 0 ? troubleshootingTips.length - 1 : prev - 1
                      )
                    }
                    disabled={troubleshootingTips.length === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-amber-600 hover:bg-amber-500/10"
                    onClick={() =>
                      setCurrentTipIndex((prev) =>
                        prev === troubleshootingTips.length - 1 ? 0 : prev + 1
                      )
                    }
                    disabled={troubleshootingTips.length === 1}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="sms" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="sms">SMS Inbox</TabsTrigger>
          <TabsTrigger value="otp">OTP Codes</TabsTrigger>
          <TabsTrigger value="logs">API Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-4">
          <SmsInbox smsList={smsMessages} service={formattedService} />
        </TabsContent>

        <TabsContent value="otp" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
            {smsMessages.filter((m) => m.code).length > 0 ? (
              smsMessages
                .filter((m) => m.code)
                .map((m) => (
                  <div key={m.id} className="flex items-center justify-between border-b border-border py-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{m.sender}</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.created_at || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded-lg bg-primary/10 px-3 py-1 font-mono text-base font-bold tracking-widest text-primary">
                        {m.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          void navigator.clipboard?.writeText(m.code);
                          toast.success("OTP code copied");
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-sm text-center py-6 text-muted-foreground">No verification codes received yet.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-4 font-mono text-xs shadow-sm space-y-1">
            <p className="text-muted-foreground">
              [SYSTEM] Connection with provider established. API protocol: v1 (Bearer JWT).
            </p>
            <p className="text-muted-foreground">
              [ORDER_ID] Internal UUID: {order.id} | Activation ID: {order.parsedMeta?.activationId || "None"}
            </p>
            <p className="text-muted-foreground">
              [CREATED] {new Date(order.created_at).toISOString()}
            </p>
            {order.parsedMeta?.activationId && (
              <p className="text-muted-foreground">
                GET /v1/user/check/{order.parsedMeta.activationId} → 200 OK ({status})
              </p>
            )}
            {!isActive && (
              <p className="text-muted-foreground">
                Finalized status: {status.toUpperCase()}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function highlightOtp(text: string, otp?: string) {
  if (!otp) return text;
  const parts = text.split(new RegExp(`(${otp.replace(/(\d)/g, "$1[\\s-]?")})`));
  return parts.map((part, i) =>
    part.replace(/[\s-]/g, "") === otp ? (
      <span key={i} className="rounded bg-primary/15 px-1 font-mono font-bold text-primary">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function SmsInbox({ smsList, service }: { smsList: FivesimSms[]; service: string }) {
  return (
    <div className="flex h-[400px] flex-col rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {smsList.map((m) => (
          <div key={m.id} className="max-w-[85%]">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground capitalize">{m.sender || service}</span>
              <span>{new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-muted/50 px-4 py-2.5 text-sm">
              {highlightOtp(m.text, m.code)}
            </div>
          </div>
        ))}
        {smsList.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary/40 mb-2" />
            <p className="text-sm font-medium">Waiting for verification SMS...</p>
            <p className="text-xs mt-1">Send the OTP code to your number from {service} now.</p>
          </div>
        )}
      </div>
    </div>
  );
}