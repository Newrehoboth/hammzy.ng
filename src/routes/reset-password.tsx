import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";
import { resetPassword } from "@/lib/auth-flow.functions";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({ meta: [{ title: "Reset password — Hammzy Digitals" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/reset-password" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid or missing reset link.");
      return;
    }
    const data = new FormData(e.target as HTMLFormElement);
    const password = String(data.get("password") || "");
    const confirm = String(data.get("confirm") || "");
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword({ data: { token, password } });
      toast.success("Password updated! Please sign in.");
      navigate({ to: "/auth", search: { mode: "signin" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
      setSubmitting(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <Link to="/" className="mb-8 flex items-center gap-2.5">
          <img src={logo.url} alt="Hammzy Digitals logo" className="size-9 rounded-xl object-contain" />
          <span className="text-lg font-extrabold tracking-tight">Hammzy Digitals</span>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {token ? "Choose a new password for your account." : "This reset link is invalid or has expired."}
        </p>

        {token && (
          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" name="password" type="password" placeholder="••••••••" required className="pl-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirm" name="confirm" type="password" placeholder="••••••••" required className="pl-9" />
              </div>
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
              <ArrowRight className="size-4" />
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Request a new link
          </Link>
        </p>
      </motion.div>
    </div>
  );
}