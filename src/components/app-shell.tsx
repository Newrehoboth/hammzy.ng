import { type ReactNode, useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  CreditCard,
  History,
  Settings,
  Search,
  Bell,
  LogOut,
  Database,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";
import { useAuth } from "@/lib/auth-context";

const nav = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Numbers", to: "/numbers", icon: Phone },
  { label: "Buy Logs", to: "/logs", icon: Database },
  { label: "Messages", to: "/messages", icon: MessageSquare },
  { label: "Order History", to: "/orders", icon: History },
  { label: "Transactions", to: "/transactions", icon: CreditCard },
  { label: "Billing", to: "/billing", icon: Wallet },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo.url} alt="Hammzy Digitals logo" className="size-9 rounded-xl object-contain" />
      <span className="text-lg font-extrabold tracking-tight">Hammzy Digitals</span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, loading, profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
    else if (!loading && user && profile && profile.email_verified === false) {
      navigate({ to: "/verify-email", search: { email: profile.email ?? user.email ?? "" } });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const initial = (profile?.username || profile?.email || user.email || "A").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="px-2 py-2">
          <Brand />
        </div>
        <div className="mt-6 flex-1">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", search: { mode: "signin" } });
            }}
          >
            <LogOut className="size-4.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src={logo.url} alt="Hammzy Digitals logo" className="size-8 rounded-lg object-contain" />
            <span className="text-base font-extrabold tracking-tight">Hammzy</span>
          </Link>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search numbers, messages…" className="pl-9" />
          </div>
          <div className="flex flex-1 items-center justify-end gap-1">
            <ThemeToggle />
            {/* <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
            </Button> */}
            <Link
              to="/settings"
              aria-label="Account settings"
              className="ml-1 grid size-9 place-items-center rounded-full gradient-primary text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
            >
              {initial}
            </Link>
          </div>
        </header>
        <main className="px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* WhatsApp Customer Service Floating Button */}
      <a
        href="https://wa.me/2347075897725?text=Hello%20Hammzy%20Digitals%2C%20I%20need%20help%20with%20my%20account."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-24 right-4 z-50 flex size-14 items-center justify-center rounded-full shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 lg:bottom-6"
        style={{ background: "#25D366" }}
      >
        {/* WhatsApp SVG icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="size-8 fill-white">
          <path d="M16.003 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.61 4.64 1.77 6.667L2.667 29.333l6.88-1.747A13.29 13.29 0 0 0 16.003 29.333C23.36 29.333 29.333 23.36 29.333 16S23.36 2.667 16.003 2.667zm0 2.4c5.92 0 10.93 5.013 10.93 10.933 0 5.92-5.01 10.933-10.93 10.933a10.9 10.9 0 0 1-5.547-1.52l-.4-.24-4.08 1.04 1.067-3.947-.267-.413A10.88 10.88 0 0 1 5.07 16c0-5.92 5.013-10.933 10.933-10.933zm-3.2 5.6c-.24 0-.627.093-.96.453-.32.36-1.24 1.2-1.24 2.933s1.267 3.413 1.44 3.64c.187.24 2.48 3.8 6 5.173.84.36 1.493.573 2.013.733.84.267 1.613.227 2.213.14.68-.093 2.093-.853 2.387-1.68.293-.827.293-1.52.2-1.68-.08-.147-.32-.24-.667-.413-.36-.187-2.08-1.027-2.4-1.147-.32-.12-.56-.173-.8.16-.24.333-.907 1.147-1.12 1.387-.2.24-.4.267-.747.093-.347-.173-1.467-.54-2.8-1.72-1.04-.933-1.733-2.08-1.947-2.427-.2-.347-.013-.533.16-.707.147-.147.347-.387.52-.573.173-.187.213-.32.32-.547.093-.24.04-.44-.04-.613-.08-.173-.8-1.947-1.093-2.667-.28-.693-.573-.6-.787-.613-.2-.013-.427-.013-.667-.013z"/>
        </svg>
      </a>
    </div>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = nav.filter((item) => item.label !== "Settings");
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 items-center border-t border-border bg-background/80 py-2 backdrop-blur-xl lg:hidden">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 text-center text-[10px] font-medium min-w-0 px-0.5",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5 shrink-0" />
            <span className="truncate w-full block">
              {item.label === "Order History" ? "History" : item.label === "Buy Logs" ? "Logs" : item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}