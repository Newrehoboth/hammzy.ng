import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  Users,
  DollarSign,
  Package,
  Calendar,
  Box,
  Copy,
  CheckCircle2,
  Layers,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceLogo } from "@/components/service-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LOG_PLATFORMS } from "@/lib/log-platforms";
import { useAuth } from "@/lib/auth-context";
import { PocketFiDeposit } from "@/components/pocketfi-deposit";
import {
  listLogProducts,
  getWalletBalance,
  purchaseLog,
  listMyLogs,
  getProductPreviews,
  type LogProductPublic,
} from "@/lib/logs.functions";

export const Route = createFileRoute("/logs")({
  head: () => ({ 
    meta: [
      { title: "Buy Social Media Logs & Accounts — Hammzy Digitals Nigeria" },
      { name: "description", content: "Buy premium social media logs for Instagram, Facebook, Telegram, WhatsApp and more in Nigeria. High-quality, verified accounts with instant delivery. Secure and affordable." },
      { name: "keywords", content: "buy Instagram logs Nigeria, buy Facebook accounts, social media logs, buy Telegram accounts, WhatsApp logs, verified social media accounts Nigeria, cheap Instagram logs, buy social accounts online" },
      { property: "og:title", content: "Buy Premium Social Media Logs & Accounts in Nigeria" },
      { property: "og:description", content: "Get instant access to verified Instagram, Facebook, Telegram accounts. Secure, affordable, and trusted by thousands." },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const { profile: userProfile } = useAuth();
  const fetchProducts = useServerFn(listLogProducts);
  const fetchBalance = useServerFn(getWalletBalance);
  const buyFn = useServerFn(purchaseLog);
  const fetchMyLogs = useServerFn(listMyLogs);
  const fetchPreviews = useServerFn(getProductPreviews);
  const qc = useQueryClient();

  const products = useQuery({ queryKey: ["log-products"], queryFn: () => fetchProducts() });
  const balance = useQuery({ queryKey: ["wallet-balance"], queryFn: () => fetchBalance() });
  const myLogs = useQuery({ queryKey: ["my-logs"], queryFn: () => fetchMyLogs() });

  const [platform, setPlatform] = useState<string>("All");
  const [subcategory, setSubcategory] = useState<string>("All");
  const [selected, setSelected] = useState<LogProductPublic | null>(null);
  const [buying, setBuying] = useState(false);
  const [purchased, setPurchased] = useState<{ credential: string; type: string } | null>(null);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [additionalPreviews, setAdditionalPreviews] = useState<any[]>([]);

  const [showDeposit, setShowDeposit] = useState(false);
  const [copiedCred, setCopiedCred] = useState(false);

  const all = products.data ?? [];

  // platforms actually present
  const presentPlatforms = useMemo(() => {
    const set = new Set(all.map((p) => p.platform));
    return ["All", ...LOG_PLATFORMS.filter((p) => set.has(p)), ...Array.from(set).filter((p) => !LOG_PLATFORMS.includes(p as any))];
  }, [all]);

  const platformFiltered = useMemo(
    () => (platform === "All" ? all : all.filter((p) => p.platform === platform)),
    [all, platform]
  );

  const subcategories = useMemo(() => {
    const set = new Set<string>();
    platformFiltered.forEach((p) => {
      if (p.subcategory) set.add(p.subcategory);
    });
    return ["All", ...Array.from(set)];
  }, [platformFiltered]);

  const visible = useMemo(
    () => (subcategory === "All" ? platformFiltered : platformFiltered.filter((p) => p.subcategory === subcategory)),
    [platformFiltered, subcategory]
  );

  // group by subcategory (or platform when no subcategory)
  const groups = useMemo(() => {
    const map = new Map<string, LogProductPublic[]>();
    visible.forEach((p) => {
      const key = p.subcategory || `${p.platform} Accounts`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [visible]);

  const onSelectPlatform = (p: string) => {
    setPlatform(p);
    setSubcategory("All");
  };

  const openProduct = async (p: LogProductPublic) => {
    setSelected(p);
    setPurchased(null);
    setAdditionalPreviews([]);
    
    // If it's a RakibSocials product, try to fetch additional previews
    if (p.id.startsWith('rakib_')) {
      setLoadingPreviews(true);
      try {
        const result = await fetchPreviews({ data: { productId: p.id } });
        if (result?.previews && result.previews.length > 0) {
          setAdditionalPreviews(result.previews);
        }
      } catch (err) {
        console.error('Failed to load previews:', err);
      } finally {
        setLoadingPreviews(false);
      }
    }
  };

  const handlePurchase = async () => {
    if (!selected) return;
    const userBalance = Number(balance.data ?? 0);
    if (userBalance < selected.price) {
      toast.error(`Insufficient balance. This log costs ₦${selected.price.toFixed(2)}, but your wallet balance is ₦${userBalance.toFixed(2)}. Please add funds.`);
      return;
    }
    setBuying(true);
    try {
      const result = await buyFn({ data: { productId: selected.id, price: selected.price } });
      toast.success("Purchase successful!");
      qc.invalidateQueries({ queryKey: ["log-products"] });
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
      qc.invalidateQueries({ queryKey: ["my-logs"] });

      // Save purchased log to localStorage so it always shows in Order History
      if (result?.credential) {
        try {
          const existing = JSON.parse(localStorage.getItem("vc_purchased_logs") || "[]");
          const newEntry = {
            id: `local_${Date.now()}`,
            platform: result.platform || selected.platform || "Social Media",
            type: result.type || selected.type || selected.name || "Log",
            credential: result.credential,
            price: result.price ?? selected.price ?? 0,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("vc_purchased_logs", JSON.stringify([newEntry, ...existing]));
          qc.invalidateQueries({ queryKey: ["my-logs-local"] });
        } catch (_) {}
        setPurchased({ credential: result.credential, type: result.type || selected.type });
      } else {
        window.location.href = "/orders";
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight">Buy Logs</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Premium accounts &amp; logs across every platform.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 shadow-sm">
          <Wallet className="size-4 text-primary" />
          <span className="text-sm text-muted-foreground">Balance:</span>
          <span className="font-bold">₦{(balance.data ?? 0).toFixed(2)}</span>
          <Button
            size="sm"
            variant="hero"
            className="ml-2 h-7 px-2.5 text-xs font-semibold"
            onClick={() => setShowDeposit(true)}
          >
            Add Funds
          </Button>
        </div>
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

      {/* Shop by categories */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Shop by Categories</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {presentPlatforms.map((p) => {
            const active = platform === p;
            return (
              <button
                key={p}
                onClick={() => onSelectPlatform(p)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow"
                    : "border-border bg-background hover:border-primary/40 hover:bg-muted/50"
                )}
              >
                {p !== "All" && <ServiceLogo name={p} size="sm" className="size-5" />}
                <span className="truncate">{p}</span>
              </button>
            );
          })}
        </div>

        {/* Subcategory chips */}
        {subcategories.length > 1 && (
          <div className="mt-4 flex gap-2 border-t border-border pt-4 overflow-x-auto pb-1 scrollbar-none flex-nowrap">
            {subcategories.map((s) => (
              <button
                key={s}
                onClick={() => setSubcategory(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0",
                  subcategory === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listing */}
      <div className="mt-6 space-y-8">
        {products.isLoading && (
          <div className="grid place-items-center py-20">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}

        {!products.isLoading && groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <Layers className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No logs available here yet. Check back soon.</p>
          </div>
        )}

        {groups.map(([group, items]) => (
          <div key={group}>
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-base font-bold">{group}</h3>
              <Badge variant="secondary">{items.length} item(s)</Badge>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => openProduct(p)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow cursor-pointer"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {p.image ? (
                      <img 
                        src={p.image} 
                        alt={p.type}
                        className="size-10 rounded-lg object-cover bg-white ring-1 ring-border shadow-sm"
                      />
                    ) : (
                      <ServiceLogo name={p.platform} size="md" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.type}</p>
                      <p className="text-xs text-muted-foreground">{p.platform}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium",
                        p.stock > 0
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {p.stock}pcs
                    </Badge>
                    <span className="font-bold">₦{p.price.toFixed(2)}</span>
                    <span className="hidden sm:inline-flex text-xs text-primary font-medium px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                      View
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail / purchase modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selected.image ? (
                    <img 
                      src={selected.image} 
                      alt={selected.type}
                      className="size-10 rounded-lg object-cover bg-white ring-1 ring-border shadow-sm"
                    />
                  ) : (
                    <ServiceLogo name={selected.platform} size="md" />
                  )}
                  <div>
                    <p className="text-base font-bold">{selected.platform} Account</p>
                    <p className="text-xs font-normal text-muted-foreground">Account Details</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Balance banner */}
              <div className="flex items-center justify-between rounded-xl gradient-primary px-4 py-3 text-primary-foreground">
                <span className="flex items-center gap-2 text-sm">
                  <Wallet className="size-4" /> Your Balance:
                </span>
                <span className="text-lg font-bold">₦{(balance.data ?? 0).toFixed(2)}</span>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={Users} label="Followers" value={selected.followers || "0"} tone="text-blue-500" />
                <InfoCard icon={Wallet} label="Price per log" value={`₦${selected.price.toFixed(2)}`} tone="text-emerald-500" />
                <InfoCard icon={Package} label="Available Stock" value={`${selected.stock} pcs`} tone="text-violet-500" />
                <InfoCard
                  icon={Box}
                  label="Status"
                  value={selected.stock > 0 ? "In Stock" : "Sold Out"}
                  tone={selected.stock > 0 ? "text-emerald-500" : "text-destructive"}
                />
              </div>

              {/* Account information */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Calendar className="size-4 text-primary" /> Account Information
                </p>
                {selected.account_name && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Account: </span>
                    {selected.account_name}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selected.description || "No additional description provided."}
                </p>
              </div>

              {/* Preview Links */}
              {(selected.preview_links && selected.preview_links.length > 0) || additionalPreviews.length > 0 ? (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <LinkIcon className="size-4 text-primary" />
                    Sample Previews
                    <Badge variant="secondary" className="text-xs">
                      {(selected.preview_links?.length || 0) + additionalPreviews.length}
                    </Badge>
                  </p>
                  
                  {loadingPreviews && (
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center">
                      <div className="mx-auto size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                      <p className="mt-2 text-xs text-muted-foreground">Loading previews...</p>
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* Show static preview links from product */}
                    {selected.preview_links?.map((rawItem, i) => {
                      const { url, label } = parsePreviewItem(rawItem);
                      return (
                        <div
                          key={`static-${i}`}
                          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5 transition-all hover:border-primary/40 hover:bg-muted/50"
                        >
                          <input 
                            type="checkbox" 
                            className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            readOnly
                            checked={false}
                          />
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 min-w-0 group"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground group-hover:text-foreground">
                                {label}
                              </span>
                              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                            </a>
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                              {label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Show dynamically loaded previews */}
                    {additionalPreviews.map((rawItem, i) => {
                      const { url, label } = parsePreviewItem(rawItem);
                      return (
                        <div
                          key={`dynamic-${i}`}
                          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5 transition-all hover:border-primary/40 hover:bg-muted/50"
                        >
                          <input 
                            type="checkbox" 
                            className="size-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            readOnly
                            checked={false}
                          />
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 flex-1 min-w-0 group"
                            >
                              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground group-hover:text-foreground">
                                {label}
                              </span>
                              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                            </a>
                          ) : (
                            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                              {label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Purchased credential reveal */}
              {purchased && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="size-4" /> Purchase Successful — Your Credential
                  </p>
                  <div className="rounded-lg bg-background border border-border p-3 font-mono text-xs break-all select-all">
                    {purchased.credential}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(purchased.credential);
                      setCopiedCred(true);
                      setTimeout(() => setCopiedCred(false), 2000);
                    }}
                  >
                    {copiedCred ? <><CheckCircle2 className="size-3.5 mr-1" /> Copied!</> : <><Copy className="size-3.5 mr-1" /> Copy Credential</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="hero"
                    className="w-full"
                    onClick={() => { window.location.href = "/orders"; }}
                  >
                    View My Orders
                  </Button>
                </div>
              )}

              {!purchased && (
              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button
                  variant="hero"
                  className="flex-1"
                  disabled={selected.stock <= 0 || buying}
                  onClick={handlePurchase}
                >
                  {selected.stock <= 0 ? "Sold Out" : buying ? "Processing…" : "Proceed to Purchase"}
                </Button>
              </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", tone)}>
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function parsePreviewItem(item: any): { url: string; label: string } {
  if (typeof item === "string") {
    return {
      url: item.startsWith("http://") || item.startsWith("https://") ? item : `https://${item}`,
      label: item,
    };
  }
  if (item && typeof item === "object") {
    const rawUrl = item.link || item.url || item.href || "";
    const url = rawUrl
      ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`)
      : "";
    const label = item.details || item.name || item.title || item.description || rawUrl || JSON.stringify(item);
    return { url, label: String(label) };
  }
  return { url: "", label: String(item ?? "") };
}