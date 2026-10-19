import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { provider } from "@/server/agent/run";
import { whatsappConfigured } from "@/server/channels/twilio";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const merchants = (db.prepare("SELECT COUNT(*) AS c FROM merchants").get() as { c: number }).c;
  const events = (db.prepare("SELECT COUNT(*) AS c FROM events").get() as { c: number }).c;
  return NextResponse.json({
    ok: true,
    qloo: Boolean(process.env.QLOO_API_KEY),
    ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
    agent: provider(),
    whatsapp: whatsappConfigured(),
    merchants,
    events,
    time: new Date().toISOString(),
  });
}
