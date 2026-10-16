import { NextResponse } from "next/server";
import { getMerchant, listMerchants, radarFor } from "@/server/events/radar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const merchantId = url.searchParams.get("merchant") ?? listMerchants()[0]?.id;
  const hours = Number(url.searchParams.get("hours") ?? 72);
  const merchant = merchantId ? getMerchant(merchantId) : undefined;
  if (!merchant) return NextResponse.json({ error: "unknown merchant" }, { status: 404 });
  try {
    const items = await radarFor(merchant, hours);
    return NextResponse.json({ merchant, items: items.slice(0, 60) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
