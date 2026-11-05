import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, DollarSign, ShoppingCart, Ban, Trash2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminListUsers,
  adminStats,
  adminRecentOrders,
  adminSetSuspended,
  adminDeleteUser,
} from "@/lib/admin.functions";
import { adminAddBalance } from "@/lib/logs.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const qc = useQueryClient();
  const listUsers = useServerFn(adminListUsers);
  const getStats = useServerFn(adminStats);
  const getOrders = useServerFn(adminRecentOrders);
  const setSuspended = useServerFn(adminSetSuspended);
  const deleteUser = useServerFn(adminDeleteUser);
  const addBalance = useServerFn(adminAddBalance);
  const [busy, setBusy] = useState<string | null>(null);

  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => listUsers() });
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => getStats() });
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => getOrders() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const onSuspend = async (id: string, suspended: boolean) => {
    setBusy(id);
    try {
      await setSuspended({ data: { userId: id, suspended } });
      toast.success(suspended ? "User suspended" : "User unsuspended");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this user permanently?")) return;
    setBusy(id);
    try {
      await deleteUser({ data: { userId: id } });
      toast.success("User deleted");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const onAddBalance = async (id: string) => {
    const input = prompt("Amount to add to this user's wallet (Naira):");
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(id);
    try {
      const res = await addBalance({ data: { userId: id, amount } });
      toast.success(`New balance: ₦${res.newBalance.toFixed(2)}`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const s = stats.data;
  const cards = [
    { label: "Total users", value: s?.users ?? "—", icon: Users },
    { label: "Revenue", value: s ? `₦${s.revenue.toFixed(2)}` : "—", icon: DollarSign },
    { label: "Total User Wallet Balance", value: s ? `₦${s.totalUserBalance.toFixed(2)}` : "—", icon: Wallet },
    { label: "Total activations", value: s?.orders ?? "—", icon: ShoppingCart },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <c.icon className="size-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-bold">Users</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Wallet</th>
                <th className="p-4 font-medium">Orders</th>
                <th className="p-4 font-medium">Spends</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users.data ?? []).slice(0, 5).map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="p-4">
                    <p className="font-medium">{u.username || u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <Badge variant={u.roles.includes("admin") ? "default" : "secondary"}>
                      {u.roles.includes("admin") ? "admin" : "user"}
                    </Badge>
                  </td>
                  <td className="p-4 font-medium">₦{Number(u.wallet_balance ?? 0).toFixed(2)}</td>
                  <td className="p-4">{u.orderCount}</td>
                  <td className="p-4">₦{u.totalSpent.toFixed(2)}</td>
                  <td className="p-4">
                    <Badge variant={u.suspended ? "destructive" : "secondary"}>
                      {u.suspended ? "suspended" : "active"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busy === u.id} onClick={() => onAddBalance(u.id)}>
                        <Plus className="size-4" /> Balance
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busy === u.id} onClick={() => onSuspend(u.id, !u.suspended)}>
                        <Ban className="size-4" /> {u.suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={busy === u.id}
                        onClick={() => onDelete(u.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.data && users.data.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {(users.data ?? []).length > 5 && (
        <div className="mt-3 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">See all users &rarr;</Link>
          </Button>
        </div>
      )}

      <h2 className="mt-10 text-lg font-bold">Recent orders</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-4 font-medium">Number</th>
                <th className="p-4 font-medium">Country</th>
                <th className="p-4 font-medium">Provider</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders.data ?? []).slice(0, 5).map((o: any) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium">{o.number}</td>
                  <td className="p-4 text-muted-foreground">{o.country}</td>
                  <td className="p-4 text-muted-foreground">{o.provider}</td>
                  <td className="p-4 font-medium">₦{Number(o.price).toFixed(2)}</td>
                  <td className="p-4"><Badge variant={o.status === "finished" || o.status === "pending" || o.status === "received" || o.status === "paid" ? "secondary" : "outline"}>{o.status}</Badge></td>
                </tr>
              ))}
              {orders.data && orders.data.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {(orders.data ?? []).length > 5 && (
        <div className="mt-3 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">See all orders &rarr;</Link>
          </Button>
        </div>
      )}
    </div>
  );
}