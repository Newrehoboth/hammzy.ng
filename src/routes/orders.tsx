import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Copy,
  Check,
  History,
  ArrowUpRight,
  ShoppingCart,
  Filter,
  X,
  Database,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flag } from "@/components/flag";
import { ServiceLogo } from "@/components/service-logo";
import { listMyOrders, type OrderWithMeta } from "@/lib/orders.functions";
import { listMyLogs } from "@/lib/logs.functions";

/** Safely format a date string/value — returns a fallback instead of throwing "Invalid time value" */
function safeFormatDate(value: string | number | null | undefined, fallback = "Unknown date"): string {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return fallback;
  }
}

function safeISODate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}


export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Order History — Hammzy Digitals" }] }),
  loader: async () => {
    try {
      const [orders, logs] = await Promise.all([
        listMyOrders(),
        listMyLogs().catch(() => []),
      ]);
      return { orders, logs };
    } catch (err) {
      console.error("Order history loader failed:", err);
      return { orders: [], logs: [] };
    }
  },
  component: OrderHistory,
});

function getStatusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "finished")
    return <Badge variant="secondary">Finished</Badge>;
  if (s === "pending" || s === "received")
    return (
      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
        Active
      </Badge>
    );
  if (s === "cancelled" || s === "canceled")
    return (
      <Badge variant="outline" className="text-destructive border-destructive/40">
        Cancelled
      </Badge>
    );
  if (s === "banned")
    return (
      <Badge variant="destructive">Banned</Badge>
    );
  return (
    <Badge variant="outline" className="capitalize text-muted-foreground">
      {s}
    </Badge>
  );
}

