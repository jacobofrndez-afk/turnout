// Merchant onboarding: create a merchant from a form, turn free-text offers into Qloo tag candidates,
// let the merchant confirm, then the radar takes over.
import { getDb, newId } from "@/server/db/client";
import { geocode } from "./geocode";
import { conceptsFor, resolveConcept, type TagChoice } from "@/server/qloo/tags";

export type OfferInput = { title: string; description: string; price: string };

export function parseOfferLines(text: string): OfferInput[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((line) => {
      // "Title | description | price" or free text. Price = first currency-looking token.
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) return { title: parts[0], description: parts[1], price: parts[2] ?? "" };
      const price = line.match(/(\$\s?\d+[\d.,]*|\d+[\d.,]*\s?(€|\$|eur|usd|euros?|dollars?))/i)?.[0] ?? "";
      const title = line.replace(price, "").split(/[,.;:]/)[0].trim().slice(0, 60);
      return { title: title || line.slice(0, 60), description: line, price: price.trim() };
    });
}

export type OnboardingResult = { merchantId: string; geocoded: { lat: number; lon: number; displayName: string } };

export async function createMerchantFromForm(f: { name: string; kind: string; address: string; voice: string; channels: string[]; offersText: string; seats?: number }): Promise<OnboardingResult | { error: string }> {
  const geo = await geocode(f.address);
  if (!geo) return { error: `Could not locate "${f.address}". Try a fuller address with city and country.` };
  const db = getDb();
  const id = newId("m");
  db.prepare(
    `INSERT INTO merchants (id, name, kind, address, lat, lon, city, timezone, radius_m, seats, voice, channels_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1500, ?, ?, ?)`,
  ).run(id, f.name.trim().slice(0, 80), f.kind, geo.displayName.split(",").slice(0, 3).join(","), geo.lat, geo.lon, geo.city || f.address.split(",").pop()?.trim() || "", geo.timezone, Math.round(Math.min(2000, Math.max(10, f.seats || 60))), f.voice.trim().slice(0, 300) || null, JSON.stringify(f.channels));
  const ins = db.prepare(`INSERT INTO offers (id, merchant_id, title, description, price, tag_urns_json, tag_names_json, active) VALUES (?, ?, ?, ?, ?, '[]', '[]', 1)`);
  for (const o of parseOfferLines(f.offersText)) ins.run(newId("o"), id, o.title, o.description, o.price);
  const demoNames = ["Alex", "Sam", "Jordan", "Camille", "Robin", "Noa"];
  const c = db.prepare(`INSERT OR IGNORE INTO contacts (id, merchant_id, label, channel, address, consent_at) VALUES (?, ?, ?, 'whatsapp', ?, datetime('now'))`);
  demoNames.forEach((n, i) => c.run(`c_${id}_${i}`, id, n, `demo:${id}:${i}`));
  return { merchantId: id, geocoded: geo };
}

export type OfferWithCandidates = { id: string; title: string; description: string; price: string; concepts: { concept: string; candidates: TagChoice[] }[] };

// For each offer, derive concepts and fetch Qloo tag candidates (cached by the API layer).
export async function offerTagCandidates(merchantId: string): Promise<OfferWithCandidates[]> {
  const offers = getDb().prepare("SELECT id, title, description, price FROM offers WHERE merchant_id = ? AND active = 1").all(merchantId) as { id: string; title: string; description: string; price: string }[];
  const out: OfferWithCandidates[] = [];
  for (const o of offers) {
    const concepts = conceptsFor(`${o.title} ${o.description}`);
    const resolved = [];
    for (const concept of concepts) resolved.push({ concept, candidates: (await resolveConcept(concept)).slice(0, 4) });
    out.push({ ...o, concepts: resolved });
  }
  return out;
}

export function saveOfferTags(merchantId: string, choices: Record<string, { ids: string[]; names: string[] }>): void {
  const db = getDb();
  const upd = db.prepare("UPDATE offers SET tag_urns_json = ?, tag_names_json = ? WHERE id = ? AND merchant_id = ?");
  for (const [offerId, c] of Object.entries(choices)) upd.run(JSON.stringify(c.ids), JSON.stringify(c.names), offerId, merchantId);
}

// Resolve only missing menu tags, outside the quick DNA confirmation path.
export async function ensureOfferTags(merchantId: string): Promise<void> {
  const missing = getDb().prepare("SELECT id, title, description FROM offers WHERE merchant_id=? AND active=1 AND tag_urns_json='[]'").all(merchantId) as { id: string; title: string; description: string | null }[];
  for (const offer of missing) {
    try {
      const tags = (await Promise.all(conceptsFor(`${offer.title} ${offer.description ?? ""}`).map(async c => (await resolveConcept(c))[0]))).filter((t): t is TagChoice => Boolean(t));
      if (tags.length) getDb().prepare("UPDATE offers SET tag_urns_json=?, tag_names_json=? WHERE id=? AND merchant_id=? AND tag_urns_json='[]'").run(JSON.stringify(tags.map(t => t.id)), JSON.stringify(tags.map(t => t.name)), offer.id, merchantId);
    } catch { /* Unavailable matching stays absent; never invent taste evidence. */ }
  }
}
