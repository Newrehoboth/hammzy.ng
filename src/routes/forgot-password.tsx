import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, ArrowRight, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";
import { requestPasswordReset } from "@/lib/auth-flow.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password — Hammzy Digitals" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    const email = String(data.get("email") || "").trim();
    if (!email) return;
    setSubmitting(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    try {
      await requestPasswordReset({ data: { email, origin } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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

        {sent ? (
          <>
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MailCheck className="size-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              If that email is registered with us, we've sent a link to reset your password. The link expires in 60 minutes.
            </p>
            <Link to="/auth" search={{ mode: "signin" }} className="mt-7 block">
              <Button variant="outline" size="lg" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Enter your account email and we'll send you a link to reset it.
            </p>
            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required className="pl-9" />
                </div>
              </div>
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset link"}
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <p className="mt-6 text-center text-sm">
              <Link to="/auth" search={{ mode: "signin" }} className="text-muted-foreground hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}