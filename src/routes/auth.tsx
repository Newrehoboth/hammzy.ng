import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";
import { useAuth } from "@/lib/auth-context";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => ({
    mode: s.mode === "signin" ? "signin" : s.mode === "signup" ? "signup" : undefined,
  }),
  head: () => ({ meta: [{ title: "Get Started — Hammzy Digitals" }] }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<Mode>(search.mode ?? "signup");
  const { user, loading: authLoading, profile, signUp, signIn, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (profile && profile.email_verified === false) {
        navigate({ to: "/verify-email", search: { email: profile.email ?? user.email ?? "" } });
      } else {
        navigate({ to: "/dashboard" });
      }
    }
  }, [authLoading, user, profile, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const username = String(data.get("username") || "").trim();
    setSubmitting(true);
    const res =
      mode === "signup"
        ? await signUp(email, password, username)
        : await signIn(email, password);
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    if (mode === "signup") {
      toast.success("Account created! Check your email for a code.");
      navigate({ to: "/verify-email", search: { email } });
    } else {
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    }
  };

  const onGoogle = async () => {
    const res = await signInWithGoogle();
    if (res.error) toast.error(res.error);
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <div className="absolute inset-0 grid-bg opacity-30 lg:hidden" />
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 lg:flex">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-x-0 top-0 h-[500px]" style={{ background: "var(--gradient-glow)" }} />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src={logo.url} alt="Hammzy Digitals logo" className="size-9 rounded-xl object-contain" />
          <span className="text-lg font-extrabold tracking-tight">Hammzy Digitals</span>
        </Link>
        <div className="relative">
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight">
            Virtual phone numbers, <span className="gradient-text">delivered instantly</span>
          </h2>
          <p className="mt-4 max-w-sm text-muted-foreground">
            Buy numbers from the world's best providers and receive SMS & OTP in a beautiful inbox.
          </p>
        </div>
        <p className="relative text-sm text-muted-foreground">© 2026 Hammzy Digitals</p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <img src={logo.url} alt="Hammzy Digitals logo" className="size-9 rounded-xl object-contain" />
            <span className="text-lg font-extrabold tracking-tight">Hammzy Digitals</span>
          </Link>

          <div className="mb-6 grid w-full grid-cols-2 rounded-xl bg-muted p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={tab(mode === "signup")}
            >
              Get started
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={tab(mode === "signin")}
            >
              Sign in
            </button>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start buying virtual numbers in seconds."
              : "Sign in to manage your numbers and inbox."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <Field id="username" label="Username" icon={User} placeholder="hammzy" />
            )}
            <Field id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" />
            <Field id="password" label="Password" icon={Lock} type="password" placeholder="••••••••" />

            {mode === "signin" && (
              <div className="-mt-1 text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {/* <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={onGoogle}>
            <svg className="size-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </Button> */}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New to Hammzy Digitals? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Get started"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function tab(active: boolean) {
  return `rounded-lg px-4 py-2 text-center transition-colors ${active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
    }`;
}

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} name={id} type={type} placeholder={placeholder} required className="pl-9" />
      </div>
    </div>
  );
}