import { NextResponse } from "next/server";
import { SourceChange, publicHandle } from "@/lib/source-settings";
import { getMerchant } from "@/server/events/radar";
import { sourceSettings, saveSourceSettings } from "@/server/sources/settings";
import { publicFeed } from "@/server/sources/public-feed";
import { rateLimit, sameOrigin, tooMany } from "@/server/guard";
export async function POST(req: Request, {params}:{params:Promise<{id:string}>}) {
  if (!sameOrigin(req)) return NextResponse.json({error:"Invalid origin."},{status:403});
  const rate = rateLimit(req,"sources",20,60000); if (!rate.ok) return tooMany(rate.retryAfterS);
  const {id} = await params; if (!getMerchant(id)) return NextResponse.json({error:"Place not found."},{status:404});
  try {
    const body = await req.text(); if (body.length > 2000) return NextResponse.json({error:"Request too large."},{status:413});
    const change = SourceChange.parse(JSON.parse(body)); const settings = sourceSettings(id);
    if (change.version !== settings.version) return NextResponse.json({error:"Sources changed in another tab. Reload before saving."},{status:409});
    if (change.action === "toggle") settings[change.key] = change.enabled;
    else if (change.action === "remove") settings.accounts = settings.accounts.filter(a=>a.did!==change.did);
    else {
      const handle = publicHandle(change.handle); if (!handle) return NextResponse.json({error:"Enter a Bluesky handle such as paris.fr, without a URL."},{status:400});
      if (settings.accounts.length >= 5) return NextResponse.json({error:"You can follow up to five public accounts per place."},{status:400});
      const endpoint = new URL("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile"); endpoint.searchParams.set("actor",handle);
      let data: {did?:string;handle?:string;displayName?:string};
      try { data = (await publicFeed(endpoint,900)).data as typeof data; } catch { return NextResponse.json({error:"This public account could not be found or Bluesky is unavailable. Check the handle and try again."},{status:422}); }
      if (!/^did:plc:[a-z2-7]{24}$/.test(data.did??"") || !publicHandle(data.handle??"")) return NextResponse.json({error:"This account could not be verified by the public API."},{status:422});
      if (settings.accounts.some(a=>a.did===data.did)) return NextResponse.json({error:"You already follow this account."},{status:409});
      settings.accounts.push({did:data.did!,handle:data.handle!,name:(data.displayName||data.handle!).slice(0,80)});
    }
    return NextResponse.json(saveSourceSettings(id,settings,change.version));
  } catch { return NextResponse.json({error:"The settings could not be saved. Reload and try again."},{status:400}); }
}