function OrderHistory() {
  const { orders, logs: initialLogs } = Route.useLoaderData() as { orders: OrderWithMeta[]; logs: any[] };

  const fetchLogs = useServerFn(listMyLogs);
  const myLogsQuery = useQuery({
    queryKey: ["my-logs"],
    queryFn: () => fetchLogs(),
    initialData: initialLogs,
  });

  // Also read from localStorage (always works, no service role needed)
  const localLogsQuery = useQuery({
    queryKey: ["my-logs-local"],
    queryFn: () => {
      try {
        return JSON.parse(localStorage.getItem("vc_purchased_logs") || "[]") as any[];
      } catch { return []; }
    },
    initialData: [],
  });

  // Merge: localStorage first, then DB — deduplicate by id
  const logs = useMemo(() => {
    const dbLogs: any[] = myLogsQuery.data ?? initialLogs ?? [];
    const localLogs: any[] = localLogsQuery.data ?? [];
    const dbIds = new Set(dbLogs.map((l) => l.id));
    const uniqueLocal = localLogs.filter((l) => !dbIds.has(l.id));
    return [...uniqueLocal, ...dbLogs];
  }, [myLogsQuery.data, localLogsQuery.data, initialLogs]);

  const [activeSection, setActiveSection] = useState<"numbers" | "logs">("numbers");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "finished" | "cancelled">("all");
  const [searchNumber, setSearchNumber] = useState("");
  const [searchService, setSearchService] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Logs search
  const [logsSearch, setLogsSearch] = useState("");

  const hasFilters = searchNumber || searchService || searchDate || filterTab !== "all";

  const clearFilters = () => {
    setSearchNumber("");
    setSearchService("");
    setSearchDate("");
    setFilterTab("all");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const s = o.status.toLowerCase();
      // Tab filter
      if (filterTab === "active" && s !== "pending" && s !== "received") return false;
      if (filterTab === "finished" && s !== "finished") return false;
      if (filterTab === "cancelled" && s !== "cancelled" && s !== "canceled" && s !== "banned") return false;
      // Number search
      if (searchNumber.trim() && !o.number.includes(searchNumber.trim())) return false;
      // Service search
      if (searchService.trim() && !(o.service ?? "").toLowerCase().includes(searchService.trim().toLowerCase())) return false;
      // Date filter
      if (searchDate) {
        const orderDate = safeISODate(o.created_at);
        if (orderDate !== searchDate) return false;
      }
      return true;
    });
  }, [orders, filterTab, searchNumber, searchService, searchDate]);

  const filteredLogs = useMemo(() => {
    const q = logsSearch.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      return (
        l.platform.toLowerCase().includes(q) ||
        (l.type ?? "").toLowerCase().includes(q) ||
        l.credential.toLowerCase().includes(q)
      );
    });
  }, [logs, logsSearch]);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Summary stats
  const activeCount = orders.filter((o) => o.status === "pending" || o.status === "received").length;
  const finishedCount = orders.filter((o) => o.status === "finished").length;
  
  const totalSpendNumbers = orders.reduce((s, o) => s + Number(o.price), 0);
  const totalSpendLogs = logs.reduce((s, o) => s + Number(o.price), 0);
  const totalSpend = totalSpendNumbers + totalSpendLogs;

  const tabs: { key: typeof filterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: orders.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "finished", label: "Finished", count: finishedCount },
    {
      key: "cancelled",
      label: "Cancelled",
      count: orders.filter((o) => {
        const s = o.status.toLowerCase();
        return s === "cancelled" || s === "canceled" || s === "banned";
      }).length,
    },
  ];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="size-6 text-primary" />
            Order History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse and manage all your purchased virtual numbers and social media logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="hero" size="sm">
            <Link to="/numbers">
              <ShoppingCart className="size-4" />
              Get Number
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/logs">
              <Database className="size-4" />
              Get Logs
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary stats strip */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Number Orders", value: orders.length, color: "text-foreground" },
          { label: "Logs Purchased", value: logs.length, color: "text-foreground" },
          { label: "Active Numbers", value: activeCount, color: "text-emerald-500" },
          { label: "Total Spent", value: `₦${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "text-primary" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Section Switcher */}
      <div className="mb-5 flex border-b border-border">
        <button
          onClick={() => setActiveSection("numbers")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeSection === "numbers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="size-4" />
          Virtual Numbers ({orders.length})
        </button>
        <button
          onClick={() => setActiveSection("logs")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeSection === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database className="size-4" />
          Social Media Logs ({logs.length})
        </button>
      </div>

      {activeSection === "numbers" ? (
        /* ============ VIRTUAL NUMBERS HISTORY ============ */
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-4 py-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${
                  filterTab === t.key
                    ? "bg-background shadow-sm text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    filterTab === t.key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-destructive/10 transition-colors whitespace-nowrap"
              >
                <X className="size-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Search Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/20 border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                placeholder="Search by number..."
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                placeholder="Search by service..."
                className="pl-8 h-8 text-xs bg-card"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="pl-8 h-8 text-xs bg-card text-muted-foreground"
              />
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredOrders.length}</span> of{" "}
              <span className="font-semibold text-foreground">{orders.length}</span> orders
            </p>
          </div>

          {/* Order rows */}
          <div className="divide-y divide-border/50">
            {filteredOrders.map((n, i) => {
              const serviceName = n.service
                ? n.service.charAt(0).toUpperCase() + n.service.slice(1)
                : "Service";
              const isCopied = copiedId === n.id;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                >
                  <Link
                    to="/numbers/$id"
                    params={{ id: n.id }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ServiceLogo name={n.service ?? undefined} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-foreground font-mono">
                            {n.number}
                          </span>
                          <button
                            onClick={(e) => handleCopy(e, n.number, n.id)}
                            title="Copy number"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isCopied ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium text-foreground/80 capitalize">{serviceName}</span>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            <Flag code={n.parsedMeta?.countryCode || "US"} className="size-3.5" />
                            <span>{n.country}</span>
                          </div>
                          <span>·</span>
                          <span>
                            {safeFormatDate(n.created_at)}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-foreground/60 text-[10px]">#{n.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:min-w-[140px]">
                      <Badge variant="secondary" className="font-mono font-bold text-xs">
                        ₦{Number(n.price).toFixed(2)}
                      </Badge>
                      {getStatusBadge(n.status)}
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="py-20 text-center">
                <History className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No orders found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {orders.length === 0
                    ? "You haven't purchased any virtual numbers yet."
                    : "Try adjusting your search filters or switching tabs."}
                </p>
                {orders.length === 0 ? (
                  <Button asChild variant="hero" size="sm">
                    <Link to="/numbers">
                      <ShoppingCart className="size-4" /> Browse Numbers
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="size-4" /> Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ============ SOCIAL MEDIA LOGS HISTORY ============ */
        <div className="space-y-4">
          {/* Search Logs */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
              placeholder="Search logs by platform, type, or credentials..."
              className="pl-9 h-10 text-sm"
            />
            {logsSearch && (
              <button
                onClick={() => setLogsSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="grid gap-3">
            {filteredLogs.map((l: any, i: number) => {
              const isCopied = copiedId === l.id;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <ServiceLogo name={l.platform} size="md" className="mt-1 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate">{typeof l.type === 'object' ? JSON.stringify(l.type) : String(l.type ?? "Social Media Log")}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-foreground/80">{typeof l.platform === 'object' ? JSON.stringify(l.platform) : String(l.platform ?? "Social Media")}</span>
                          <span>·</span>
                          <span>
                            {safeFormatDate(l.created_at)}
                          </span>
                          <span>·</span>
                          <span className="font-mono text-foreground/60 text-[10px]">ID: #{l.id ? l.id.slice(0, 8) : ''}</span>
                        </p>

                        {/* Credentials box */}
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 max-w-xl">
                          <code className="text-xs font-mono select-all break-all text-foreground/90 leading-relaxed block max-h-20 overflow-y-auto w-full">
                            {typeof l.credential === 'object' ? JSON.stringify(l.credential, null, 2) : String(l.credential ?? "")}
                          </code>
                          <button
                            onClick={(e) => handleCopy(e, l.credential, l.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0 self-center size-8 rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
                            title="Copy credentials"
                          >
                            {isCopied ? (
                              <Check className="size-4 text-emerald-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Price */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:self-start">
                      <Badge variant="secondary" className="font-mono font-bold text-xs px-2.5 py-1">
                        ₦{Number(l.price).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="py-20 text-center rounded-2xl border border-dashed border-border bg-card">
                <Database className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No logs found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {logs.length === 0
                    ? "You haven't purchased any social media logs yet."
                    : "Try adjusting your search query."}
                </p>
                {logs.length === 0 && (
                  <Button asChild variant="hero" size="sm">
                    <Link to="/logs">
                      <Database className="size-4" /> Browse Log Marketplace
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
