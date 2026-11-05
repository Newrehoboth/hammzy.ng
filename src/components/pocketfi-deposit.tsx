import { useState, useEffect } from "react";
import { Copy, Check, Loader2, Landmark, HelpCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getOrCreatePocketFiAccount } from "@/lib/logs.functions";
import { Button } from "@/components/ui/button";

export function PocketFiDeposit() {
  const [account, setAccount] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    getOrCreatePocketFiAccount()
      .then((acc) => {
        if (mounted) {
          setAccount({
            bankName: acc.bankName ?? "paga",
            accountNumber: acc.accountNumber ?? "",
            accountName: acc.accountName ?? "",
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          const errorMsg = err?.message || "Failed to load your personal deposit account.";
          if (errorMsg.includes("configuration error") || errorMsg.includes("POCKETFI_PUBLIC_KEY")) {
            toast.error("Payment system is temporarily unavailable. Please contact support.");
          } else if (errorMsg.includes("temporarily unavailable") || errorMsg.includes("API error")) {
            toast.error("Payment service is under maintenance. Please try again later or contact support.");
          } else {
            toast.error(errorMsg);
          }
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    toast.success("Account number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Securing your personal Paga deposit account...</p>
        <p className="text-xs text-muted-foreground mt-1">This will only take a moment.</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <p className="text-sm font-semibold text-amber-600">Automated deposit temporarily unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Our automated bank transfer system is under maintenance. Please contact admin for manual deposit.
          </p>
        </div>
        
        {/* <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="font-semibold text-sm mb-2">Alternative: Manual Deposit</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Contact support via WhatsApp to make a manual deposit to your wallet.
          </p>
          <Button 
            className="w-full" 
            onClick={() => window.open('https://wa.me/your-number', '_blank')}
          >
            Contact Support on WhatsApp
          </Button>
        </div> */}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Details Box */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-5 sm:p-6 shadow-sm">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 -mr-6 -mt-6 size-28 rounded-full bg-primary/5 blur-2xl" />

        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Landmark className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">Dedicated Deposit Bank Account</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Transfer to this account to instantly credit your wallet.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 border-t border-border pt-4 text-sm">
          {/* Bank */}
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground text-xs sm:text-sm">Bank Name</span>
            <span className="font-bold text-foreground capitalize flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              Paga
            </span>
          </div>

          {/* Account Number */}
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground text-xs sm:text-sm">Account Number</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base sm:text-lg tracking-wider text-foreground">
                {account.accountNumber}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg hover:bg-primary/5"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
          </div>

          {/* Account Name */}
          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-muted-foreground text-xs sm:text-sm">Account Name</span>
            <span className="font-semibold text-foreground text-right max-w-[200px] truncate">
              {account.accountName}
            </span>
          </div>
        </div>
      </div>

      {/* Info Badges */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-emerald-500 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground block mb-0.5">Automated Credit (24/7)</span>
            Deposits are fully automated and typically reflect in your wallet within 1-3 minutes of transfer.
          </div>
        </div>
        <div className="flex gap-2.5 rounded-xl border border-border bg-muted/20 p-3.5 text-xs text-muted-foreground">
          <HelpCircle className="size-4 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <span className="font-semibold text-foreground block mb-0.5">Transfer Limits</span>
            No minimum or maximum limits. Standard bank network transfer charges apply.
          </div>
        </div>
      </div>
    </div>
  );
}
