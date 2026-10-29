import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDna, DnaError } from "@/server/merchants/dna";
import { rateLimit, tooMany, sameOrigin } from "@/server/guard";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const rl = rateLimit(req, "dna", 30, 60_000); if (!rl.ok) return tooMany(rl.retryAfterS);
  try {
    const body = await req.text(); if (body.length > 12000) throw new DnaError("Profile is too large.");
    const input = z.object({ profile: z.unknown(), version: z.number().int().min(0) }).parse(JSON.parse(body));
    return NextResponse.json(saveDna((await params).id, input.profile, input.version));
  } catch (e) { return NextResponse.json({ error: e instanceof DnaError ? e.message : "Check the profile fields and try again." }, { status: e instanceof DnaError ? e.status : 400 }); }
}
