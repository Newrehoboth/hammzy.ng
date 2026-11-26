import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Ban, Trash2, Plus, ArrowLeft, ChevronLeft, ChevronRight, Mail, X, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  adminListUsers,
  adminSetSuspended,
  adminDeleteUser,
  adminSendEmail,
  adminSendBulkEmail,
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
  const sendEmail = useServerFn(adminSendEmail);
  const sendBulkEmail = useServerFn(adminSendBulkEmail);
  const [busy, setBusy] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Email dialog state
  const [emailDialog, setEmailDialog] = useState<{ userId: string; userEmail: string; userName: string } | null>(null);
  const [bulkEmailDialog, setBulkEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

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

  const onOpenEmailDialog = (user: any) => {
    setEmailDialog({
      userId: user.id,
      userEmail: user.email,
      userName: user.username || user.full_name || user.email,
    });
    setEmailSubject("");
    setEmailMessage("");
  };

  const onOpenBulkEmailDialog = () => {
    setBulkEmailDialog(true);
    setEmailSubject("");
    setEmailMessage("");
  };

  const onSendEmail = async () => {
    if (!emailDialog) return;
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }
    
    setBusy(emailDialog.userId);
    try {
      await sendEmail({ 
        data: { 
          userId: emailDialog.userId, 
          subject: emailSubject.trim(), 
          message: emailMessage.trim() 
        } 
      });
      toast.success(`Email sent to ${emailDialog.userEmail}`);
      setEmailDialog(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setBusy(null);
    }
  };

  const onSendBulkEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please fill in both subject and message");
      return;
    }
    
    if (!confirm(`Send this email to ALL ${users.data?.length || 0} users?`)) return;
    
    setBusy("bulk");
    try {
      const result = await sendBulkEmail({ 
        data: { 
          subject: emailSubject.trim(), 
          message: emailMessage.trim() 
        } 
      });
      toast.success(`Email sent to ${result.sent} users successfully!`);
      if (result.failed > 0) {
        toast.warning(`${result.failed} emails failed to send`);
      }
      setBulkEmailDialog(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send bulk email");
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
        <div className="flex items-center gap-3">
          <Button onClick={onOpenBulkEmailDialog} className="gap-2">
            <Send className="size-4" />
            Email All Users
          </Button>
          <div className="text-sm text-muted-foreground">
            Showing {totalItems === 0 ? 0 : (activePage - 1) * itemsPerPage + 1} - {Math.min(activePage * itemsPerPage, totalItems)} of {totalItems} users
          </div>
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
                      <Button variant="ghost" size="sm" disabled={busy === u.id} onClick={() => onOpenEmailDialog(u)} title="Send email">
                        <Mail className="size-4" />
                      </Button>
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
      
      {/* Email Dialog */}
      {emailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Send Email</h3>
                <p className="text-sm text-muted-foreground">
                  To: {emailDialog.userName} ({emailDialog.userEmail})
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full" 
                onClick={() => setEmailDialog(null)}
              >
                <X className="size-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter email subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="min-h-[200px] w-full resize-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEmailDialog(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={onSendEmail}
                  disabled={busy === emailDialog.userId || !emailSubject.trim() || !emailMessage.trim()}
                >
                  <Mail className="mr-2 size-4" />
                  Send Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Dialog */}
      {bulkEmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Send Email to All Users</h3>
                <p className="text-sm text-muted-foreground">
                  This will send to {users.data?.length || 0} users
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full" 
                onClick={() => setBulkEmailDialog(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter email subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="min-h-[200px] w-full resize-none"
                />
              </div>
              
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                ⚠️ This will send the email to all users at once. Make sure to review your message carefully.
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setBulkEmailDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={onSendBulkEmail}
                  disabled={busy === "bulk" || !emailSubject.trim() || !emailMessage.trim()}
                >
                  <Send className="mr-2 size-4" />
                  Send to All Users
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
