import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Search, ArrowLeft, ChevronLeft, ChevronRight, Phone, Database, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ServiceLogo } from "@/components/service-logo";
import { adminListOrders, adminListLogPurchases } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const listOrders = useServerFn(adminListOrders);
  const listLogPurchases = useServerFn(adminListLogPurchases);
  const [activeSection, setActiveSection] = useState<"numbers" | "logs">("numbers");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const orders = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: () => listOrders(),
  });

  const logs = useQuery({
    queryKey: ["admin-all-log-purchases"],
    queryFn: () => listLogPurchases(),
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter based on active section
  const currentItems = activeSection === "numbers" ? (orders.data ?? []) : (logs.data ?? []);

  const filteredItems = currentItems.filter((o: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const orderId = (o.id || "").toLowerCase();
    const userEmail = (o.user?.email || "").toLowerCase();
    const username = (o.user?.username || o.user?.full_name || "").toLowerCase();

    if (activeSection === "numbers") {
      const number = (o.number || "").toLowerCase();
      const country = (o.country || "").toLowerCase();
      const provider = (o.provider || "").toLowerCase();
      const status = (o.status || "").toLowerCase();
      return (
        orderId.includes(query) ||
        number.includes(query) ||
        country.includes(query) ||
        provider.includes(query) ||
        status.includes(query) ||
        userEmail.includes(query) ||
        username.includes(query)
      );
    } else {
      const platform = (o.platform || "").toLowerCase();
      const type = (o.type || "").toLowerCase();
      const credential = (o.credential || "").toLowerCase();
      return (
        orderId.includes(query) ||
        platform.includes(query) ||
        type.includes(query) ||
        credential.includes(query) ||
        userEmail.includes(query) ||
        username.includes(query)
      );
    }
  });

  const totalItems = filteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? 1 : currentPage;
  const pageItems = filteredItems.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to="/admin">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-sm text-muted-foreground">Search and track customer purchases.</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => { setActiveSection("numbers"); setCurrentPage(1); }}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeSection === "numbers"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Phone className="size-4" />
          Virtual Numbers ({orders.data?.length ?? 0})
        </button>
        <button
          onClick={() => { setActiveSection("logs"); setCurrentPage(1); }}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeSection === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Database className="size-4" />
          Social Media Logs ({logs.data?.length ?? 0})
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={activeSection === "numbers" ? "Search Order ID, phone, country, user email..." : "Search Order ID, platform, credentials, user email..."}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {totalItems === 0 ? 0 : (activePage - 1) * itemsPerPage + 1} - {Math.min(activePage * itemsPerPage, totalItems)} of {totalItems} orders
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {activeSection === "numbers" ? (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Number</th>
                  <th className="p-4 font-medium">Country</th>
                  <th className="p-4 font-medium">Provider</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((o: any) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono text-xs text-muted-foreground select-all">{o.id}</td>
                    <td className="p-4">
                      <p className="font-medium">{o.user?.username || o.user?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.user?.email}</p>
                    </td>
                    <td className="p-4 font-semibold">{o.number}</td>
                    <td className="p-4 text-muted-foreground">{o.country}</td>
                    <td className="p-4 text-muted-foreground">{o.provider}</td>
                    <td className="p-4 font-semibold">₦{Number(o.price).toFixed(2)}</td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <Badge variant={o.status === "paid" || o.status === "finished" ? "secondary" : "outline"}>
                        {o.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No number orders match your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 font-medium">Order ID</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Platform</th>
                  <th className="p-4 font-medium min-w-[200px]">Type / Credentials</th>
                  <th className="p-4 font-medium">Price</th>
                  <th className="p-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((l: any) => (
                  <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-mono text-xs text-muted-foreground select-all">#{l.id.slice(0, 8)}</td>
                    <td className="p-4">
                      <p className="font-medium">{l.user?.username || l.user?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{l.user?.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <ServiceLogo name={l.platform} size="sm" />
                        <span className="font-medium">{typeof l.platform === 'object' ? JSON.stringify(l.platform) : String(l.platform ?? "Social Media")}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-semibold mb-1">{typeof l.type === 'object' ? JSON.stringify(l.type) : String(l.type ?? "Account")}</p>
                      <div className="flex items-center gap-2 max-w-md bg-muted/30 p-2 rounded border border-border">
                        <code className="text-[10px] font-mono truncate max-w-full">{typeof l.credential === 'object' ? JSON.stringify(l.credential) : String(l.credential ?? "")}</code>
                        <button
                          onClick={(e) => handleCopy(e, l.credential, l.id)}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Copy credentials"
                        >
                          {copiedId === l.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-semibold">₦{Number(l.price).toFixed(2)}</td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No log orders match your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={activePage === 1}
            className="gap-1"
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === activePage;
              return (
                <Button
                  key={pageNum}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-9 h-9 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={activePage === totalPages}
            className="gap-1"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
