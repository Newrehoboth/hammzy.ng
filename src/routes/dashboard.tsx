import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Phone,
  MessageSquare,
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  History,
  Database,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";
import { useAuth } from "@/lib/auth-context";
import { listMyOrders, getFivesimProfile, type OrderWithMeta } from "@/lib/orders.functions";
import { ServiceLogo } from "@/components/service-logo";
import { PocketFiDeposit } from "@/components/pocketfi-deposit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Hammzy Digitals" }] }),
  loader: async () => {
    try {
      const [orders, profile] = await Promise.all([
        listMyOrders(),
        getFivesimProfile().catch(() => ({ balance: 0, email: "", id: 0, rating: 0 })),
      ]);
      return { orders, profile };
    } catch (err) {
      console.error("Dashboard loader failed:", err);
      return { orders: [], profile: null };
    }
  },
  component: Dashboard,
});

const activityIcon: Record<string, any> = {
  purchase: ShoppingCart,
  sms: MessageSquare,
  payment: CheckCircle2,
};

function Dashboard() {
  const { orders, profile: fivesimProfile } = Route.useLoaderData() as {
    orders: OrderWithMeta[];
    profile: Awaited<ReturnType<typeof getFivesimProfile>> | null;
  };
  const { profile: userProfile } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);

  const name =
    userProfile?.full_name ||
    userProfile?.username ||
    fivesimProfile?.email?.split("@")[0] ||
    "there";

  // Calculate dynamic stats
  const activeCount = orders.filter(
    (o) => o.status === "pending" || o.status === "received"
  ).length;

  const smsCount = orders.reduce((sum, o) => sum + (o.parsedMeta?.sms?.length || 0), 0);

  // Total spend on active/completed orders (excluding cancelled/refunded ones)
  const totalSpend = orders
    .filter((o) => {
      const status = (o.status || "").toLowerCase();
      return !["canceled", "cancelled", "banned", "timeout"].includes(status);
    })
    .reduce((sum, o) => sum + Number(o.price), 0);

  const stats = [
    {
      label: "Active Numbers",
      value: String(activeCount),
      icon: Phone,
      delta: `Total: ${orders.length}`,
      tone: "text-primary bg-primary/10",
      showAddFunds: false,
    },
    {
      label: "SMS Received",
      value: String(smsCount),
      icon: MessageSquare,
      delta: "Real-time",
      tone: "text-emerald bg-emerald/10",
      showAddFunds: false,
    },
    {
      label: "Total Spending",
      value: `₦${totalSpend.toLocaleString()}`,
      icon: CreditCardIconHelper,
      delta: "All-time",
      tone: "text-accent bg-accent/10",
      showAddFunds: false,
    },
    {
      label: "Main Wallet",
      value: `₦${Number(userProfile?.wallet_balance ?? 0).toLocaleString()}`,
      icon: Wallet,
      delta: "PocketFi",
      tone: "text-indigo-500 bg-indigo-500/10",
      showAddFunds: true,
    },
  ];

  function CreditCardIconHelper(props: any) {
    return <Wallet className={props.className} />;
  }

  // Calculate dynamic charts
  const chartData = (() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts: Record<string, { purchases: number; spend: number }> = {};

    // Initialize last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = months[d.getMonth()];
      counts[mLabel] = { purchases: 0, spend: 0 };
    }

    orders.forEach((o) => {
      const s = (o.status || "").toLowerCase();
      if (["canceled", "cancelled", "banned", "timeout"].includes(s)) return;
      const date = new Date(o.created_at);
      const mLabel = months[date.getMonth()];
      if (counts[mLabel] !== undefined) {
        counts[mLabel].purchases += 1;
        counts[mLabel].spend += Number(o.price);
      }
    });

    return Object.entries(counts).map(([month, data]) => ({
      month,
      purchases: data.purchases,
      spend: Number(data.spend.toFixed(2)),
    }));
  })();

  // Calculate dynamic activities
  const recentActivities = (() => {
    const list: Array<{ id: string; type: string; text: string; time: string; timestamp: number }> = [];

    orders.forEach((o) => {
      const serviceName = o.service ? o.service.charAt(0).toUpperCase() + o.service.slice(1) : "Service";
      list.push({
        id: `buy-${o.id}`,
        type: "purchase",
        text: `Purchased ${o.number} for ${serviceName}`,
        time: new Date(o.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: new Date(o.created_at).getTime(),
      });

      if (o.parsedMeta?.sms) {
        o.parsedMeta.sms.forEach((s: any, idx: number) => {
          list.push({
            id: `sms-${o.id}-${idx}`,
            type: "sms",
            text: `Received code "${s.code}" from ${s.sender || serviceName} on ${o.number}`,
            time: new Date(s.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            timestamp: new Date(s.date).getTime(),
          });
        });
      }
    });

    return list.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  })();

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "finished") return <Badge variant="secondary">Finished</Badge>;
    if (s === "pending" || s === "received") return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
    return <Badge variant="outline" className="capitalize text-muted-foreground">{s}</Badge>;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{getGreeting()}, {name} 👋</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Here's what's happening with your virtual lines today.</p>
        </div>
      </div>

      {/* Big CTA Buttons - Buy Numbers and Buy Logs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Buy Numbers Button */}
        <Link 
          to="/numbers"
          className="group relative overflow-hidden rounded-2xl gradient-primary p-4 text-left transition-all hover:scale-[1.02] hover:shadow-xl"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-white/20 backdrop-blur">
                <Phone className="size-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">GET STARTED</p>
                <h3 className="mt-0.5 text-xl font-bold text-white">Buy Numbers</h3>
                <p className="text-xs text-white/90">US numbers for OTP & verification</p>
              </div>
            </div>
            <ArrowUpRight className="size-5 text-white transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </Link>

        {/* Buy Logs Button */}
        <Link 
          to="/logs"
          className="group relative overflow-hidden rounded-2xl bg-card border border-border p-4 text-left transition-all hover:scale-[1.02] hover:shadow-xl hover:border-primary/40"
        >
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-xl bg-primary/10">
                <Database className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">BROWSE & BUY</p>
                <h3 className="mt-0.5 text-xl font-bold text-foreground">Buy Logs</h3>
                <p className="text-xs text-muted-foreground">Pre-made social media accounts</p>
              </div>
            </div>
            <ArrowUpRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-primary" />
          </div>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className={`grid size-10 place-items-center rounded-xl ${s.tone}`}>
                <s.icon className="size-5" />
              </div>
              {s.showAddFunds ? (
                <Button
                  size="sm"
                  variant="hero"
                  className="h-7 px-3 text-xs font-semibold"
                  onClick={() => setShowDeposit(true)}
                >
                  Add Funds
                </Button>
              ) : (
                <Badge variant="secondary">{s.delta}</Badge>
              )}
            </div>
            <p className="mt-4 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Dialog open={showDeposit} onOpenChange={setShowDeposit}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Fund Wallet via Bank Transfer</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <PocketFiDeposit />
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Monthly purchases</h2>
            <Badge variant="outline">Dynamic view</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="purchases" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Spending (NGN)</h2>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area type="monotone" dataKey="spend" stroke="var(--primary)" strokeWidth={2} fill="url(#spend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent Purchases — compact 4-row preview */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base">Recent Purchases</h2>
              {/* <p className="text-xs text-muted-foreground mt-0.5">Your last 4 activations. <Link to="/orders" className="text-primary hover:underline font-medium">View all history →</Link></p> */}
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
              <Link to="/orders">
                <History className="size-3.5" />
                Full History
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            {orders.slice(0, 4).map((n) => {
              const serviceName = n.service ? n.service.charAt(0).toUpperCase() + n.service.slice(1) : "Service";
              return (
                <Link
                  key={n.id}
                  to="/numbers/$id"
                  params={{ id: n.id }}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-all hover:bg-muted/40 hover:border-primary/20 bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ServiceLogo name={n.service ?? undefined} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{n.number}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{serviceName}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Flag code={n.parsedMeta?.countryCode || "US"} className="size-3.5" />
                          <span>{n.country}</span>
                        </div>
                        <span>·</span>
                        <span>{new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="font-mono font-bold text-xs">
                      ₦{Number(n.price).toFixed(2)}
                    </Badge>
                    {getStatusBadge(n.status)}
                  </div>
                </Link>
              );
            })}

            {orders.length === 0 && (
              <div className="py-10 text-center border border-dashed border-border rounded-xl">
                <p className="text-sm text-muted-foreground">No purchases yet.</p>
                <Button asChild variant="hero" size="sm" className="mt-3">
                  <Link to="/numbers">Buy your first number</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity panel */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold">
            <History className="size-4 text-muted-foreground" />
            <h2>Recent activity</h2>
          </div>
          <ol className="space-y-4">
            {recentActivities.map((a) => {
              const Icon = activityIcon[a.type] ?? Activity;
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </li>
              );
            })}
            {recentActivities.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">No recent activity to show.</p>
            )}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}