import { z } from "zod";
import type { SocialProvider } from "../../lib/social-channels";
import { ChannelError, redirectUri, type SocialConfig } from "./config";
import type { Candidate } from "./store";
const Id = z.string().regex(/^\d+$/);
const IdLike = z.union([Id, z.number().int().positive()]).transform(String);
const Token = z.string().min(1).max(8192);
const TokenResponse = z.object({ access_token: Token, expires_in: z.number().positive().optional() });
const IgShort = z.object({ access_token: Token, user_id: IdLike });
const Me = z.object({ id: Id, name: z.string().min(1).max(300) });
const IgMe = z.object({ user_id: IdLike, username: z.string().min(1).max(300) });
const Pages = z.object({ data: z.array(z.object({ id: Id, name: z.string().min(1).max(300), access_token: Token.optional() })).max(100), paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().max(1000).optional() }).optional() }).optional() });
const Permissions = z.object({ data: z.array(z.object({ permission: z.string(), status: z.string() })) });
type Fetch = typeof fetch;
// URLs are constructed here, never taken from Graph's paging.next or from browser input.
async function json(url: URL, fetcher: Fetch, init?: RequestInit): Promise<unknown> {
  try {
    const response = await fetcher(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (Number(response.headers.get("content-length")) > 2_000_000) throw new ChannelError("unavailable");
    const reader = response.body?.getReader();
    if (!reader) throw new ChannelError("unavailable");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw new ChannelError("unavailable"); }
      chunks.push(next.value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!response.ok || data.error) {
      if (data.error?.code === 190) throw new ChannelError("reconnect");
      if ([10, 200].includes(data.error?.code)) throw new ChannelError("permissions");
      throw new ChannelError("unavailable");
    }
    return data;
  } catch (error) { if (error instanceof ChannelError) throw error; throw new ChannelError("unavailable"); }
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ChannelError("unavailable");
  return result.data;
}
function graphUrl(provider: SocialProvider, config: SocialConfig, path: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.${provider === "instagram" ? "instagram" : "facebook"}.com/${config.version}/${path}`);
  url.search = new URLSearchParams(params).toString(); return url;
}
const bearer = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` } });
export function authorizationUrl(provider: SocialProvider, config: SocialConfig, state: string): string {
  const url = new URL(provider === "instagram" ? "https://www.instagram.com/oauth/authorize" : `https://www.facebook.com/${config.version}/dialog/oauth`);
  const params: Record<string, string> = { client_id: config.clientId, redirect_uri: redirectUri(provider, config), response_type: "code", state };
  if (provider === "instagram") params.scope = "instagram_business_basic";
  else { params.config_id = config.loginConfigId!; params.override_default_response_type = "true"; params.scope = "pages_show_list,pages_read_engagement"; }
  url.search = new URLSearchParams(params).toString(); return url.toString();
}
export async function exchangeAccounts(provider: SocialProvider, config: SocialConfig, code: string, fetcher: Fetch = fetch, now = Date.now()): Promise<{ subject: string; candidates: Candidate[] }> {
  if (provider === "instagram") {
    const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.secret, grant_type: "authorization_code", redirect_uri: redirectUri(provider, config), code });
    const shortData = await json(new URL("https://api.instagram.com/oauth/access_token"), fetcher, { method: "POST", body });
    const short = parse(z.union([IgShort, z.object({ data: z.tuple([IgShort]) }).transform(r => r.data[0])]), shortData);
    const url = new URL("https://graph.instagram.com/access_token");
    url.search = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: config.secret, access_token: short.access_token }).toString();
    const long = parse(TokenResponse, await json(url, fetcher));
    const me = parse(IgMe, await json(graphUrl(provider, config, "me", { fields: "user_id,username" }), fetcher, bearer(long.access_token)));
    if (me.user_id !== short.user_id) throw new ChannelError("invalid");
    return { subject: me.user_id, candidates: [{ id: me.user_id, name: me.username, username: me.username, token: long.access_token, expiresAt: long.expires_in ? now + long.expires_in * 1000 : null }] };
  }
  const shortUrl = graphUrl(provider, config, "oauth/access_token", { client_id: config.clientId, client_secret: config.secret, redirect_uri: redirectUri(provider, config), code });
  const short = parse(TokenResponse, await json(shortUrl, fetcher));
  const long = parse(TokenResponse, await json(graphUrl(provider, config, "oauth/access_token", { grant_type: "fb_exchange_token", client_id: config.clientId, client_secret: config.secret, fb_exchange_token: short.access_token }), fetcher));
  const me = parse(Me, await json(graphUrl(provider, config, "me", { fields: "id,name" }), fetcher, bearer(long.access_token)));
  const permissions = parse(Permissions, await json(graphUrl(provider, config, "me/permissions"), fetcher, bearer(long.access_token)));
  if (!["pages_show_list", "pages_read_engagement"].every(p => permissions.data.some(r => r.permission === p && r.status === "granted"))) throw new ChannelError("permissions");
  const candidates: Candidate[] = []; let after = ""; const seen = new Set<string>();
  for (let page = 0; page < 10; page++) {
    const data = parse(Pages, await json(graphUrl(provider, config, "me/accounts", { fields: "id,name,access_token", limit: "100", ...(after ? { after } : {}) }), fetcher, bearer(long.access_token)));
    for (const p of data.data) if (p.access_token && !candidates.some(c => c.id === p.id)) candidates.push({ id: p.id, name: p.name, token: p.access_token, expiresAt: long.expires_in ? now + long.expires_in * 1000 : null });
    if (!data.paging?.next) return { subject: me.id, candidates };
    const cursor = data.paging.cursors?.after;
    if (!cursor || seen.has(cursor)) throw new ChannelError("unavailable");
    seen.add(cursor); after = cursor;
  }
  throw new ChannelError("unavailable");
}
export async function verifyAccount(provider: SocialProvider, config: SocialConfig, account: { id: string; token: string }, fetcher: Fetch = fetch) {
  if (!/^\d+$/.test(account.id)) throw new ChannelError("invalid");
  const data = await json(graphUrl(provider, config, provider === "instagram" ? "me" : account.id, { fields: provider === "instagram" ? "user_id,username" : "id,name" }), fetcher, bearer(account.token));
  const id = provider === "instagram" ? parse(IgMe, data).user_id : parse(Me, data).id;
  if (id !== account.id) throw new ChannelError("reconnect");
}
