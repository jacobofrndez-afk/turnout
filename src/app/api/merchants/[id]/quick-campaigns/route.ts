import { NextResponse } from "next/server";
import { saveQuickCampaign } from "@/server/merchants/quick-campaign";
import { DnaError } from "@/server/merchants/dna";
import { rateLimit, tooMany, sameOrigin } from "@/server/guard";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const rl = rateLimit(req, "quick-campaign", 12, 60_000); if (!rl.ok) return tooMany(rl.retryAfterS);
  try { const body = await req.text(); if (body.length > 10000) throw new DnaError("Message is too long."); return NextResponse.json(saveQuickCampaign((await params).id, JSON.parse(body))); }
  catch(e) { return NextResponse.json({ error: e instanceof DnaError ? e.message : "Could not save this draft. Your edits are still here." }, { status: e instanceof DnaError ? e.status : 400 }); }
}
