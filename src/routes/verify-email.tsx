import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";
import { sendSignupCode, verifySignupCode } from "@/lib/auth-flow.functions";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): { email?: string; code?: string } => ({
    email: typeof s.email === "string" ? s.email : undefined,
    code: typeof s.code === "string" ? s.code : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify your email — Hammzy Digitals" }] }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const navigate = useNavigate();
  const { email = "", code: codeParam } = useSearch({ from: "/verify-email" });
  const [code, setCode] = useState(codeParam ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const sentRef = useRef(false);
  const autoRef = useRef(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const submit = useCallback(
    async (value: string) => {
      if (!email) {
        toast.error("Missing email. Please sign in again.");
        navigate({ to: "/auth", search: { mode: "signin" } });
        return;
      }
      setSubmitting(true);
      try {
        await verifySignupCode({ data: { email, code: value } });
        toast.success("Email verified! Welcome aboard.");
        window.location.href = "/dashboard";
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Verification failed");
        setSubmitting(false);
      }
    },
    [email, navigate],
  );

  const sendCode = useCallback(async () => {
    if (!email) return;
    try {
      const res = await sendSignupCode({ data: { email, origin } });
      if ((res as { alreadyVerified?: boolean }).alreadyVerified) {
        window.location.href = "/dashboard";
        return;
      }
      setCooldown(45);
      toast.success("Verification code sent to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    }
  }, [email, origin]);

  // Send a code on first load
  useEffect(() => {
    if (!sentRef.current && email) {
      sentRef.current = true;
      void sendCode();
    }
  }, [email, sendCode]);

  // Auto-submit if a code arrived via the email link
  useEffect(() => {
    if (!autoRef.current && codeParam && /^\d{4}$/.test(codeParam)) {
      autoRef.current = true;
      void submit(codeParam);
    }
  }, [codeParam, submit]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

        <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We sent a 4-digit code to {email ? <span className="font-medium text-foreground">{email}</span> : "your email"}.
          Enter it below to continue.
        </p>

        <div className="mt-7 flex justify-center">
          <InputOTP
            maxLength={4}
            value={code}
            onChange={(v) => {
              setCode(v);
              if (v.length === 4) void submit(v);
            }}
            disabled={submitting}
          >
            <InputOTPGroup className="gap-2">
              <InputOTPSlot index={0} className="size-14 rounded-lg border text-xl" />
              <InputOTPSlot index={1} className="size-14 rounded-lg border text-xl" />
              <InputOTPSlot index={2} className="size-14 rounded-lg border text-xl" />
              <InputOTPSlot index={3} className="size-14 rounded-lg border text-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          variant="hero"
          size="lg"
          className="mt-7 w-full"
          disabled={submitting || code.length !== 4}
          onClick={() => void submit(code)}
        >
          {submitting ? "Verifying…" : "Verify & continue"}
          <ArrowRight className="size-4" />
        </Button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={() => void sendCode()}
            className="font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </p>

        <p className="mt-2 text-center text-sm">
          <Link to="/auth" search={{ mode: "signin" }} className="text-muted-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}