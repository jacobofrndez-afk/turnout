import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Db } from "../db/client";
import type { ChannelAccount, ChannelSelection, SocialProvider } from "../../lib/social-channels";
import { ChannelError } from "./config";
export const SESSION_COOKIE = "__Host-turnout-channels";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
const random = () => randomBytes(32).toString("base64url");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const validSecret = (value: string | undefined): value is string => !!value && /^[A-Za-z0-9_-]{43}$/.test(value);
export type Candidate = { id: string; name: string; username?: string; token: string; expiresAt: number | null };
export type OAuthState = { provider: SocialProvider; merchant_id: string; session_hash: string | null; owner_id: string | null };
type ConnectionRow = { provider: SocialProvider; external_id: string; name: string; username: string | null; token_cipher: string; expires_at: number | null; checked_at: number; status: "connected" | "reconnect"; revision: string };

export function seal(value: unknown, key: Buffer, context: string): string {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString("base64url")).join(".");
}
export function unseal<T>(value: string, key: Buffer, context: string): T {
  try {
    const [iv, tag, encrypted] = value.split(".").map(s => Buffer.from(s, "base64url"));
    const cipher = createDecipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(context)); cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8")) as T;
  } catch { throw new ChannelError("reconnect"); }
}
export class ChannelStore {
  constructor(private db: Db, private now = () => Date.now()) {}
  cleanup() {
    const now = this.now();
    for (const table of ["channel_sessions", "channel_oauth_states", "channel_pending"]) this.db.prepare(`DELETE FROM ${table} WHERE expires_at <= ?`).run(now);
  }
  owner(session?: string): string | null {
    if (!validSecret(session)) return null;
    return (this.db.prepare("SELECT owner_id FROM channel_sessions WHERE token_hash = ? AND expires_at > ?").get(hash(session), this.now()) as { owner_id: string } | undefined)?.owner_id ?? null;
  }
  start(provider: SocialProvider, merchant: string, session?: string) {
    this.cleanup();
    const state = random(), browser = random(), owner = this.owner(session);
    this.db.prepare("INSERT INTO channel_oauth_states(state_hash,browser_hash,provider,merchant_id,session_hash,owner_id,expires_at) VALUES(?,?,?,?,?,?,?)")
      .run(hash(state), hash(browser), provider, merchant, owner ? hash(session!) : null, owner, this.now() + 600_000);
    return { state, browser };
  }
  consume(state: string | undefined, browser: string | undefined, provider: SocialProvider, session?: string): OAuthState {
    if (!validSecret(state) || !validSecret(browser)) throw new ChannelError("expired");
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT provider,merchant_id,session_hash,owner_id FROM channel_oauth_states WHERE state_hash=? AND browser_hash=? AND provider=? AND expires_at>?").get(hash(state), hash(browser), provider, this.now()) as OAuthState | undefined;
      if (!row || row.session_hash !== (this.owner(session) ? hash(session!) : null)) throw new ChannelError("expired");
      this.db.prepare("DELETE FROM channel_oauth_states WHERE state_hash=?").run(hash(state));
      return row;
    })();
  }
  authenticate(provider: SocialProvider, subject: string, expectedOwner: string | null, oldSession?: string) {
    return this.db.transaction(() => {
      if (expectedOwner !== this.owner(oldSession)) throw new ChannelError("session");
      const identity = this.db.prepare("SELECT owner_id FROM channel_identities WHERE provider=? AND subject_id=?").get(provider, subject) as { owner_id: string } | undefined;
      if (identity && expectedOwner && identity.owner_id !== expectedOwner) throw new ChannelError("conflict");
      const owner = expectedOwner ?? identity?.owner_id ?? random();
      this.db.prepare("INSERT OR IGNORE INTO channel_identities(provider,subject_id,owner_id) VALUES(?,?,?)").run(provider, subject, owner);
      const session = random();
      this.db.prepare("INSERT INTO channel_sessions(token_hash,owner_id,expires_at) VALUES(?,?,?)").run(hash(session), owner, this.now() + SESSION_SECONDS * 1000);
      if (oldSession) this.db.prepare("DELETE FROM channel_sessions WHERE token_hash=?").run(hash(oldSession));
      return { owner, session };
    })();
  }
  createSelection(owner: string, merchant: string, provider: SocialProvider, candidates: Candidate[], key: Buffer): string {
    const id = random();
    this.db.prepare("DELETE FROM channel_pending WHERE owner_id=? AND merchant_id=? AND provider=?").run(owner, merchant, provider);
    this.db.prepare("INSERT INTO channel_pending(id,owner_id,merchant_id,provider,candidates_cipher,expires_at) VALUES(?,?,?,?,?,?)")
      .run(id, owner, merchant, provider, seal(candidates, key, `pending:${owner}:${merchant}:${provider}:${id}`), this.now() + 600_000);
    return id;
  }
  private pending(owner: string, merchant: string, id: string, key: Buffer) {
    const row = this.db.prepare("SELECT provider,candidates_cipher FROM channel_pending WHERE id=? AND owner_id=? AND merchant_id=? AND expires_at>?").get(id, owner, merchant, this.now()) as { provider: SocialProvider; candidates_cipher: string } | undefined;
    if (!row) throw new ChannelError("expired");
    const candidates = unseal<Candidate[]>(row.candidates_cipher, key, `pending:${owner}:${merchant}:${row.provider}:${id}`);
    return { provider: row.provider, candidates };
  }
  selection(owner: string, merchant: string, id: string, key: Buffer): ChannelSelection {
    const { provider, candidates } = this.pending(owner, merchant, id, key);
    return { id, provider, choices: candidates.map(({ id, name, username }) => ({ id, name, username })) };
  }
  select(owner: string, merchant: string, id: string, externalId: string, key: Buffer) {
    this.db.transaction(() => {
      const { provider, candidates } = this.pending(owner, merchant, id, key), selected = candidates.find(c => c.id === externalId);
      if (!selected) throw new ChannelError("invalid");
      if (selected.expiresAt !== null && selected.expiresAt <= this.now()) throw new ChannelError("expired");
      this.db.prepare(`INSERT INTO channel_connections(owner_id,merchant_id,provider,external_id,name,username,token_cipher,expires_at,checked_at,status,revision) VALUES(?,?,?,?,?,?,?,?,?,'connected',?)
        ON CONFLICT(owner_id,merchant_id,provider) DO UPDATE SET external_id=excluded.external_id,name=excluded.name,username=excluded.username,token_cipher=excluded.token_cipher,expires_at=excluded.expires_at,checked_at=excluded.checked_at,status='connected',revision=excluded.revision`)
        .run(owner, merchant, provider, selected.id, selected.name, selected.username ?? null, seal(selected.token, key, `connection:${owner}:${merchant}:${provider}`), selected.expiresAt, this.now(), random());
      this.db.prepare("DELETE FROM channel_pending WHERE id=? AND owner_id=?").run(id, owner);
    })();
  }
  cancel(owner: string, merchant: string, id: string) { this.db.prepare("DELETE FROM channel_pending WHERE id=? AND owner_id=? AND merchant_id=?").run(id, owner, merchant); }
  list(owner: string | null, merchant: string): ChannelAccount[] {
    if (!owner) return [];
    const rows = this.db.prepare("SELECT provider,external_id,name,username,status,expires_at,checked_at FROM channel_connections WHERE owner_id=? AND merchant_id=?").all(owner, merchant) as ConnectionRow[];
    return rows.map(r => ({ provider: r.provider, externalId: r.external_id, name: r.name, username: r.username ?? undefined, status: r.expires_at !== null && r.expires_at <= this.now() ? "reconnect" : r.status, checkedAt: r.checked_at, expiresAt: r.expires_at }));
  }
  credential(owner: string, merchant: string, provider: SocialProvider, key: Buffer) {
    const row = this.db.prepare("SELECT * FROM channel_connections WHERE owner_id=? AND merchant_id=? AND provider=?").get(owner, merchant, provider) as ConnectionRow | undefined;
    if (!row) throw new ChannelError("session");
    if (row.expires_at !== null && row.expires_at <= this.now()) throw new ChannelError("reconnect");
    return { id: row.external_id, token: unseal<string>(row.token_cipher, key, `connection:${owner}:${merchant}:${provider}`), revision: row.revision };
  }
  checked(owner: string, merchant: string, provider: SocialProvider, revision: string, valid: boolean) {
    this.db.prepare("UPDATE channel_connections SET status=?,checked_at=? WHERE owner_id=? AND merchant_id=? AND provider=? AND revision=?").run(valid ? "connected" : "reconnect", this.now(), owner, merchant, provider, revision);
  }
  disconnect(owner: string, merchant: string, provider: SocialProvider) {
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM channel_connections WHERE owner_id=? AND merchant_id=? AND provider=?").run(owner, merchant, provider);
      this.db.prepare("DELETE FROM channel_pending WHERE owner_id=? AND merchant_id=? AND provider=?").run(owner, merchant, provider);
      // Cancel reconnect requests that have not returned from the provider yet.
      this.db.prepare("DELETE FROM channel_oauth_states WHERE owner_id=? AND merchant_id=? AND provider=?").run(owner, merchant, provider);
    })();
  }
  signout(session: string) {
    this.db.transaction(() => {
      const owner = this.owner(session);
      if (owner) this.db.prepare("DELETE FROM channel_pending WHERE owner_id=?").run(owner);
      this.db.prepare("DELETE FROM channel_oauth_states WHERE session_hash=?").run(hash(session));
      this.db.prepare("DELETE FROM channel_sessions WHERE token_hash=?").run(hash(session));
    })();
  }
}
