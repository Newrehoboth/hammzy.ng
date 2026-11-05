import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Ban, Trash2, Plus, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminListUsers,
  adminSetSuspended,
  adminDeleteUser,
} from "@/lib/admin.functions";
import { adminAddBalance } from "@/lib/logs.functions";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const listUsers = useServerFn(adminListUsers);
  const setSuspended = useServerFn(adminSetSuspended);
  const deleteUser = useServerFn(adminDeleteUser);
  const addBalance = useServerFn(adminAddBalance);
  const [busy, setBusy] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listUsers(),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
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

  // Filter users based on query
  const filteredUsers = (users.data ?? []).filter((u: any) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const username = (u.username || u.full_name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    return username.includes(query) || email.includes(query);
  });

  // Paginated slices
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Reset page to 1 if search filters it out
  const activePage = currentPage > totalPages ? 1 : currentPage;
  
  const pageItems = filteredUsers.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link to="/admin">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users Management</h1>
          <p className="text-sm text-muted-foreground">Search, configure balances, and suspend users.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search username or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {totalItems === 0 ? 0 : (activePage - 1) * itemsPerPage + 1} - {Math.min(activePage * itemsPerPage, totalItems)} of {totalItems} users
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border bg-muted/30">
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
              {pageItems.map((u: any) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
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
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No users match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
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
