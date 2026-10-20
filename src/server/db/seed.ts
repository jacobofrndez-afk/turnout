// Seeds two demo merchants (New York, Paris) with offers whose Qloo tags are resolved once via /v2/tags.
// Contacts are fictional; the phone numbers are placeholders replaced by DEMO_WHATSAPP_TO at send time.
import { getDb } from "./client";
import { findTags } from "@/server/qloo/api";
import { rankTagCandidates } from "@/server/qloo/tags";

type SeedOffer = { id: string; title: string; description: string; price: string; concepts: string[] };
type SeedMerchant = {
  id: string;
  name: string;
  kind: string;
  address: string;
  lat: number;
  lon: number;
  city: string;
  timezone: string;
  radius_m: number;
  seats: number; // room size: relevance of a crowd is relative to it
  voice: string;
  offers: SeedOffer[];
};

export const MERCHANTS: SeedMerchant[] = [
  {
    id: "m_penn_pour",
    name: "Penn & Pour",
    kind: "bar",
    address: "W 31st St & 8th Ave, New York, NY",
    lat: 40.7494,
    lon: -73.9957,
    city: "New York",
    timezone: "America/New_York",
    radius_m: 1500,
    seats: 70,
    voice: "Warm, quick-witted, New York direct. Short sentences. No exclamation marks.",
    offers: [
      { id: "o_pp_happy", title: "Pre-show happy hour", description: "Two cocktails for the price of one, 5 to 7 pm", price: "$16 for two", concepts: ["cocktail bar", "happy hour"] },
      { id: "o_pp_beer", title: "Craft beer flight", description: "Four local IPAs and lagers from Brooklyn and Queens", price: "$18", concepts: ["craft beer", "local brewery"] },
      { id: "o_pp_late", title: "After-show late plate", description: "Smash burger and fries served until 1 am", price: "$14", concepts: ["burgers", "late night food"] },
      { id: "o_pp_wine", title: "Natural wine by the glass", description: "Rotating orange and pet-nat pours", price: "$13", concepts: ["natural wine", "wine bar"] },
      { id: "o_pp_screen", title: "Game night big screen", description: "Every Knicks and Rangers game on the big screen, pitchers of lager", price: "$22 pitcher", concepts: ["sports bar", "beer"] },
    ],
  },
  {
    id: "m_quai_bercy",
    name: "Le Quai 12",
    kind: "bar",
    address: "Quai de Bercy, 75012 Paris",
    lat: 48.8373,
    lon: 2.3838,
    city: "Paris",
    timezone: "Europe/Paris",
    radius_m: 1500,
    seats: 50,
    voice: "Chaleureux, un peu d'humour parisien, tutoiement. Phrases courtes.",
    offers: [
      { id: "o_q12_apero", title: "Apéro d'avant-concert", description: "Planche charcuterie-fromage et deux verres de vin", price: "24 €", concepts: ["wine bar", "charcuterie"] },
      { id: "o_q12_biere", title: "Bières artisanales d'Île-de-France", description: "Trois brasseries franciliennes en pression", price: "7 €", concepts: ["craft beer", "local brewery"] },
      { id: "o_q12_cocktail", title: "Cocktail signature", description: "Spritz maison et cocktails sans alcool", price: "9 €", concepts: ["cocktail bar", "mocktail"] },
      { id: "o_q12_tardif", title: "Croque de minuit", description: "Croque-monsieur et frites jusqu'à 1 h", price: "12 €", concepts: ["late night food", "french bistro"] },
      { id: "o_q12_match", title: "Soirée match", description: "Écran géant, pichets de bière, cacahuètes offertes", price: "18 € le pichet", concepts: ["sports bar", "beer"] },
    ],
  },
];

const CONTACT_NAMES = ["Alex", "Sam", "Jordan", "Camille", "Robin", "Noa"];



export async function seed(): Promise<void> {
  const db = getDb();
  const upsertMerchant = db.prepare(
    `INSERT INTO merchants (id, name, kind, address, lat, lon, city, timezone, radius_m, seats, voice, channels_json)
     VALUES (@id, @name, @kind, @address, @lat, @lon, @city, @timezone, @radius_m, @seats, @voice, @channels_json)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, address=excluded.address, lat=excluded.lat, lon=excluded.lon,
       city=excluded.city, timezone=excluded.timezone, radius_m=excluded.radius_m, seats=excluded.seats, voice=excluded.voice, channels_json=excluded.channels_json`,
  );
  const upsertOffer = db.prepare(
    `INSERT INTO offers (id, merchant_id, title, description, price, tag_urns_json, tag_names_json, active)
     VALUES (@id, @merchant_id, @title, @description, @price, @tag_urns_json, @tag_names_json, 1)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, description=excluded.description, price=excluded.price,
       tag_urns_json=excluded.tag_urns_json, tag_names_json=excluded.tag_names_json`,
  );
  const upsertContact = db.prepare(
    `INSERT OR IGNORE INTO contacts (id, merchant_id, label, channel, address, consent_at) VALUES (?, ?, ?, 'whatsapp', ?, datetime('now'))`,
  );

  for (const m of MERCHANTS) {
    upsertMerchant.run({ ...m, channels_json: JSON.stringify(["whatsapp", "geofenced_ad", "dooh"]) });
    for (const o of m.offers) {
      const urns: string[] = [];
      const names: string[] = [];
      for (const concept of o.concepts) {
        const tags = await findTags(concept, 8);
        const pick = rankTagCandidates(concept, tags)[0];
        if (pick) {
          urns.push(pick.id);
          names.push(pick.name);
        }
      }
      upsertOffer.run({ id: o.id, merchant_id: m.id, title: o.title, description: o.description, price: o.price, tag_urns_json: JSON.stringify(urns), tag_names_json: JSON.stringify(names) });
      console.log(`  ${m.name} / ${o.title}: ${urns.join(", ") || "(no tags)"}`);
    }
    CONTACT_NAMES.forEach((label, i) => upsertContact.run(`c_${m.id}_${i}`, m.id, label, `demo:${m.id}:${i}`));
  }
}
