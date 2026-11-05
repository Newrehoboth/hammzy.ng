import { Link } from "@tanstack/react-router";
import { MessageSquare, Phone as PhoneIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/flag";

// Generic display card for a phone number entry.
// Used for informational display — actual purchasing is handled in numbers.index.tsx
export interface NumberCardData {
  id: string;
  number: string;
  country: string;
  countryCode: string;
  service: string;
  provider: string;
  price: number;
  sms?: boolean;
  voice?: boolean;
}

export function NumberCard({ n }: { n: NumberCardData }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Flag code={n.countryCode} />
          <div>
            <p className="font-semibold leading-tight">{n.number}</p>
            <p className="text-xs text-muted-foreground">{n.country}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{n.service}</Badge>
        {n.sms && (
          <Badge variant="secondary" className="gap-1 text-emerald">
            <MessageSquare className="size-3" /> SMS
          </Badge>
        )}
        {n.voice && (
          <Badge variant="secondary" className="gap-1 text-accent">
            <PhoneIcon className="size-3" /> Voice
          </Badge>
        )}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xl font-bold">
          ${n.price.toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground"> / activation</span>
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link to="/numbers/$id" params={{ id: n.id }}>Details</Link>
        </Button>
      </div>
    </div>
  );
}