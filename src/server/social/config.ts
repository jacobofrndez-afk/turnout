import type { SocialProvider } from "../../lib/social-channels";
export class ChannelError extends Error {
  constructor(public readonly reason: string) { super(reason); }
}
export type SocialConfig = { origin: string; key: Buffer; version: string; clientId: string; secret: string; loginConfigId?: string };
export function channelOrigin(env: Record<string, string | undefined> = process.env): string | null {
  try {
    const url = new URL(env.TURNOUT_PUBLIC_URL ?? "");
    return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}
export function socialConfig(provider: SocialProvider, env: Record<string, string | undefined> = process.env): SocialConfig | null {
  try {
    const origin = new URL(env.TURNOUT_PUBLIC_URL ?? "");
    if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password) return null;
    if (!/^[a-f0-9]{64}$/i.test(env.CHANNEL_TOKEN_KEY ?? "")) return null;
    const version = env.META_GRAPH_VERSION ?? "v25.0";
    if (!/^v\d{2}\.0$/.test(version)) return null;
    const clientId = provider === "instagram" ? env.INSTAGRAM_APP_ID : env.META_APP_ID;
    const secret = provider === "instagram" ? env.INSTAGRAM_APP_SECRET : env.META_APP_SECRET;
    if (!clientId || !/^\d+$/.test(clientId) || !secret || (provider === "facebook" && !/^\d+$/.test(env.META_LOGIN_CONFIG_ID ?? ""))) return null;
    return { origin: origin.origin, key: Buffer.from(env.CHANNEL_TOKEN_KEY!, "hex"), version, clientId, secret, loginConfigId: env.META_LOGIN_CONFIG_ID };
  } catch { return null; }
}
export function tokenKey(): Buffer {
  if (!/^[a-f0-9]{64}$/i.test(process.env.CHANNEL_TOKEN_KEY ?? "")) throw new ChannelError("setup");
  return Buffer.from(process.env.CHANNEL_TOKEN_KEY!, "hex");
}
export function redirectUri(provider: SocialProvider, config: SocialConfig) {
  return `${config.origin}/api/channels/${provider}/callback`;
}
// All private mutations require an explicit, canonical Origin. A merchant cookie is not authentication.
export function channelOriginAllowed(request: Request, origin: string): boolean {
  return request.headers.get("origin") === origin && request.headers.get("sec-fetch-site") !== "cross-site";
}
