import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { getDb } from "../src/server/db/client";
import { ChannelStore, SESSION_COOKIE } from "../src/server/social/store";
import { oauthCookie } from "../src/server/social/http";
import { GET as listChannels } from "../src/app/api/channels/route";
import { POST as start } from "../src/app/api/channels/[provider]/start/route";
import { GET as callback } from "../src/app/api/channels/[provider]/callback/route";
import { POST as manage } from "../src/app/api/channels/manage/route";
mkdirSync(".tmp", { recursive: true });
const directory = mkdtempSync(resolve(".tmp/social-routes-test-"));
process.env.DATABASE_PATH = resolve(directory, "test.db");
process.env.TURNOUT_PUBLIC_URL = "https://turnout.example";
process.env.CHANNEL_TOKEN_KEY = "ab".repeat(32);
process.env.INSTAGRAM_APP_ID = "123"; process.env.INSTAGRAM_APP_SECRET = "private-app-secret";
const db = getDb(), store = new ChannelStore(db), origin = "https://turnout.example";
for (const id of ["one", "two"]) db.prepare("INSERT INTO merchants(id,name,kind,lat,lon,city) VALUES(?,?,'bar',0,0,'Test')").run(id, id);
after(() => { db.close(); rmSync(directory, { recursive: true, force: true }); });
const context = { params: Promise.resolve({ provider: "instagram" }) };
function post(path: string, values: Record<string, string>, cookie = "", source = origin) {
  return new NextRequest(`${origin}${path}`, { method: "POST", headers: { origin: source, cookie }, body: new URLSearchParams(values) });
}
function redirectValue(response: Response, key: string) { return new URL(response.headers.get("location")!).searchParams.get(key); }
test("Configured route completes private consent → choice → connection; other place and anonymous requests cannot claim it", async () => {
  const initial = await start(post("/api/channels/instagram/start", { merchant: "one" }), context);
  assert.equal(initial.status, 303);
  const authUrl = new URL(initial.headers.get("location")!);
  assert.equal(authUrl.hostname, "www.instagram.com"); assert.ok(!authUrl.href.includes("private-app-secret"));
  const binding = initial.cookies.get(oauthCookie("instagram"))!;
  const cookie = `${binding.name}=${binding.value}`;
  const callbackUrl = `${origin}/api/channels/instagram/callback?state=${authUrl.searchParams.get("state")}&code=test-code`;
  const responses = [{ access_token: "short-private", user_id: "100" }, { access_token: "long-private", expires_in: 3600 }, { user_id: "100", username: "testplace" }];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { assert.ok(responses.length); return Response.json(responses.shift()); };
  let result;
  try { result = await callback(new NextRequest(callbackUrl, { headers: { cookie } }), context); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal(result.status, 303); assert.equal(result.headers.get("cache-control"), "no-store, private"); assert.equal(result.headers.get("referrer-policy"), "no-referrer");
  assert.equal(redirectValue(result, "merchant"), "one"); const selection = redirectValue(result, "channelSelection")!; assert.ok(selection);
  const session = result.cookies.get(SESSION_COOKIE)!, owner = store.owner(session.value)!;
  assert.ok(session.httpOnly); assert.ok(session.secure); assert.equal(session.sameSite, "lax");
  const privateCookie = `${SESSION_COOKIE}=${session.value}`;
  assert.deepEqual(store.list(owner, "one"), []); // authorization alone is not selection
  const anonymous = await manage(post("/api/channels/manage", { action: "select", merchant: "one", selection, account: "100" }));
  assert.equal(redirectValue(anonymous, "channelNotice"), "session");
  const wrongPlace = await manage(post("/api/channels/manage", { action: "select", merchant: "two", selection, account: "100" }, privateCookie));
  assert.equal(redirectValue(wrongPlace, "channelNotice"), "expired");
  const selected = await manage(post("/api/channels/manage", { action: "select", merchant: "one", selection, account: "100" }, privateCookie));
  assert.equal(redirectValue(selected, "channelNotice"), "connected"); assert.equal(store.list(owner, "one")[0].username, "testplace"); assert.deepEqual(store.list(owner, "two"), []);
  assert.ok(!JSON.stringify([...result.headers]).includes("long-private"));
  const own = await listChannels(new NextRequest(`${origin}/api/channels?merchant=one`, {headers:{cookie:privateCookie}}));
  assert.equal(own.headers.get("cache-control"), "no-store, private"); assert.equal(own.headers.get("vary"), "Cookie");
  const ownData = await own.json(); assert.equal(ownData.accounts[0].username, "testplace"); assert.ok(!JSON.stringify(ownData).includes("long-private"));
  for(const [place,header] of [["two",privateCookie],["one",""]]) {
    const other = await listChannels(new NextRequest(`${origin}/api/channels?merchant=${place}`, {headers:{cookie:header}})); assert.deepEqual((await other.json()).accounts, []);
  }
  const foreign = await listChannels(new NextRequest(`${origin}/api/channels?merchant=one`, {headers:{cookie:privateCookie,"sec-fetch-site":"cross-site"}})); assert.equal(foreign.status,403);
  const replay = await callback(new NextRequest(callbackUrl, { headers: { cookie } }), context);
  assert.equal(redirectValue(replay, "channelNotice"), "expired");
  const deniedDisconnect = await manage(post("/api/channels/manage", { action: "disconnect", merchant: "one", provider: "instagram" }, privateCookie, "https://attacker.example"));
  assert.equal(deniedDisconnect.status, 403); assert.equal(store.list(owner, "one").length, 1);
  // Removing configuration must not trap a user with a connected account.
  delete process.env.INSTAGRAM_APP_SECRET;
  const disconnected = await manage(post("/api/channels/manage", { action: "disconnect", merchant: "one", provider: "instagram" }, privateCookie));
  assert.equal(redirectValue(disconnected, "channelNotice"), "disconnected"); assert.deepEqual(store.list(owner, "one"), []);
  process.env.INSTAGRAM_APP_SECRET = "private-app-secret";
  const signedout = await manage(post("/api/channels/manage", { action: "signout", merchant: "one" }, privateCookie));
  assert.equal(redirectValue(signedout, "channelNotice"), "signedout"); assert.equal(store.owner(session.value), null);
});
test("Denied provider consent consumes the request without creating an owner or storing account data", async () => {
  const initial = await start(post("/api/channels/instagram/start", { merchant: "two" }), context);
  const state = new URL(initial.headers.get("location")!).searchParams.get("state");
  const binding = initial.cookies.get(oauthCookie("instagram"))!;
  const cookie = `${binding.name}=${binding.value}`;
  const response = await callback(new NextRequest(`${origin}/api/channels/instagram/callback?state=${state}&error=access_denied&error_description=do-not-echo`, { headers: { cookie } }), context);
  assert.equal(redirectValue(response, "channelNotice"), "denied"); assert.equal(redirectValue(response, "merchant"), "two"); assert.ok(!response.headers.get("location")!.includes("do-not-echo"));
  assert.equal(response.cookies.get(SESSION_COOKIE), undefined);
  assert.equal((db.prepare("SELECT count(*) n FROM channel_pending").get() as {n:number}).n, 0);
});
test("Private routes fail closed when unconfigured, cross-origin or given unknown places", async () => {
  const forbidden = await start(post("/api/channels/instagram/start", { merchant: "one" }, "", "https://attacker.example"), context); assert.equal(forbidden.status, 403);
  const invalid = await start(post("/api/channels/instagram/start", { merchant: "missing" }), context); assert.equal(redirectValue(invalid, "channelNotice"), "invalid");
  delete process.env.TURNOUT_PUBLIC_URL;
  const unavailable = await start(post("/api/channels/instagram/start", { merchant: "one" }), context); assert.equal(unavailable.status, 503);
});
