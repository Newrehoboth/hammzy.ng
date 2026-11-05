import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listMyOrders, type OrderWithMeta } from "@/lib/orders.functions";
import { useAuth } from "@/lib/auth-context";
import { PocketFiDeposit } from "@/components/pocketfi-deposit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Hammzy Digitals" }] }),
  loader: async () => {
    try {
      const orders = await listMyOrders();
      return { orders };
    } catch (err) {
      console.error("Failed to load billing history:", err);
      return { orders: [] };
    }
  },
  component: Billing,
});

function Billing() {
  const { orders } = Route.useLoaderData() as { orders: OrderWithMeta[] };
  const { profile: userProfile } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);

  // Metrics
  const totalPayments = orders.length;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const spentThisMonth = orders
      .filter((o) => new Date(o.created_at).getTime() >= thirtyDaysAgo)
      .reduce((sum, o) => sum + Number(o.price), 0);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "finished") return <Badge variant="secondary">Success</Badge>;
    if (s === "pending" || s === "received") return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Pending</Badge>;
    return <Badge variant="destructive" className="capitalize">{s}</Badge>;
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Payment history and receipts. Charges are debited from your wallet balance.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Spent this month", value: `₦${spentThisMonth.toFixed(2)}` },
          { label: "Total payments", value: String(totalPayments) },
          { label: "Default method", value: "Paga Transfer (PocketFi)" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
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

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold">Payment history</h2>
          <Button variant="outline" size="sm" onClick={() => setShowDeposit(true)}>
            <CreditCard className="size-4" /> Top up balance
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground bg-muted/40">
              <tr className="border-b border-border">
                <th className="p-4 font-medium">Service</th>
                <th className="p-4 font-medium">Number</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((p) => {
                const serviceName = p.service ? p.service.charAt(0).toUpperCase() + p.service.slice(1) : "Activation";
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-medium">{serviceName}</td>
                    <td className="p-4 font-mono">{p.number}</td>
                    <td className="p-4 font-semibold">₦{Number(p.price).toFixed(2)}</td>
                    <td className="p-4 text-muted-foreground">Main Wallet</td>
                    <td className="p-4">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to="/numbers/$id" params={{ id: p.id }}>
                            <ExternalLink className="size-3.5 mr-1" /> View details
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.success("Receipt downloaded (Mock)")}
                        >
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    No billing history found. Purchase a number from the marketplace to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}