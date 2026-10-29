import { getDb } from "@/server/db/client";
import type { SourceSettings } from "@/lib/source-settings";
export function sourceSettings(merchantId: string): SourceSettings {
  const row = getDb().prepare("SELECT settings_json, version FROM source_settings WHERE merchant_id=?").get(merchantId) as { settings_json: string; version: number } | undefined;
  if (row) return { ...JSON.parse(row.settings_json), version: row.version };
  return { trends: true, openAgenda: true, social: true, version: 0, accounts: merchantId === "m_quai_bercy" ? [{ did: "did:plc:ga6ylanmyto2mnx6bfvo5fql", handle: "paris.fr", name: "City of Paris" }] : [] };
}
export function saveSourceSettings(merchantId: string, settings: SourceSettings, version: number): SourceSettings {
  return getDb().transaction(() => {
    if (sourceSettings(merchantId).version !== version) throw new Error("Sources changed in another tab. Reload before saving.");
    const { version: _version, ...value } = settings;
    getDb().prepare("INSERT INTO source_settings (merchant_id,settings_json,version,updated_at) VALUES (?,?,?,datetime('now')) ON CONFLICT(merchant_id) DO UPDATE SET settings_json=excluded.settings_json, version=excluded.version, updated_at=excluded.updated_at").run(merchantId, JSON.stringify(value), version + 1);
    return { ...value, version: version + 1 };
  })();
}
