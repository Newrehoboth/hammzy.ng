import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Phone,
  ShieldCheck,
  Zap,
  Globe2,
  MessageSquare,
  CreditCard,
  ArrowRight,
  Users,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Flag } from "@/components/flag";
import logo from "@/assets/hammzy-logo.jpeg.asset.json";

// Static showcase cards for the hero — demonstrates real service types available
const heroShowcase = [
  { service: "WhatsApp", country: "United States", code: "US", price: 0.5, tag: "Popular" },
  { service: "Telegram", country: "United Kingdom", code: "GB", price: 0.2, tag: "Fast" },
  { service: "Google", country: "Germany", code: "DE", price: 0.15, tag: "Cheap" },
  { service: "Instagram", country: "France", code: "FR", price: 0.35, tag: "Trending" },
  { service: "Facebook", country: "Brazil", code: "BR", price: 0.25, tag: "Hot" },
  { service: "Twitter", country: "Canada", code: "CA", price: 0.18, tag: "Fast" },
  { service: "TikTok", country: "Nigeria", code: "NG", price: 0.12, tag: "Cheap" },
  { service: "Snapchat", country: "Netherlands", code: "NL", price: 0.3, tag: "New" },
];

// Single provider powering all numbers
const poweredBy = ["Direct Carrier API"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hammzy Digitals - Buy Virtual Phone Numbers & Social Media Logs in Nigeria" },
      {
        name: "description",
        content:
          "Buy virtual phone numbers from 170+ countries and high-quality social media logs in Nigeria. Instant SMS & OTP verification for WhatsApp, Telegram, Instagram, Facebook. Fast, secure, and affordable. Starting from ₦200.",
      },
      { name: "keywords", content: "buy virtual phone number Nigeria, SMS verification Nigeria, OTP verification, temporary phone number, disposable number, WhatsApp verification number, Telegram number Nigeria, Instagram verification, Facebook logs Nigeria, social media accounts, buy Instagram logs, buy Facebook accounts, virtual number online Nigeria, cheap virtual numbers" },
      { property: "og:title", content: "Buy Virtual Phone Numbers & Social Media Logs in Nigeria | Hammzy Digitals" },
      {
        property: "og:description",
        content: "Instant virtual numbers from 170+ countries and premium social media logs. Fast SMS verification for WhatsApp, Telegram, Instagram. Prices from ₦200.",
      },
      { property: "og:url", content: "https://hammzy.ng" },
      { name: "twitter:title", content: "Buy Virtual Phone Numbers & Social Media Logs | Hammzy Digitals" },
      {
        name: "twitter:description",
        content: "Get instant virtual phone numbers and premium social media logs in Nigeria. Fast verification for all platforms.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Globe2, title: "Global coverage", text: "Numbers across 170+ countries sourced live from our global partner network in real time." },
  { icon: Zap, title: "Instant activation", text: "Click Buy and your number is provisioned and ready to receive SMS in seconds." },
  { icon: Users, title: "Social media logs", text: "Purchase high-quality, pre-warmed logs for platforms like Facebook, Instagram, Telegram, and more." },
  { icon: MessageSquare, title: "Live SMS & OTP", text: "A real-time inbox with automatic OTP extraction, highlight, and one-click copy." },
  { icon: ShieldCheck, title: "Secure by default", text: "Supabase auth, row-level security, encrypted server keys — your data never touches the browser." },
  { icon: CreditCard, title: "No user wallet needed", text: "Platform credits are managed by the owner. Users just browse and activate — no payment setup required." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src={logo.url} alt="Hammzy Digitals logo" className="size-9 rounded-xl object-contain" />
            <span className="text-lg font-extrabold tracking-tight">Hammzy Digitals</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#providers" className="hover:text-foreground">Providers</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden" aria-label="Hero section">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-x-0 top-0 h-[600px]" style={{ background: "var(--gradient-glow)" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full px-3 py-1">
              <span className="size-2 rounded-full bg-emerald" /> Virtual Numbers & Social Media Logs
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
              Buy Virtual Numbers &{" "}
              <span className="gradient-text">Social Media Logs</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Get instant virtual phone numbers from 170+ countries. Premium social media accounts ready to use. Fast, secure & affordable.
            </p>

            {/* Big CTA Buttons */}
            <div className="mt-10 grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto">
              {/* Buy Numbers Button */}
              <Link 
                to="/numbers"
                className="group relative overflow-hidden rounded-xl gradient-primary p-3.5 text-left transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-10 place-items-center rounded-lg bg-white/20 backdrop-blur">
                      <Phone className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-white/80">GET STARTED</p>
                      <h3 className="text-lg font-bold text-white">Buy Numbers</h3>
                      <p className="text-[11px] text-white/90">US numbers for OTP verification</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-white transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Buy Logs Button */}
              <Link 
                to="/logs"
                className="group relative overflow-hidden rounded-xl bg-card border border-border p-3.5 text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/40"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                      <Package className="size-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">BROWSE & BUY</p>
                      <h3 className="text-lg font-bold text-foreground">Buy Logs</h3>
                      <p className="text-[11px] text-muted-foreground">Social media accounts</p>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Infinite auto-scroll marquee */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mt-16 w-full overflow-hidden"
          >
            {/* Edge fade masks */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-24" style={{ background: "linear-gradient(to right, var(--background), transparent)" }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-24" style={{ background: "linear-gradient(to left, var(--background), transparent)" }} />

            <style>{`
              @keyframes marquee-scroll {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee-scroll 28s linear infinite;
              }
              .marquee-track:hover {
                animation-play-state: paused;
              }
            `}</style>

            <div className="marquee-track gap-4" style={{ gap: "1rem" }}>
              {/* Render the list twice for seamless looping */}
              {[...heroShowcase, ...heroShowcase].map((n, i) => (
                <div
                  key={`${n.service}-${i}`}
                  className="glass rounded-2xl p-5 text-left shadow-md flex-shrink-0"
                  style={{ width: "clamp(200px, 45vw, 240px)", marginRight: "1rem" }}
                >
                  <div className="flex items-center justify-between">
                    <Flag code={n.code} />
                    <Badge variant="outline" className="text-xs">{n.tag}</Badge>
                  </div>
                  <p className="mt-3 font-semibold truncate">{n.service} Activation</p>
                  <p className="text-sm text-muted-foreground truncate">{n.country}</p>
                  <p className="mt-3 text-lg font-bold">${n.price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground"> / activation</span></p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="features-heading">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need in one place</h2>
          <p className="mt-4 text-muted-foreground">One marketplace for virtual numbers and premium social media logs, zero hassle.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Provider */}
      {/* <section id="providers" className="border-y border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Powered by
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {poweredBy.map((p) => (
              <span key={p} className="text-3xl font-extrabold text-foreground/80 tracking-tight">{p}</span>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Real numbers · Live stock · Real-time SMS delivery
          </p>
        </div>
      </section> */}

      <footer className="border-t border-border" role="contentinfo">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src={logo.url} alt="Hammzy Digitals logo" className="size-7 rounded-lg object-contain" />
            <span className="font-bold text-foreground">Hammzy Digitals</span>
          </div>
          <p>© 2026 Hammzy Digitals. Buy virtual phone numbers & social media logs in Nigeria.</p>
        </div>
      </footer>
    </div>
  );
}
