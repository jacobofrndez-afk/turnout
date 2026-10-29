import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { ChannelStore, seal, unseal } from "../src/server/social/store";
import { ChannelError, channelOriginAllowed, socialConfig, type SocialConfig } from "../src/server/social/config";
import { authorizationUrl, exchangeAccounts, verifyAccount } from "../src/server/social/meta";
import { channelForm } from "../src/server/social/http";
const key = Buffer.alloc(32, 7);
const config: SocialConfig = { origin: "https://turnout.example", key, version: "v25.0", clientId: "123", secret: "test-app-secret", loginConfigId: "456" };
const candidate = { id: "12345", name: "Test place", username: "testplace", token: "private-test-token", expiresAt: 200_000 };
function fixture() {
  const db = new Database(":memory:"); db.exec(readFileSync("src/server/db/schema.sql", "utf8"));
  db.prepare("INSERT INTO merchants(id,name,kind,lat,lon,city) VALUES(?,?, 'bar',0,0,'Test')").run("one", "One");
  db.prepare("INSERT INTO merchants(id,name,kind,lat,lon,city) VALUES(?,?, 'bar',0,0,'Test')").run("two", "Two");
  let now = 10_000; const store = new ChannelStore(db, () => now);
  return { db, store, advance: (ms: number) => { now += ms; } };
}
function mockFetch(values: unknown[], inspect?: (url: URL, init?: RequestInit, index?: number) => void): typeof fetch {
  let index = 0;
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input)); inspect?.(url, init, index);
    assert.ok(index < values.length, "unexpected provider call");
    const value = values[index++]; return value instanceof Response ? value : Response.json(value);
  }) as typeof fetch;
}
test("OAuth state is bound to browser, provider, session and merchant; one use only", () => {
  const { db, store } = fixture();
  try {
    const state = store.start("instagram", "one");
    assert.throws(() => store.consume(state.state, randomBytes(32).toString("base64url"), "instagram"), /expired/);
    assert.throws(() => store.consume(state.state, state.browser, "facebook"), /expired/);
    const auth = store.authenticate("facebook", "55", null);
    assert.throws(() => store.consume(state.state, state.browser, "instagram", auth.session), /expired/);
    assert.equal(store.consume(state.state, state.browser, "instagram").merchant_id, "one");
    assert.throws(() => store.consume(state.state, state.browser, "instagram"), /expired/);
    const state2 = store.start("facebook", "two", auth.session);
    assert.throws(() => store.consume(state2.state, state2.browser, "facebook"), /expired/);
    assert.equal(store.consume(state2.state, state2.browser, "facebook", auth.session).owner_id, auth.owner);
  } finally { db.close(); }
});
test("Expired OAuth requests cannot be resumed", () => {
  const { db, store, advance } = fixture();
  try { const state = store.start("facebook", "one"); advance(601_000); assert.throws(() => store.consume(state.state, state.browser, "facebook"), /expired/); store.cleanup(); assert.equal((db.prepare("SELECT count(*) n FROM channel_oauth_states").get() as {n:number}).n, 0); } finally { db.close(); }
});
test("Access tokens stay encrypted and scoped to private owner and place", () => {
  const { db, store } = fixture();
  try {
    const a = store.authenticate("instagram", "1", null), b = store.authenticate("instagram", "2", null);
    const selection = store.createSelection(a.owner, "one", "instagram", [candidate], key);
    assert.ok(!JSON.stringify(store.selection(a.owner, "one", selection, key)).includes(candidate.token));
    assert.throws(() => store.selection(b.owner, "one", selection, key), /expired/);
    assert.throws(() => store.select(a.owner, "two", selection, candidate.id, key), /expired/);
    assert.throws(() => store.select(a.owner, "one", selection, "attacker-account", key), /invalid/);
    assert.ok(!JSON.stringify(db.prepare("SELECT * FROM channel_pending").all()).includes(candidate.token));
    store.select(a.owner, "one", selection, candidate.id, key);
    assert.equal(store.credential(a.owner, "one", "instagram", key).token, candidate.token);
    assert.deepEqual(store.list(b.owner, "one"), []); assert.deepEqual(store.list(a.owner, "two"), []); assert.deepEqual(store.list(null, "one"), []);
    assert.throws(() => store.credential(b.owner, "one", "instagram", key), /session/);
    assert.ok(!JSON.stringify(store.list(a.owner, "one")).includes(candidate.token));
    assert.ok(!JSON.stringify(db.prepare("SELECT * FROM channel_connections").all()).includes(candidate.token));
    assert.throws(() => store.select(a.owner, "one", selection, candidate.id, key), /expired/);
  } finally { db.close(); }
});
test("Encryption rejects tampering, key changes and credential relocation", () => {
  const value = seal("token", key, "owner:place:provider");
  assert.equal(unseal(value, key, "owner:place:provider"), "token");
  assert.throws(() => unseal(value, key, "other:place:provider"), /reconnect/);
  assert.throws(() => unseal(value, Buffer.alloc(32, 3), "owner:place:provider"), /reconnect/);
  const bits = value.split("."); bits[2] = Buffer.from("bad").toString("base64url");
  assert.throws(() => unseal(bits.join("."), key, "owner:place:provider"), /reconnect/);
});
test("Session rotation, linked identities and sign-out do not merge other owners", () => {
  const { db, store } = fixture();
  try {
    const a = store.authenticate("instagram", "1", null), b = store.authenticate("facebook", "2", null);
    assert.throws(() => store.authenticate("facebook", "2", a.owner, a.session), /conflict/);
    const linked = store.authenticate("facebook", "3", a.owner, a.session);
    assert.equal(linked.owner, a.owner); assert.equal(store.owner(a.session), null);
    assert.equal(store.authenticate("instagram", "1", null).owner, a.owner);
    assert.equal(store.owner(b.session), b.owner);
    const state = store.start("instagram", "one", linked.session);
    const pending = store.createSelection(a.owner, "one", "instagram", [candidate], key);
    store.signout(linked.session);
    assert.equal(store.owner(linked.session), null);
    assert.throws(() => store.authenticate("instagram", "1", a.owner, linked.session), /session/);
    assert.throws(() => store.consume(state.state, state.browser, "instagram", linked.session), /expired/);
    assert.throws(() => store.selection(a.owner, "one", pending, key), /expired/);
  } finally { db.close(); }
});
test("Cancel and failed replacement keep the current account; expiry requests reconnect", () => {
  const { db, store, advance } = fixture();
  try {
    const a = store.authenticate("instagram", "1", null);
    const save = () => { const id = store.createSelection(a.owner, "one", "instagram", [candidate], key); store.select(a.owner, "one", id, candidate.id, key); };
    save(); const revision = store.credential(a.owner, "one", "instagram", key).revision;
    const pending = store.createSelection(a.owner, "one", "instagram", [{ ...candidate, id: "999" }], key);
    store.cancel(a.owner, "one", pending); assert.equal(store.list(a.owner, "one")[0].externalId, candidate.id);
    save(); store.checked(a.owner, "one", "instagram", revision, false); // stale response cannot revoke a fresh token
    assert.equal(store.list(a.owner, "one")[0].status, "connected");
    const current = store.credential(a.owner, "one", "instagram", key);
    store.checked(a.owner, "one", "instagram", current.revision, false); assert.equal(store.list(a.owner, "one")[0].status, "reconnect");
    store.checked(a.owner, "one", "instagram", current.revision, true);
    advance(200_000); assert.equal(store.list(a.owner, "one")[0].status, "reconnect"); assert.throws(() => store.credential(a.owner, "one", "instagram", key), /reconnect/);
    store.disconnect(a.owner, "one", "instagram"); assert.deepEqual(store.list(a.owner, "one"), []);
    assert.equal((db.prepare("SELECT count(*) n FROM channel_connections").get() as { n: number }).n, 0);
  } finally { db.close(); }
});
test("Connection config requires secure origin, a valid key and provider credentials", () => {
  const env = { TURNOUT_PUBLIC_URL: "https://turnout.example", CHANNEL_TOKEN_KEY: key.toString("hex"), INSTAGRAM_APP_ID: "123", INSTAGRAM_APP_SECRET: "secret" };
  assert.ok(socialConfig("instagram", env)); assert.equal(socialConfig("facebook", env), null);
  for (const value of ["http://localhost:3103", "https://turnout.example/path", "https://user:secret@turnout.example", "https://turnout.example/?q=1"]) assert.equal(socialConfig("instagram", { ...env, TURNOUT_PUBLIC_URL: value }), null);
  assert.equal(socialConfig("instagram", { ...env, CHANNEL_TOKEN_KEY: "short" }), null);
  assert.ok(channelOriginAllowed(new Request(config.origin, { headers: { origin: config.origin } }), config.origin));
  for (const headers of [{}, { origin: "https://attacker.example" }, { origin: config.origin, "sec-fetch-site": "cross-site" }]) assert.equal(channelOriginAllowed(new Request(config.origin, { headers: headers as Record<string, string> }), config.origin), false);
  const ig = new URL(authorizationUrl("instagram", config, "state")), fb = new URL(authorizationUrl("facebook", config, "state"));
  assert.equal(ig.searchParams.get("scope"), "instagram_business_basic"); assert.equal(fb.searchParams.get("config_id"), config.loginConfigId);
  assert.equal(ig.searchParams.get("redirect_uri"), `${config.origin}/api/channels/instagram/callback`);
  assert.ok(!ig.toString().includes(config.secret)); assert.ok(!fb.searchParams.get("scope")?.includes("publish"));
});
test("Instagram exchanges tokens on the server and verifies the authorized identity", async () => {
  const responses = [{ access_token: "short", user_id: "111" }, { access_token: "long-private", expires_in: 3600 }, { user_id: "111", username: "place" }];
  const result = await exchangeAccounts("instagram", config, "auth-code", mockFetch(responses, (url, init, i) => {
    assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store");
    if (i === 0) { assert.equal(url.hostname, "api.instagram.com"); assert.equal(init?.method, "POST"); assert.equal((init?.body as URLSearchParams).get("code"), "auth-code"); }
    if (i === 2) assert.deepEqual(init?.headers, { Authorization: "Bearer long-private" });
  }), 1000);
  assert.equal(result.subject, "111"); assert.equal(result.candidates[0].expiresAt, 3_601_000);
  await assert.rejects(() => exchangeAccounts("instagram", config, "code", mockFetch([...responses.slice(0, 2), { user_id: "222", username: "wrong" }])), /invalid/);
});
test("Facebook lists managed Pages using cursors without following external pagination URLs", async () => {
  const result = await exchangeAccounts("facebook", config, "code", mockFetch([
    { access_token: "short" }, { access_token: "long", expires_in: 5000 }, { id: "1", name: "Owner" },
    { data: [{ permission: "pages_show_list", status: "granted" }, { permission: "pages_read_engagement", status: "granted" }] },
    { data: [{ id: "10", name: "One", access_token: "page-private" }], paging: { next: "https://attacker.example/steal", cursors: { after: "cursor" } } },
    { data: [{ id: "20", name: "Two", access_token: "page-two" }, { id: "30", name: "No access" }] },
  ], (url, init, i) => { assert.equal(url.hostname, "graph.facebook.com"); if (i === 5) assert.equal(url.searchParams.get("after"), "cursor"); }));
  assert.deepEqual(result.candidates.map(c => c.id), ["10", "20"]);
  await assert.rejects(() => exchangeAccounts("facebook", config, "code", mockFetch([{ access_token: "s" }, { access_token: "l" }, { id: "1", name: "Owner" }, { data: [{ permission: "pages_show_list", status: "declined" }] }])), /permissions/);
});
test("Revoked access is distinct from outages and provider details never surface", async () => {
  await assert.rejects(() => verifyAccount("instagram", config, { id: "1", token: "private" }, mockFetch([Response.json({ error: { code: 190, message: "secret diagnostic" } }, { status: 400 })])), (e: unknown) => e instanceof ChannelError && e.reason === "reconnect" && !e.message.includes("secret"));
  await assert.rejects(() => verifyAccount("facebook", config, { id: "1", token: "private" }, mockFetch([Response.json({ error: { message: "upstream secret" } }, { status: 503 })])), /unavailable/);
  await assert.rejects(() => verifyAccount("facebook", config, { id: "1", token: "private" }, mockFetch([{ id: "2", name: "Wrong page" }])), /reconnect/);
});
test("Private form input rejects oversized streaming requests and non-form bodies", async () => {
  const good = await channelForm(new Request(config.origin, { method: "POST", body: new URLSearchParams({ merchant: "one" }) })); assert.equal(good.get("merchant"), "one");
  await assert.rejects(() => channelForm(new Request(config.origin, { method: "POST", body: JSON.stringify({ action: "disconnect" }), headers: { "content-type": "application/json" } })), /invalid/);
  await assert.rejects(() => channelForm(new Request(config.origin, { method: "POST", body: new URLSearchParams({ merchant: "x".repeat(5000) }) })), /invalid/);
});
