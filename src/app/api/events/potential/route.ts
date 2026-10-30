import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, readJsonBody, sameOrigin, tooMany } from '@/server/guard';
import { getMerchant } from '@/server/events/radar';
import { getEvent } from '@/server/qloo/crowd';
import { DnaError } from '@/server/merchants/dna';
import { assessEventPotential } from '@/server/workspace/event-potential';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  const limit = rateLimit(req,'event-potential',6,60000); if (!limit.ok) return tooMany(limit.retryAfterS);
  try {
    const input = z.object({ merchant: z.string().min(1).max(100), event: z.string().min(1).max(200) }).parse(await readJsonBody(req,2048));
    const merchant = getMerchant(input.merchant), event = getEvent(input.event);
    if (!merchant || !event) throw new DnaError('Place or event not found.',404);
    return NextResponse.json({ potential: await assessEventPotential(merchant,event) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof DnaError ? error.message : 'Qloo could not complete this check. No campaign was created. Please try again.' }, { status: error instanceof DnaError ? error.status : 503 });
  }
}
