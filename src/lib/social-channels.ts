export const SOCIAL_PROVIDERS = ["instagram", "facebook"] as const;
export type SocialProvider = typeof SOCIAL_PROVIDERS[number];
export const SOCIAL_LABELS: Record<SocialProvider, string> = { instagram: "Instagram", facebook: "Facebook" };
export function isSocialProvider(value: unknown): value is SocialProvider {
  return value === "instagram" || value === "facebook";
}
export type ChannelAccount = {
  provider: SocialProvider; externalId: string; name: string; username?: string;
  status: "connected" | "reconnect"; checkedAt: number; expiresAt: number | null;
};
export type ChannelChoice = { id: string; name: string; username?: string };
export type ChannelSelection = { id: string; provider: SocialProvider; choices: ChannelChoice[] };
export const CHANNEL_NOTICES: Record<string, string> = {
  connected: "Your account is connected. Publishing is still manual; nothing has been posted.",
  disconnected: "Disconnected from Turnout. Your posts are unchanged. You can also remove Turnout in your Meta account settings.",
  checked: "Connection checked. Your account is available.",
  reconnect: "Access has expired or was removed. Reconnect to restore access.",
  cancelled: "Connection cancelled. Your existing channels are unchanged.",
  expired: "This connection request has expired. Please start again.",
  denied: "Access was not granted. You can try again whenever you are ready.",
  empty: "No eligible account was returned. Instagram needs a professional account; Facebook needs a Page you manage.",
  permissions: "The required account access was not granted. Try again and allow access to the account you want to connect.",
  unavailable: "We could not reach Meta. Please try again. Your existing connection has been kept.",
  setup: "Connections are waiting for Turnout’s Meta setup. No account has been connected.",
  session: "Please connect again to open your private channel session.",
  conflict: "This account belongs to another private channel session. Sign out, then reconnect with that account.",
  signedout: "Signed out of your private channels. Connect the same account to find them again.",
  invalid: "This request could not be verified. Return to Account and try again.",
};
