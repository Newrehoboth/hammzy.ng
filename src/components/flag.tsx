import { cn } from "@/lib/utils";

export function Flag({
  code,
  className,
}: {
  code?: string;
  className?: string;
}) {
  const cc = (code || "").toLowerCase();
  if (!cc) {
    return <div className={cn("size-8 bg-muted rounded-full shrink-0", className)} />;
  }
  return (
    <img
      src={`https://flagcdn.com/w80/${cc}.png`}
      srcSet={`https://flagcdn.com/w160/${cc}.png 2x`}
      alt={`${code || "unknown"} flag`}
      loading="lazy"
      className={cn(
        "size-8 shrink-0 rounded-full object-cover ring-1 ring-border",
        className,
      )}
    />
  );
}
