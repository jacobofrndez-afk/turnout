import { NextResponse } from "next/server";
import type { SocialProvider } from "../../lib/social-channels";
import { rateLimit } from "../guard";
import { ChannelError, channelOrigin, channelOriginAllowed } from "./config";
export const oauthCookie = (provider: SocialProvider) => `__Host-turnout-oauth-${provider}`;
export const privateCookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };
export function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export function accountRedirect(request: Request, merchant?: string, notice?: string, selection?: string) {
  const origin = channelOrigin() ?? new URL(request.url).origin;
  const url = new URL("/account", origin);
  if (merchant) url.searchParams.set("merchant", merchant);
  if (notice) url.searchParams.set("channelNotice", notice);
  if (selection) url.searchParams.set("channelSelection", selection);
  url.hash = "channels";
  return privateResponse(NextResponse.redirect(url, 303));
}
export function errorReason(error: unknown): string { return error instanceof ChannelError ? error.reason : "unavailable"; }
export function privatePostGuard(request: Request): NextResponse | null {
  const origin = channelOrigin();
  if (!origin) return privateResponse(NextResponse.json({ error: "Channel connections are not configured yet." }, { status: 503 }));
  if (!channelOriginAllowed(request, origin)) return privateResponse(NextResponse.json({ error: "Open Account at Turnout’s secure address to connect." }, { status: 403 }));
  const rate = rateLimit(request, "private-channels", 20, 60_000);
  if (!rate.ok) return privateResponse(NextResponse.json({ error: "Please wait a moment and try again." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterS) } }));
  return null;
}
export async function channelForm(request: Request): Promise<URLSearchParams> {
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw new ChannelError("invalid");
  if (Number(request.headers.get("content-length")) > 4096) throw new ChannelError("invalid");
  const reader = request.body?.getReader(); if (!reader) throw new ChannelError("invalid");
  let size = 0; const chunks: Uint8Array[] = [];
  while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 4096) { await reader.cancel(); throw new ChannelError("invalid"); } chunks.push(next.value); }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}
