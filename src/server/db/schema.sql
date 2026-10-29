-- Crowd-to-Campaign schema (SQLite)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                -- bar, restaurant, shop
  address TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  city TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  radius_m INTEGER NOT NULL DEFAULT 1500,
  voice TEXT,                        -- tone of voice for copy
  channels_json TEXT NOT NULL DEFAULT '[]',
  qloo_entity_id TEXT,               -- the merchant itself in Qloo, if it exists
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  title TEXT NOT NULL,
  description TEXT,
  price TEXT,
  tag_urns_json TEXT NOT NULL DEFAULT '[]',   -- resolved Qloo tag URNs
  tag_names_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,               -- Ticketmaster event id
  name TEXT NOT NULL,
  venue_name TEXT,
  venue_id TEXT,
  lat REAL,
  lon REAL,
  starts_at TEXT NOT NULL,           -- ISO UTC
  ends_at_est TEXT,
  timezone TEXT,
  segment TEXT,                      -- Music, Sports, Arts & Theatre, Comedy...
  genre TEXT,
  attractions_json TEXT NOT NULL DEFAULT '[]',   -- [{id,name,segment,genre}]
  capacity_est INTEGER,
  status TEXT,
  url TEXT,
  image_url TEXT,
  raw_json TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS events_starts_at ON events(starts_at);

CREATE TABLE IF NOT EXISTS crowd_profiles (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  headliner_name TEXT NOT NULL,
  headliner_type TEXT,
  entity_id TEXT,
  resolution_status TEXT NOT NULL,   -- auto | needs_input | resolved | unresolved
  candidates_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  demographics_json TEXT,
  places_json TEXT NOT NULL DEFAULT '[]',
  brands_json TEXT NOT NULL DEFAULT '[]',
  built_at TEXT
);
CREATE INDEX IF NOT EXISTS crowd_profiles_event ON crowd_profiles(event_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  event_id TEXT NOT NULL REFERENCES events(id),
  crowd_profile_id TEXT REFERENCES crowd_profiles(id),
  status TEXT NOT NULL,              -- draft | needs_input | approved | sent | simulated | failed
  offer_id TEXT REFERENCES offers(id),
  offer_scores_json TEXT,
  copy_json TEXT,                    -- {whatsapp, sms, ad_headline, ad_body, dooh}
  window_json TEXT,                  -- [{start,end,label}]
  channels_json TEXT,
  rationale TEXT,
  limitations TEXT,
  llm_usage_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sends (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  channel TEXT NOT NULL,
  recipient_ref TEXT,
  status TEXT NOT NULL,
  provider_sid TEXT,
  simulated INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT,
  crowd_profile_id TEXT,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL,                -- qloo | ticketmaster | llm | decision | channel
  workflow TEXT,
  input_json TEXT,                   -- redacted
  envelope_status TEXT,
  result_count INTEGER,
  cache_hit INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  label TEXT NOT NULL,               -- fictional first name
  channel TEXT NOT NULL,             -- whatsapp | sms
  address TEXT NOT NULL,             -- demo number, never a real customer
  consent_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY,              -- sha256(source + canonical input)
  source TEXT NOT NULL,              -- qloo | ticketmaster
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_dna (
  merchant_id TEXT PRIMARY KEY REFERENCES merchants(id), profile_json TEXT NOT NULL,
  version INTEGER NOT NULL, status TEXT NOT NULL, source TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS dna_history (
  merchant_id TEXT NOT NULL REFERENCES merchants(id), version INTEGER NOT NULL,
  profile_json TEXT NOT NULL, source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(merchant_id, version)
);
CREATE TABLE IF NOT EXISTS quick_campaigns (
  id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL REFERENCES merchants(id),
  input_json TEXT NOT NULL, copy TEXT NOT NULL, dna_snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS menu_captures (
  id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL REFERENCES merchants(id),
  extraction_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Public discovery preferences only. No credentials or private account data.
CREATE TABLE IF NOT EXISTS source_settings (
  merchant_id TEXT PRIMARY KEY REFERENCES merchants(id),
  settings_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Private social account access. Never join these tables to public merchant responses.
CREATE TABLE IF NOT EXISTS channel_identities (
  provider TEXT NOT NULL, subject_id TEXT NOT NULL, owner_id TEXT NOT NULL,
  PRIMARY KEY(provider, subject_id)
);
CREATE TABLE IF NOT EXISTS channel_sessions (
  token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS channel_oauth_states (
  state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, provider TEXT NOT NULL,
  merchant_id TEXT NOT NULL REFERENCES merchants(id), session_hash TEXT, owner_id TEXT, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS channel_pending (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, merchant_id TEXT NOT NULL REFERENCES merchants(id),
  provider TEXT NOT NULL, candidates_cipher TEXT NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS channel_connections (
  owner_id TEXT NOT NULL, merchant_id TEXT NOT NULL REFERENCES merchants(id), provider TEXT NOT NULL,
  external_id TEXT NOT NULL, name TEXT NOT NULL, username TEXT, token_cipher TEXT NOT NULL,
  expires_at INTEGER, checked_at INTEGER NOT NULL, status TEXT NOT NULL, revision TEXT NOT NULL,
  PRIMARY KEY(owner_id, merchant_id, provider)
);
