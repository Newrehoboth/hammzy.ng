import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, type FormEvent, useState } from "react";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { AdminShell } from "@/components/admin-shell";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Hammzy Digitals" }] }),
  component: AdminLayout,
});

function AdminField({
  id,
  label,
  icon: Icon,
  type = "text",
  placeholder,
  defaultValue,
}: {
  id: string;
  label: string;
  icon: typeof Mail;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} name={id} type={type} placeholder={placeholder} defaultValue={defaultValue} required className="pl-9" />
      </div>
    </div>
  );
}

function AdminLayout() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && !isAdmin) void signOut();
  }, [loading, user, isAdmin, signOut]);

  const onAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setLoginBusy(true);
    const res = await signIn(email, password);
    setLoginBusy(false);
    if (res.error) {
      const errorMsg = typeof res.error === "string"
        ? res.error
        : (res.error as any)?.message || JSON.stringify(res.error) || "Invalid login credentials";
      toast.error(errorMsg);
      return;
    }
    toast.success("Admin signed in");
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-10">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-x-0 top-0 h-[420px]" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="flex items-center gap-2.5">
            <img src={logo.url} alt="Hammzy Digitals logo" className="size-10 rounded-xl object-contain" />
            <div>
              <p className="text-sm text-muted-foreground">Hammzy Digitals</p>
              <h1 className="text-xl font-extrabold tracking-tight">Admin Console</h1>
            </div>
          </div>

          <form onSubmit={onAdminLogin} className="mt-7 space-y-4">
            <AdminField id="email" label="Admin email" icon={Mail} type="email" placeholder="hammzydigital@gmail.com" defaultValue="hammzydigital@gmail.com" />
            <AdminField id="password" label="Password" icon={Lock} type="password" placeholder="••••••••" />
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loginBusy}>
              {loginBusy ? "Checking…" : "Enter admin"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <Button type="button" variant="ghost" className="mt-4 w-full" onClick={() => navigate({ to: "/" })}>
            Back to platform
          </Button>
        </div>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold">Admins only</h1>
          <p className="mt-1 text-muted-foreground">You don't have access to this area.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}