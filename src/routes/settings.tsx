import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Hammzy Digitals" }] }),
  component: Settings,
});

function Settings() {
  const { profile, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your profile and security preferences.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input defaultValue={profile?.full_name ?? profile?.username ?? ""} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue={profile?.email ?? user?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input defaultValue={profile?.username ?? ""} placeholder="username" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Security</h2>
          <div className="mt-4 space-y-4">
            <Row label="Two-factor authentication" desc="Add an extra layer of security at login." />
            <Row label="Email notifications" desc="Number expiry, SMS and payment alerts." defaultOn />
            <Row label="Push notifications" desc="Real-time alerts on your devices." defaultOn />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">Account</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="hero" onClick={() => toast.success("Settings saved")}>Save changes</Button>
            {isAdmin && (
              <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>Admin console</Button>
            )}
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={async () => { await signOut(); navigate({ to: "/auth", search: { mode: "signin" } }); }}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, desc, defaultOn }: { label: string; desc: string; defaultOn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultOn} />
    </div>
  );
}