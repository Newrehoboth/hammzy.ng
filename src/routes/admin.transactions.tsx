import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, Search, ArrowUpRight, Calendar, AlertCircle, Users } from "lucide-react";
import { AdminShell } from "@/components/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminListPayments } from "@/lib/logs.functions";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [{ title: "User Transactions — Admin Console" }] }),
  component: AdminTransactionsPage,
});

function AdminTransactionsPage() {
  const fetchPayments = useServerFn(adminListPayments);
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => fetchPayments(),
  });

  const [search, setSearch] = useState("");

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => 
      p.reference.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const totalDeposited = useMemo(() => {
    return payments
      .filter((p) => p.status.toLowerCase() === "success")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const uniqueUsers = useMemo(() => {
    const set = new Set(payments.map(p => p.user_id));
    return set.size;
  }, [payments]);

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="size-6 text-primary" />
            User Deposits (Transactions)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Overview of all payments and funding events across the platform. All values are in Naira (₦).
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Deposits", value: payments.length, color: "text-foreground" },
          { label: "Successful", value: payments.filter(p => p.status.toLowerCase() === "success").length, color: "text-emerald-500" },
          { label: "Active Depositors", value: uniqueUsers, color: "text-blue-500" },
          { label: "Total Revenue", value: `₦${totalDeposited.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "text-primary font-extrabold" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <p className={`text-lg sm:text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, username, or payment reference..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="grid place-items-center py-20 bg-card">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPayments.length === 0 && (
          <div className="py-20 text-center bg-card">
            <AlertCircle className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.length === 0
                ? "No deposits have been logged in the database yet."
                : "Try adjusting your search query."}
            </p>
          </div>
        )}

        {/* Payments Table */}
        {!isLoading && filteredPayments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground bg-muted/20 border-b border-border">
                <tr>
                  <th className="p-4 font-medium text-xs">User (Email)</th>
                  <th className="p-4 font-medium text-xs">Payment Reference</th>
                  <th className="p-4 font-medium text-xs">Amount</th>
                  <th className="p-4 font-medium text-xs">Status</th>
                  <th className="p-4 font-medium text-xs">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredPayments.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{p.email}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">ID: #{p.user_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-foreground">
                      {p.reference}
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      ₦{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-4">
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-xs">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
