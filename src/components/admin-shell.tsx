import { type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Database, LogOut, Users, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";

const adminNav = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", to: "/admin/users", icon: Users, exact: false },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart, exact: false },
  { label: "Logs", to: "/admin/logs", icon: Database, exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <img src={logo.url} alt="Hammzy" className="size-9 rounded-xl object-contain" />
          <span className="text-base font-extrabold tracking-tight">Admin Console</span>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {adminNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <item.icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", search: { mode: "signin" } });
            }}
          >
            <LogOut className="size-4.5" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2">
            <img src={logo.url} alt="Hammzy" className="size-8 rounded-lg object-contain" />
            <span className="font-extrabold tracking-tight">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/auth", search: { mode: "signin" } }); }}>
            <LogOut className="size-4" />
          </Button>
        </header>
        {/* Mobile nav tabs */}
        <div className="flex gap-2 border-b border-border px-4 py-2 lg:hidden">
          {adminNav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <main className="px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}