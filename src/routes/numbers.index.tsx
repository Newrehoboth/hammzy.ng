import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  SlidersHorizontal,
  Search,
  ShoppingCart,
  Globe,
  Check,
  Loader2,
  AlertCircle,
  Zap,
  TrendingUp,
  Signal,
  Users,
  ChevronRight,
  ChevronDown,
  Star,
  Flag as FlagIcon,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flag } from "@/components/flag";
import { Badge } from "@/components/ui/badge";
import { ServiceLogo } from "@/components/service-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getFivesimCountries,
  getFivesimProducts,
  createOrder,
  getFivesimOperatorPrices,
  getFivesimCountryOperators,
  getGetatextServices,
  createGetatextOrder,
  type OperatorPriceNormalized,
} from "@/lib/orders.functions";
import { useAuth } from "@/lib/auth-context";
import type { FivesimCountry, FivesimProduct } from "@/lib/orders.functions";

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = "standard" | "alternative";

export const Route = createFileRoute("/numbers/")({
  head: () => ({ meta: [{ title: "Number Marketplace — Hammzy Digitals" }] }),
  loader: async () => {
    try {
      const countries = await getFivesimCountries();
      return { countries };
    } catch (err) {
      console.error("Failed to load countries:", err);
      return { countries: [] as FivesimCountry[] };
    }
  },
  component: Marketplace,
});

// Clean up raw 5SIM operator slugs to readable names
function formatOperatorName(slug: string): string {
  const knownNames: Record<string, string> = {
    virtual1: "Virtual1",
    virtual2: "Virtual2",
    virtual3: "Virtual3",
    virtual4: "Virtual4",
    virtual5: "Virtual5",
    virtual6: "Virtual6",
    virtual7: "Virtual7",
    virtual8: "Virtual8",
    virtual9: "Virtual9",
    virtual10: "Virtual10",
    virtual11: "Virtual11",
    virtual12: "Virtual12",
    virtual13: "Virtual13",
    virtual14: "Virtual14",
    virtual15: "Virtual15",
    virtual16: "Virtual16",
    virtual17: "Virtual17",
    virtual18: "Virtual18",
    virtual19: "Virtual19",
    virtual20: "Virtual20",
    virtual21: "Virtual21",
    virtual22: "Virtual22",
    virtual23: "Virtual23",
    virtual24: "Virtual24",
    virtual25: "Virtual25",
    virtual26: "Virtual26",
    virtual27: "Virtual27",
    virtual28: "Virtual28",
    virtual29: "Virtual29",
    virtual30: "Virtual30",
    virtual31: "Virtual31",
    virtual32: "Virtual32",
    virtual33: "Virtual33",
    virtual34: "Virtual34",
    virtual35: "Virtual35",
    virtual36: "Virtual36",
    virtual37: "Virtual37",
    virtual38: "Virtual38",
    virtual39: "Virtual39",
    virtual40: "Virtual40",
    virtual41: "Virtual41",
    virtual42: "Virtual42",
    virtual43: "Virtual43",
    virtual44: "Virtual44",
    virtual45: "Virtual45",
    virtual46: "Virtual46",
    virtual47: "Virtual47",
    virtual48: "Virtual48",
    virtual49: "Virtual49",
    virtual50: "Virtual50",
    virtual51: "Virtual51",
    virtual52: "Virtual52",
    virtual53: "Virtual53",
    virtual54: "Virtual54",
    virtual55: "Virtual55",
    virtual56: "Virtual56",
    virtual57: "Virtual57",
    virtual58: "Virtual58",
    virtual59: "Virtual59",
    virtual60: "Virtual60",
    virtual61: "Virtual61",
    virtual62: "Virtual62",
    virtual63: "Virtual63",
    any: "Any (Auto-Select)",
    three: "Three",
    ee: "EE",
    o2: "O2",
    vodafone: "Vodafone",
    tmobile: "T-Mobile",
    att: "AT&T",
    verizon: "Verizon",
    sprint: "Sprint",
    megafon: "MegaFon",
    beeline: "Beeline",
    mts: "MTS",
    tele2: "Tele2",
  };
  return (
    knownNames[slug.toLowerCase()] ||
    slug.charAt(0).toUpperCase() + slug.slice(1)
  );
}

