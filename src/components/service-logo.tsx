import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Comprehensive mapping of 5SIM/other service identifiers to their actual domains
export function getServiceDomain(serviceName?: string): string {
  const name = (serviceName || "").toLowerCase().trim();
  // Also normalize by removing spaces (so "google voice" → "googlevoice" matches)
  const nameNoSpaces = name.replace(/\s+/g, "");

  const mapping: Record<string, string> = {
    // --- Messaging / VOIP ---
    whatsapp: "whatsapp.com",
    telegram: "telegram.org",
    signal: "signal.org",
    viber: "viber.com",
    line: "line.me",
    wechat: "wechat.com",
    snapchat: "snapchat.com",
    skype: "skype.com",
    discord: "discord.com",
    textplus: "textplus.com",
    textnow: "textnow.com",
    talkatone: "talkatone.com",
    googlevoice: "voice.google.com",
    // --- Social Media ---
    instagram: "instagram.com",
    facebook: "facebook.com",
    twitter: "twitter.com",
    tiktok: "tiktok.com",
    youtube: "youtube.com",
    linkedin: "linkedin.com",
    reddit: "reddit.com",
    pinterest: "pinterest.com",
    twitch: "twitch.tv",
    weibo: "weibo.com",
    vk: "vk.com",
    okru: "ok.ru",
    tinder: "tinder.com",
    // --- Google ---
    google: "google.com",
    gmail: "google.com",
    // --- Microsoft ---
    microsoft: "microsoft.com",
    outlook: "outlook.com",
    outlooks: "outlook.com",
    hotmail: "outlook.com",
    xbox: "xbox.com",
    // --- Apple ---
    apple: "apple.com",
    icloud: "apple.com",
    // --- Email ---
    yahoo: "yahoo.com",
    protonmail: "proton.me",
    proton: "proton.me",
    yandex: "yandex.ru",
    mailru: "mail.ru",
    zoho: "zoho.com",
    // --- Streaming ---
    netflix: "netflix.com",
    spotify: "spotify.com",
    // --- eCommerce ---
    amazon: "amazon.com",
    ebay: "ebay.com",
    aliexpress: "aliexpress.com",
    alibaba: "alibaba.com",
    taobao: "taobao.com",
    shopify: "shopify.com",
    airbnb: "airbnb.com",
    paypal: "paypal.com",
    // --- Productivity ---
    zoom: "zoom.us",
    slack: "slack.com",
    notion: "notion.so",
    trello: "trello.com",
    dropbox: "dropbox.com",
    github: "github.com",
    // --- Games ---
    steam: "steampowered.com",
    roblox: "roblox.com",
    epicgames: "epicgames.com",
    ubisoft: "ubisoft.com",
    blizzard: "blizzard.com",
    riotgames: "riotgames.com",
    garena: "garena.com",
    supercell: "supercell.com",
    activision: "activision.com",
    playstation: "playstation.com",
    nintendo: "nintendo.com",
    // --- Tech ---
    openai: "openai.com",
    chatgpt: "openai.com",
    uber: "uber.com",
    stripe: "stripe.com",
    adobe: "adobe.com",
    cloudflare: "cloudflare.com",
    samsung: "samsung.com",
    huawei: "huawei.com",
    xiaomi: "xiaomi.com",
    // --- Proxy/VPN ---
    "9proxy": "9proxy.com",
    vpn: "nordvpn.com",
    expressvpn: "expressvpn.com",
    hmevpn: "nordvpn.com",
    // --- Texting Apps ---
    "usa texting app": "textnow.com",
    "usatextingapp": "textnow.com",
    nextplus: "nextplus.me",
    // --- General ---
    email: "gmail.com",
    mail: "gmail.com",
    // --- Short aliases (checked last via word-boundary to avoid false matches) ---
    tg: "telegram.org",
    ig: "instagram.com",
    fb: "facebook.com",
    x: "x.com",
  };

  // Sort by key length descending — longer/more specific keys matched first
  const sortedEntries = Object.entries(mapping).sort(([a], [b]) => b.length - a.length);

  for (const [key, domain] of sortedEntries) {
    // Short keys (≤2 chars): use word boundary to avoid matching inside words like "textplus"
    if (key.length <= 2) {
      if (name === key || new RegExp(`\\b${key}\\b`).test(name)) return domain;
    } else {
      // Also check space-removed name so "google voice" matches "googlevoice"
      if (name.includes(key) || nameNoSpaces.includes(key)) return domain;
    }
  }

  // Fallback: construct domain from name
  return `${nameNoSpaces.replace(/[^a-z0-9]/g, "") || name.replace(/[^a-z0-9]/g, "")}.com`;
}

function getServiceGradient(name?: string) {
  const hash = Array.from(name || "").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    "from-pink-500 to-rose-500",
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-sky-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-violet-500 to-fuchsia-500",
    "from-cyan-500 to-blue-500",
  ];
  return colors[hash % colors.length];
}

interface ServiceLogoProps {
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ServiceLogo({ name, className, size = "md" }: ServiceLogoProps) {
  const domain = getServiceDomain(name || "default");
  
  // Special case: Google Voice uses a direct logo URL (Clearbit doesn't have it)
  const nameNormalized = (name || "").toLowerCase().replace(/\s+/g, "");
  const isGoogleVoice = nameNormalized.includes("googlevoice") || nameNormalized === "googlevoice";
  
  // Try Clearbit first (unless it's Google Voice)
  const primarySrc = isGoogleVoice 
    ? "https://images.seeklogo.com/logo-png/40/1/google-voice-logo-png_seeklogo-400840.png"
    : `https://logo.clearbit.com/${domain}`;
  // Fallback to Google Favicon service (sz=128 for high quality)
  const secondarySrc = `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;

  const [imgSrc, setImgSrc] = useState<string | null>(primarySrc);
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  const [hasFailedTwice, setHasFailedTwice] = useState(false);

  // Reset states if service name changes
  useEffect(() => {
    const nameCheck = (name || "").toLowerCase().replace(/\s+/g, "");
    const isGV = nameCheck.includes("googlevoice") || nameCheck === "googlevoice";
    const newPrimarySrc = isGV
      ? "https://images.seeklogo.com/logo-png/40/1/google-voice-logo-png_seeklogo-400840.png"
      : `https://logo.clearbit.com/${getServiceDomain(name)}`;
    setImgSrc(newPrimarySrc);
    setHasFailedOnce(false);
    setHasFailedTwice(false);
  }, [name]);

  const handleError = () => {
    if (!hasFailedOnce) {
      setHasFailedOnce(true);
      setImgSrc(secondarySrc);
    } else {
      setHasFailedTwice(true);
      setImgSrc(null);
    }
  };

  const sizeClasses = {
    sm: "size-7 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-lg",
  };

  const initial = (name || "default").trim().charAt(0).toUpperCase() || "?";

  if (hasFailedTwice || !imgSrc) {
    const gradient = getServiceGradient(name);
    return (
      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br shadow-inner uppercase border border-white/10 select-none",
          gradient,
          sizeClasses[size],
          className
        )}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={`${name} logo`}
      onError={handleError}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-full object-cover bg-white ring-1 ring-border shadow-sm",
        sizeClasses[size],
        className
      )}
    />
  );
}
