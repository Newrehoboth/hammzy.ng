import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, MessageSquare, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";
import { listMyOrders, type OrderWithMeta } from "@/lib/orders.functions";
import { ServiceLogo } from "@/components/service-logo";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — Hammzy Digitals" }] }),
  loader: async () => {
    try {
      const orders = await listMyOrders();
      return { orders };
    } catch (err) {
      console.error("Messages loader failed:", err);
      return { orders: [] };
    }
  },
  component: Messages,
});

function Messages() {
  const { orders } = Route.useLoaderData() as { orders: OrderWithMeta[] };
  const [q, setQ] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | "all">("all");

  // Compile unified flat list of all messages across all numbers
  const allMessages = useMemo(() => {
    const list: Array<{
      id: string;
      sender: string;
      body: string;
      otp?: string;
      receivedAt: string;
      toNumber: string;
      country: string;
      countryCode: string;
    }> = [];

    orders.forEach((o) => {
      const meta = o.parsedMeta;
      const serviceName = o.service ? o.service.charAt(0).toUpperCase() + o.service.slice(1) : "Service";
      if (meta && meta.sms) {
        meta.sms.forEach((s: any) => {
          list.push({
            id: `sms-${o.id}-${s.id}`,
            sender: s.sender || serviceName,
            body: s.text,
            otp: s.code || undefined,
            receivedAt: s.date || s.created_at,
            toNumber: o.number,
            country: o.country || "Unknown",
            countryCode: meta.countryCode || "US",
          });
        });
      }
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }, [orders]);

  // Filter messages based on search query and selected number
  const filteredMessages = useMemo(() => {
    return allMessages.filter(
      (m) =>
        (selectedNumber === "all" || m.toNumber === selectedNumber) &&
        (m.body.toLowerCase().includes(q.toLowerCase()) ||
          m.sender.toLowerCase().includes(q.toLowerCase()) ||
          m.toNumber.includes(q))
    );
  }, [allMessages, selectedNumber, q]);

  // Unique list of active/inactive numbers that have messages or exist in orders
  const numbersSidebar = useMemo(() => {
    return orders.map((o) => {
      const smsCount = o.parsedMeta?.sms?.length || 0;
      return {
        id: o.id,
        number: o.number,
        countryCode: o.parsedMeta?.countryCode || "US",
        smsCount,
      };
    });
  }, [orders]);

  const totalSmsCount = allMessages.length;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">All incoming SMS verification codes across your virtual lines.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1 font-semibold text-sm">
          {totalSmsCount} total SMS
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar: Virtual Numbers list */}
        <aside className="h-fit space-y-1.5 rounded-2xl border border-border bg-card p-3 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          <div className="mb-2 px-2.5 py-1 text-xs uppercase font-bold tracking-wider text-muted-foreground">
            Lines
          </div>

          <button
            onClick={() => setSelectedNumber("all")}
            className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-sm transition-colors ${
              selectedNumber === "all"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "hover:bg-muted/50 text-foreground"
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 shrink-0" />
              <span>All Active Lines</span>
            </div>
            <Badge variant={selectedNumber === "all" ? "outline" : "secondary"}>
              {totalSmsCount}
            </Badge>
          </button>

          {numbersSidebar.map((n) => {
            const isSelected = selectedNumber === n.number;
            return (
              <button
                key={n.id}
                onClick={() => setSelectedNumber(n.number)}
                className={`flex w-full items-center justify-between rounded-xl p-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "hover:bg-muted/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Flag code={n.countryCode} className="size-5 shrink-0" />
                  <span className="truncate font-mono">{n.number}</span>
                </div>
                <Badge variant={isSelected ? "outline" : "secondary"} className="shrink-0">
                  {n.smsCount}
                </Badge>
              </button>
            );
          })}

          {numbersSidebar.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No virtual lines registered yet.</p>
          )}
        </aside>

        {/* Main Panel: Message lists */}
        <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm min-h-[400px]">
          <div className="relative border-b border-border p-3">
            <Search className="absolute left-6 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sender, code, body text or number..."
              className="pl-9 text-sm"
            />
          </div>

          <div className="divide-y divide-border/60 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {filteredMessages.map((m) => (
              <div key={m.id} className="flex items-start gap-4 p-4 hover:bg-muted/10 transition-colors">
                <ServiceLogo name={m.sender} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <p className="font-semibold text-sm capitalize">{m.sender}</p>
                    <span className="text-xs text-muted-foreground font-medium">
                      {new Date(m.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Metadata of number line */}
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Flag code={m.countryCode} className="size-3.5" />
                    <span>Line: <span className="font-mono text-foreground/80">{m.toNumber}</span> ({m.country})</span>
                  </div>

                  <p className="mt-2 text-sm text-foreground/90 bg-muted/30 px-3 py-2 rounded-lg leading-relaxed border border-border/20">
                    {highlightOtp(m.body, m.otp)}
                  </p>

                  {m.otp && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="rounded-lg bg-primary/10 px-2.5 py-1.5 font-mono text-sm font-bold tracking-wider text-primary">
                        {m.otp}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => {
                          void navigator.clipboard?.writeText(m.otp!);
                          toast.success("OTP code copied");
                        }}
                      >
                        <Copy className="mr-1 size-3" /> Copy OTP
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <AlertCircle className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No messages found</p>
                <p className="text-xs mt-1 max-w-xs px-4">
                  {selectedNumber === "all"
                    ? "We haven't received any messages yet. Try requesting an OTP from your service provider."
                    : "No messages found for this specific line."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
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