function getSuccessRateColor(rate: number) {
  if (rate >= 30) return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  if (rate >= 15) return { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  if (rate > 0) return { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" };
  return { text: "text-muted-foreground", bg: "bg-muted/50", border: "border-border" };
}

// ─── Operator Selection Modal ─────────────────────────────────────────────────
interface OperatorModalProps {
  open: boolean;
  onClose: () => void;
  product: FivesimProduct | null;
  country: FivesimCountry | null;
  onSelectOperator: (operatorSlug: string, cost: number) => void;
  isBuying: boolean;
}

function OperatorModal({
  open,
  onClose,
  product,
  country,
  onSelectOperator,
  isBuying,
}: OperatorModalProps) {
  const [operators, setOperators] = useState<OperatorPriceNormalized[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !product || !country) return;
    setOperators([]);
    setLoading(true);
    setSelectedOp(null);

    getFivesimOperatorPrices({ data: { country: country.id, product: product.name } })
      .then((ops) => {
        // Sort: highest success rate first, then cheapest price
        const sorted = [...ops].sort((a, b) => {
          if (b.successRate !== a.successRate) return b.successRate - a.successRate;
          return a.cost - b.cost;
        });
        setOperators(sorted);
      })
      .catch(() => toast.error("Failed to load operator rates."))
      .finally(() => setLoading(false));
  }, [open, product, country]);

  if (!product || !country) return null;

  const bestRate = operators.length > 0 ? Math.max(...operators.map((o) => o.successRate)) : 0;
  const cheapestCost = operators.length > 0 ? Math.min(...operators.map((o) => o.cost)) : 0;
  const formattedName = product.name.charAt(0).toUpperCase() + product.name.slice(1);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <ServiceLogo name={product.name} size="sm" className="size-8" />
            <div>
              <p className="font-bold text-base">{formattedName}</p>
              <p className="text-xs text-muted-foreground font-normal">
                {country.name} · Choose your operator
              </p>
            </div>
          </DialogTitle>
          {!loading && operators.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Signal className="size-3 text-emerald-500" />
                Best rate: <span className="font-semibold text-emerald-500 ml-1">{bestRate.toFixed(1)}%</span>
              </span>
              <span className="flex items-center gap-1">
                From: <span className="font-semibold text-foreground ml-1">₦{cheapestCost.toFixed(2)}</span>
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : operators.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="size-6 mx-auto mb-2 text-muted-foreground/60" />
              No operators available for this service.
            </div>
          ) : (
            <AnimatePresence>
              {operators.map((op, idx) => {
                const colors = getSuccessRateColor(op.successRate);
                const isBest = op.successRate === bestRate && bestRate > 0;
                const isCheapest = op.cost === cheapestCost && operators.length > 1;
                const isSelected = selectedOp === op.name;

                return (
                  <motion.div
                    key={op.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center justify-between rounded-xl border p-3 mb-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedOp(op.name)}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{formatOperatorName(op.name)}</span>
                        {isBest && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 h-4">
                            <Star className="size-2.5 mr-0.5" /> Best
                          </Badge>
                        )}
                        {isCheapest && !isBest && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Cheapest</Badge>
                        )}
                      </div>
                      <div className={`flex items-center gap-3 text-[11px] ${colors.text}`}>
                        {/* Success rate */}
                        <span className="flex items-center gap-1">
                          <Signal className="size-3" />
                          {op.successRate > 0 ? `${op.successRate.toFixed(1)}% success` : "No rate data"}
                        </span>
                        {/* Stock */}
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {op.count.toLocaleString()} available
                        </span>
                      </div>
                    </div>

                    {/* Price + Buy */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className="font-mono font-bold text-sm text-foreground">
                        ₦{op.cost.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant={isSelected ? "hero" : "outline"}
                        className="h-7 px-3 text-xs"
                        disabled={isBuying}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOperator(op.name, op.cost);
                        }}
                      >
                        {isBuying && selectedOp === op.name ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : (
                          <ChevronRight className="size-3 mr-0.5" />
                        )}
                        Buy
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Rates shown are based on recent carrier SMS delivery statistics.
          </p>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs h-7">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Standard (GetAText) Services Panel ─────────────────────────────────────
interface GetatextService {
  name: string;
  apiName: string;
  qty: number;
  price: number;
  ttl: number;
}

interface StandardPanelProps {
  profile: any;
  onOrderCreated: (orderId: string) => void;
}

function StandardPanel({ profile, onOrderCreated }: StandardPanelProps) {
  // Services load from a static list instantly — no loading spinner needed
  const [services, setServices] = useState<GetatextService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [buyingService, setBuyingService] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // getGetatextServices returns the static list synchronously — resolves almost instantly
    getGetatextServices()
      .then((svcs) => { if (mounted) { setServices(svcs as GetatextService[]); setLoading(false); } })
      .catch(() => { if (mounted) { toast.error("Failed to load Standard services."); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  const FEATURED_SERVICES = ["whatsapp", "instagram", "tiktok", "telegram", "snapchat", "discord"];

  const filteredServices = useMemo(() => {
    const matched = services.filter((s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const featured = matched.filter((s) =>
      FEATURED_SERVICES.some((svc) => s.name.toLowerCase().includes(svc))
    );
    featured.sort((a, b) => {
      const ai = FEATURED_SERVICES.findIndex((svc) => a.name.toLowerCase().includes(svc));
      const bi = FEATURED_SERVICES.findIndex((svc) => b.name.toLowerCase().includes(svc));
      return ai - bi;
    });
    const rest = matched.filter((s) =>
      !FEATURED_SERVICES.some((svc) => s.name.toLowerCase().includes(svc))
    );
    return [...featured, ...rest];
  }, [services, searchQuery]);

  const handleBuy = useCallback(
    async (svc: GetatextService) => {
      const balance = Number(profile?.wallet_balance ?? 0);
      if (balance < svc.price) {
        toast.error(`Insufficient balance. This costs ₦${svc.price.toFixed(2)}, your balance is ₦${balance.toFixed(2)}.`);
        return;
      }

      setBuyingService(svc.apiName);
      const loadingToast = toast.loading(`Renting ${svc.name} number (USA)...`);
      try {
        const order = await createGetatextOrder({
          data: { service: svc.apiName, serviceName: svc.name },
        });
        toast.success("Number rented successfully!");
        onOrderCreated(order.id);
      } catch (err: any) {
        let msg = err?.message || "Failed to rent number. Please try again.";
        if (msg.includes("<!DOCTYPE") || msg.includes("<html") || msg.includes("<head") || msg.includes("Cloudflare") || msg.length > 120) {
          msg = "Standard server is temporarily undergoing maintenance. Please try again in a few moments.";
        }
        toast.error(msg);
      } finally {
        toast.dismiss(loadingToast);
        setBuyingService(null);
      }
    },
    [profile, onOrderCreated]
  );

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* USA badge + info */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2 shrink-0">
          <Flag code="US" className="size-5 rounded-sm" />
          <span className="font-semibold text-sm">United States Only</span>
        </div>
        <p className="text-xs text-muted-foreground">
          US-based real carrier lines — best quality for WhatsApp, Instagram, Telegram &amp; more.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="pl-9 text-sm h-10"
        />
      </div>

      {/* Services grid — instant render, no loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-3 h-[100px]">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-muted flex-shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="h-2.5 w-1/3 bg-muted rounded" />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <div className="h-4 w-10 bg-muted rounded" />
                <div className="h-7 w-14 bg-muted rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <AlertCircle className="mx-auto size-7 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No services found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {services.length === 0 ? "Could not load Standard services. Please refresh." : "No services matched your search."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredServices.map((svc, i) => {
            const isBuying = buyingService === svc.apiName;
            const formattedName = svc.name.charAt(0).toUpperCase() + svc.name.slice(1);
            return (
              <motion.div
                key={svc.apiName}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025, duration: 0.18 }}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-2.5 sm:p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ServiceLogo name={svc.name} size="sm" className="size-6 sm:size-7 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[11px] sm:text-xs truncate leading-tight">{formattedName}</h3>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium leading-none mt-0.5">
                        {svc.qty === 100 ? "Available" : `${svc.qty.toLocaleString()} in stock`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="w-fit font-mono font-bold text-[10px] px-1.5 py-0 h-4 sm:h-5">
                    ₦{svc.price.toFixed(0)}
                  </Badge>
                </div>

                <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-1 pt-2 sm:pt-2.5 border-t border-border/50">
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
                    <Globe className="size-3" />
                    <span>USA</span>
                  </span>
                  <Button
                    size="sm"
                    variant="hero"
                    className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs"
                    disabled={svc.qty === 0 || isBuying}
                    onClick={() => handleBuy(svc)}
                  >
                    {isBuying ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <ShoppingCart className="size-3 sm:mr-1" />
                    )}
                    <span className="hidden sm:inline">Buy</span>
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Marketplace Component ───────────────────────────────────────────────
function Marketplace() {
  const { profile: userProfile } = useAuth();
  const { countries } = Route.useLoaderData();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("standard");

  // Alternative (Tiger SMS) state
  const [selectedCountry, setSelectedCountry] = useState<FivesimCountry | null>(null);
  const [operator, setOperator] = useState("any");
  const [availableOperators, setAvailableOperators] = useState<string[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);

  const [countryQuery, setCountryQuery] = useState("");
  const [productQuery, setProductQuery] = useState("");

  const [products, setProducts] = useState<FivesimProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Operator modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FivesimProduct | null>(null);
  const [isBuyingOperator, setIsBuyingOperator] = useState(false);

  const [countryListOpen, setCountryListOpen] = useState(true);

  // Featured countries pinned to the top (matched by ISO code)
  const FEATURED_COUNTRY_ISOS = ["GB", "US", "CA"];

  const filteredCountries = useMemo(() => {
    const matched = countries.filter(
      (c: FivesimCountry) =>
        c.name.toLowerCase().includes(countryQuery.toLowerCase()) ||
        c.iso.toLowerCase().includes(countryQuery.toLowerCase())
    );
    const featured = matched.filter((c: FivesimCountry) => FEATURED_COUNTRY_ISOS.includes(c.iso.toUpperCase()));
    // Sort featured: GB first, then US, then CA
    const featuredOrder = ["GB", "US", "CA"];
    featured.sort((a: FivesimCountry, b: FivesimCountry) => featuredOrder.indexOf(a.iso.toUpperCase()) - featuredOrder.indexOf(b.iso.toUpperCase()));
    const rest = matched.filter((c: FivesimCountry) => !FEATURED_COUNTRY_ISOS.includes(c.iso.toUpperCase()));
    return { featured, rest };
  }, [countries, countryQuery]);

  // When country changes: load products AND fetch available operators for the dropdown
  useEffect(() => {
    if (!selectedCountry) {
      setProducts([]);
      setAvailableOperators([]);
      return;
    }

    setOperator("any");

    // Load products
    let isMounted = true;
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const prodList = await getFivesimProducts({ data: { country: selectedCountry.id, operator: "any" } });
        if (isMounted) setProducts(prodList.sort((a, b) => b.qty - a.qty));
      } catch {
        if (isMounted) toast.error("Failed to load available services for this country.");
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    // Load operators for dropdown
    const loadOperators = async () => {
      setLoadingOperators(true);
      try {
        const ops = await getFivesimCountryOperators({ data: { country: selectedCountry.id } });
        if (isMounted) setAvailableOperators(ops);
      } catch {
        // non-critical, silently ignore
      } finally {
        if (isMounted) setLoadingOperators(false);
      }
    };

    void loadProducts();
    void loadOperators();

    return () => { isMounted = false; };
  }, [selectedCountry]);

  // On mobile, collapse the country list when a country is picked
  const handleSelectCountry = (c: FivesimCountry) => {
    setSelectedCountry(c);
    // Only auto-collapse on mobile (screens narrower than lg breakpoint = 1024px)
    if (window.innerWidth < 1024) {
      setCountryListOpen(false);
    }
  };

  // Reload products when operator filter changes (not on initial country selection)
  useEffect(() => {
    if (!selectedCountry || operator === "any") return;

    let isMounted = true;
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const prodList = await getFivesimProducts({ data: { country: selectedCountry.id, operator } });
        if (isMounted) setProducts(prodList.sort((a, b) => b.qty - a.qty));
      } catch {
        if (isMounted) toast.error("Failed to filter by operator.");
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };
    void loadProducts();
    return () => { isMounted = false; };
  }, [operator]);

  // Featured services always shown first
  const FEATURED_SERVICES = ["whatsapp", "instagram", "tiktok", "telegram", "snapchat"];

  const filteredProducts = useMemo(() => {
    const matched = products.filter((p) => p.name.toLowerCase().includes(productQuery.toLowerCase()));
    
    const featured = matched.filter((p) => 
      FEATURED_SERVICES.some((svc) => p.name.toLowerCase().includes(svc))
    );
    featured.sort((a, b) => {
      const aIdx = FEATURED_SERVICES.findIndex((svc) => a.name.toLowerCase().includes(svc));
      const bIdx = FEATURED_SERVICES.findIndex((svc) => b.name.toLowerCase().includes(svc));
      return aIdx - bIdx;
    });
    
    const rest = matched.filter((p) => 
      !FEATURED_SERVICES.some((svc) => p.name.toLowerCase().includes(svc))
    );
    
    return [...featured, ...rest];
  }, [products, productQuery]);

  // Opens operator modal before buying (Alternative tab)
  const handleOpenOperatorModal = async (product: FivesimProduct) => {
    if (!selectedCountry) return;
    
    // Pre-check if operators are available before opening modal
    const loadingToast = toast.loading(`Checking availability for ${product.name}...`);
    try {
      const operators = await getFivesimOperatorPrices({ 
        data: { country: selectedCountry.id, product: product.name } 
      });
      
      toast.dismiss(loadingToast);
      
      if (operators.length === 0 || operators[0].count === 0) {
        toast.error(`${product.name} is currently out of stock. Please try another service or check back later.`);
        return;
      }
      
      setSelectedProduct(product);
      setModalOpen(true);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to check availability. Please try again.");
    }
  };

  // Called when user picks an operator inside modal
  const handleOperatorSelected = useCallback(
    async (operatorSlug: string, cost: number) => {
      if (!selectedCountry || !selectedProduct) return;
      
      const balance = Number(userProfile?.wallet_balance ?? 0);
      if (balance < cost) {
        toast.error(`Insufficient wallet balance. This activation costs ₦${cost.toFixed(2)}, but your wallet balance is only ₦${balance.toFixed(2)}. Please add funds.`);
        return;
      }

      setIsBuyingOperator(true);
      const loadingToast = toast.loading(`Connecting to ${formatOperatorName(operatorSlug)} for ${selectedProduct.name}...`);
      try {
        const order = await createOrder({
          data: {
            countrySlug: selectedCountry.id,
            countryName: selectedCountry.name,
            countryCode: selectedCountry.iso,
            service: selectedProduct.name,
            operator: operatorSlug,
          },
        });
        setModalOpen(false);
        toast.success("Number purchased successfully!");
        void navigate({ to: `/numbers/$id`, params: { id: order.id } });
      } catch (err: any) {
        let msg = err?.message || "Failed to purchase virtual number.";
        if (msg.includes("<!DOCTYPE") || msg.includes("<html") || msg.includes("<head") || msg.includes("Cloudflare") || msg.length > 120) {
          msg = "Alternative server is currently undergoing maintenance. Please switch to the Standard tab to purchase your number immediately.";
        }
        toast.error(msg);
      } finally {
        toast.dismiss(loadingToast);
        setIsBuyingOperator(false);
      }
    },
    [selectedCountry, selectedProduct, navigate, userProfile]
  );

  return (
    <AppShell>
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Number Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Buy a temporary virtual number for app verification.</p>
      </div>

      {/* ─── Provider Tabs — full width on mobile ─── */}
      <div className="flex items-center gap-1 mb-4 sm:mb-6 p-1 rounded-xl bg-muted/50 border border-border w-full sm:w-fit">
        <button
          onClick={() => setActiveTab("standard")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "standard"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          id="tab-standard"
        >
          <Flag code="US" className="size-3.5 sm:size-4 rounded-sm" />
          Standard
          <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">— USA</span>
        </button>
        <button
          onClick={() => setActiveTab("alternative")}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "alternative"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
          id="tab-alternative"
        >
          <Layers className="size-3.5 sm:size-4" />
          Alternative
          <span className="text-[10px] font-normal text-muted-foreground hidden sm:inline">— Global</span>
        </button>
      </div>

      {/* ─── Standard Tab Content ─── */}
      {activeTab === "standard" && (
        <StandardPanel
          profile={userProfile}
          onOrderCreated={(id) => void navigate({ to: `/numbers/$id`, params: { id } })}
        />
      )}

      {/* ─── Alternative Tab Content ─── */}
      {activeTab === "alternative" && (
        <>
          {/* Operator Modal */}
          <OperatorModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            product={selectedProduct}
            country={selectedCountry}
            onSelectOperator={handleOperatorSelected}
            isBuying={isBuyingOperator}
          />

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-[280px_1fr]">
            {/* ─── Country Selector (collapsible accordion on mobile, sticky sidebar on desktop) ─── */}
            <aside className="rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-20 lg:flex lg:h-[calc(100vh-200px)] lg:min-h-[400px] lg:flex-col">
              {/* Accordion header — tappable on mobile */}
              <div
                className="flex cursor-pointer items-center justify-between p-3 sm:p-4 font-semibold lg:cursor-default"
                onClick={() => setCountryListOpen((o) => !o)}
              >
                <span className="flex items-center gap-2 text-sm">
                  <SlidersHorizontal className="size-4 shrink-0" />
                  {selectedCountry && !countryListOpen ? (
                    <span className="flex items-center gap-2">
                      <Flag code={selectedCountry.iso} className="size-4 sm:size-5" />
                      <span className="text-sm font-medium truncate max-w-[160px]">{selectedCountry.name}</span>
                    </span>
                  ) : (
                    <span>Country Selection</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="font-mono text-xs">{filteredCountries.featured.length + filteredCountries.rest.length}</Badge>
                  <ChevronDown
                    className={`size-4 text-muted-foreground transition-transform duration-200 lg:hidden ${
                      countryListOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Collapsible body */}
              <div className={`${countryListOpen ? "flex" : "hidden"} lg:flex flex-col flex-1 px-3 sm:px-4 pb-3 sm:pb-4 gap-3 overflow-hidden`}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    placeholder="Search country..."
                    className="pl-9 text-sm h-9"
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-0.5 space-y-0.5 max-h-[40vh] lg:max-h-none">
                  {/* Featured countries */}
                  {filteredCountries.featured.map((c: FivesimCountry) => {
                    const isSelected = selectedCountry?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCountry(c)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Flag code={c.iso} className="size-4 sm:size-5 rounded-sm shrink-0" />
                          <span className="font-medium truncate">{c.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-normal px-1.5 h-4 ${
                              isSelected ? "bg-white/20 text-primary-foreground border-0" : ""
                            }`}
                          >
                            Featured
                          </Badge>
                          {isSelected && <Check className="size-3.5" />}
                        </div>
                      </button>
                    );
                  })}

                  {filteredCountries.featured.length > 0 && filteredCountries.rest.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">All Countries</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {filteredCountries.rest.map((c: FivesimCountry) => {
                    const isSelected = selectedCountry?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCountry(c)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-muted/60 text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Flag code={c.iso} className="size-4 rounded-sm shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </span>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}

                  {filteredCountries.featured.length === 0 && filteredCountries.rest.length === 0 && (
                    <div className="py-6 text-center text-sm text-muted-foreground">No countries match your search.</div>
                  )}
                </div>
              </div>
            </aside>

            {/* ─── Right Column: Services ─── */}
            {selectedCountry ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Country Header */}
                <div className="rounded-2xl border border-border bg-card px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
                  <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Flag code={selectedCountry.iso} className="size-7 sm:size-8 rounded-lg shadow-sm shrink-0" />
                      <div>
                        <h2 className="font-bold text-sm sm:text-base">{selectedCountry.name}</h2>
                        <p className="text-xs text-muted-foreground">
                          {products.length > 0
                            ? `${products.length} services available`
                            : loadingProducts
                            ? "Loading..."
                            : "No services found"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={productQuery}
                          onChange={(e) => setProductQuery(e.target.value)}
                          placeholder="Search..."
                          className="pl-8 h-8 text-xs w-[130px] sm:w-[160px]"
                        />
                      </div>

                      {/* Operator dropdown */}
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary min-w-[110px] sm:min-w-[130px]"
                        disabled={loadingOperators}
                      >
                        <option value="any">Any operator</option>
                        {availableOperators.map((op) => (
                          <option key={op} value={op}>
                            {formatOperatorName(op)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Operator hint banner */}
                <div className="flex items-start sm:items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 sm:px-4 py-2.5 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5 text-primary shrink-0 mt-0.5 sm:mt-0" />
                  <span>
                    Tap <span className="font-semibold text-foreground">Buy</span> to compare operators and pick the one with the{" "}
                    <span className="text-emerald-500 font-semibold">highest success rate</span>.
                  </span>
                </div>

                {/* Products/Services Grid */}
                {loadingProducts ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-3 h-[100px]">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-muted shrink-0" />
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="h-3 w-2/3 bg-muted rounded" />
                            <div className="h-2.5 w-1/3 bg-muted rounded" />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="h-4 w-10 bg-muted rounded" />
                          <div className="h-7 w-14 bg-muted rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((p, i) => {
                      const formattedName = p.name.charAt(0).toUpperCase() + p.name.slice(1);
                      const isOutOfStock = p.qty === 0;
                      const isLowStock = p.qty > 0 && p.qty < 10;

                      return (
                        <motion.div
                          key={p.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.025, duration: 0.18 }}
                          className={`flex flex-col justify-between rounded-xl border p-2.5 sm:p-3 shadow-sm transition-all ${
                            isOutOfStock 
                              ? "border-border/50 bg-muted/30 opacity-60" 
                              : "border-border bg-card hover:shadow-md hover:border-primary/30"
                          }`}
                        >
                          <div className="flex flex-col gap-1.5 sm:gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <ServiceLogo name={p.name} size="sm" className="size-6 sm:size-7 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-[11px] sm:text-xs truncate leading-tight">{formattedName}</h3>
                                <p className={`text-[9px] sm:text-[10px] font-medium leading-none mt-0.5 ${
                                  isOutOfStock ? "text-red-500" : isLowStock ? "text-amber-500" : "text-muted-foreground"
                                }`}>
                                  {isOutOfStock ? "Out of stock" : `${p.qty.toLocaleString()} in stock`}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="w-fit font-mono font-bold text-[10px] px-1.5 py-0 h-4 sm:h-5">
                              ₦{p.price.toFixed(0)}
                            </Badge>
                          </div>

                          <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1 pt-2 border-t border-border/50">
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-1">
                              <Signal className="size-3" />
                            </span>
                            <Button
                              size="sm"
                              variant={isOutOfStock ? "ghost" : "hero"}
                              className="h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs"
                              disabled={isOutOfStock}
                              onClick={() => handleOpenOperatorModal(p)}
                            >
                              <ShoppingCart className="size-3" />
                              <span className="ml-1 hidden xs:inline sm:inline">{isOutOfStock ? "Unavailable" : "Buy"}</span>
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center shadow-sm">
                    <AlertCircle className="mx-auto size-7 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-foreground">No services found</p>
                    <p className="text-xs text-muted-foreground mt-1">No services match your query for this country.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 sm:p-12 text-center shadow-sm min-h-[200px]">
                <Globe className="size-10 sm:size-12 text-primary/30 animate-pulse mb-3 sm:mb-4" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Select a Country</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-xs">
                  Choose a country above to see available services and pricing.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}