// Brands the street over-indexes on are a cultural register for the copy. A cause, a charity, a party or a church is
// not a brand a merchant borrows. Qloo files those under urn:tag:genre:brand:ngo (Black Lives Matter carries
// genre:brand:ngo and genre:brand:ngo:advocacy); "nonprofit" alone is not enough, museums and NPR carry it too, and
// "politics" sits in every news brand's genre. The name list catches the ones that come without tags.
type BrandTag = { name?: string; id?: string; tag_id?: string } | string;
const CAUSE_ID = /\bbrand (ngo|charit\w*|advocacy|activis\w*|humanitarian|political \w+|religious \w+|government)\b/i;
const CAUSE_WORD = /\b(ngo|charit\w*|advocacy|humanitarian)\b/i;
const CAUSE_NAME = /lives matter|foundation|charity|church|party\b|movement|unicef|red cross|greenpeace|\bngo\b/i;

export function isCommercialBrand(b: { name: string; tags?: BrandTag[]; subtype?: string }): boolean {
  const isCause = (t: BrandTag) => {
    const s = typeof t === "string" ? t : (t.id ?? t.tag_id ?? t.name ?? "");
    return s.includes(":") ? CAUSE_ID.test(s.replace(/[_:]/g, " ")) : CAUSE_WORD.test(s);
  };
  if ((b.tags ?? []).some(isCause)) return false;
  return !CAUSE_NAME.test(b.name);
}
