// Platforms available for the logs marketplace.
export const LOG_PLATFORMS = [
  "Instagram",
  "Facebook",
  "TikTok",
  "X",
  "LinkedIn",
  "Google Voice",
  "Snapchat",
  "VPN",
  "YouTube",
  "Email",
  "Other Platforms",
] as const;

// Platforms where a "followers" count makes sense (shows the followers field in admin).
export const FOLLOWER_PLATFORMS = new Set([
  "Instagram",
  "Facebook",
  "TikTok",
  "X",
  "YouTube",
  "LinkedIn",
]);

export function platformHasFollowers(platform: string): boolean {
  return FOLLOWER_PLATFORMS.has(platform);
}