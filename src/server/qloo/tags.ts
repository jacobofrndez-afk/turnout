// Tag selection helpers shared by seeding and onboarding.
import { findTags, tagId, type QlooTag } from "./api";

// Prefer generic place-level tags whose name matches the concept; avoid long-tail specialty dishes.
const PREFERRED_NAMESPACES = [
  "urn:tag:genre:place",
  "urn:tag:offerings:place",
  "urn:tag:beverage_offering:qloo",
  "urn:tag:cuisine:qloo",
  "urn:tag:ambience:qloo",
  "urn:tag:category:place",
  "urn:tag:dining_option:qloo",
  "urn:tag:good_for:qloo",
];

export type TagChoice = { id: string; name: string; namespace: string; score: number };

export function rankTagCandidates(concept: string, tags: QlooTag[]): TagChoice[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9àâçéèêëîïôûùüÿ]+/g, " ").trim();
  const c = norm(concept);
  const seen = new Set<string>();
  return tags
    .map((t) => {
      const id = tagId(t);
      const ns = id.split(":").slice(0, 4).join(":");
      let s = 0;
      if (norm(t.name) === c) s += 10;
      else if (norm(t.name).includes(c) || c.includes(norm(t.name))) s += 5;
      const pref = PREFERRED_NAMESPACES.indexOf(ns);
      if (pref >= 0) s += 6 - pref * 0.5;
      if (/specialty_dish|menu_highlight|keyword|wikipedia/.test(id)) s -= 4;
      if (id.length > 70) s -= 3;
      return { id, name: t.name, namespace: ns.replace("urn:tag:", ""), score: s };
    })
    .sort((a, b) => b.score - a.score)
    // One chip per (name, namespace): Qloo often has several URNs for the same label.
    .filter((t) => {
      const k = `${t.name.toLowerCase()}|${t.namespace}`;
      return t.id && !seen.has(k) && seen.add(k);
    });
}

export async function resolveConcept(concept: string): Promise<TagChoice[]> {
  const tags = await findTags(concept, 8);
  return rankTagCandidates(concept, tags);
}

// Turn a free-text offer line into one to three short concept queries for the tag search.
// "Happy hour cocktails 5-7pm, $16 for two" -> ["cocktail bar", "happy hour"]
const CONCEPT_HINTS: [RegExp, string][] = [
  [/happy hour/i, "happy hour"],
  [/cocktail|spritz|margarita|negroni|mojito/i, "cocktail bar"],
  [/mocktail|sans alcool|non-alcoholic|alcohol-free/i, "mocktails"],
  [/craft beer|ipa|lager|brasserie artisanale|bi[èe]re artisanale|brewery|pression|pitcher|pichet/i, "craft beer"],
  [/beer|bi[èe]re/i, "beer"],
  [/natural wine|vin nature|pet-nat|orange wine/i, "natural wine"],
  [/wine|vin|verre de/i, "wine bar"],
  [/burger|smash/i, "burgers"],
  [/pizza/i, "pizza"],
  [/taco|burrito|mexican|mexicain/i, "mexican"],
  [/sushi|ramen|japanese|japonais/i, "japanese"],
  [/croque|bistro|bistrot|plat du jour|brasserie/i, "french bistro"],
  [/charcuterie|planche|fromage|cheese board/i, "charcuterie"],
  [/brunch/i, "brunch"],
  [/coffee|caf[ée]|espresso|latte/i, "coffee shop"],
  [/late night|late-night|until 1|jusqu.?[àa] 1|minuit|midnight|after.?show|apr[èe]s.?concert/i, "late night food"],
  [/game|match|big screen|[ée]cran g[ée]ant|knicks|rangers|psg|football|basketball|hockey/i, "sports bar"],
  [/rooftop|terrasse|terrace|patio/i, "rooftop bar"],
  [/karaoke|karaok[ée]/i, "karaoke bar"],
  [/live music|concert|dj|jazz/i, "live music venue"],
  [/vegan|v[ée]g[ée]tarien|vegetarian|plant/i, "vegan"],
  [/dessert|p[âa]tisserie|pastry|cake|g[âa]teau/i, "dessert"],
  [/merch|t-shirt|vinyl|vinyle|record/i, "record store"],
];

export function conceptsFor(text: string): string[] {
  const out: string[] = [];
  for (const [re, concept] of CONCEPT_HINTS) if (re.test(text) && !out.includes(concept)) out.push(concept);
  if (out.length === 0) out.push(text.split(/[,.;:|]/)[0].trim().slice(0, 40));
  return out.slice(0, 3);
}
