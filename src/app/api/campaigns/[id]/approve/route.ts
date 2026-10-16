import { NextResponse } from "next/server";
import { approveCampaign, getCampaign } from "@/server/agent/run";

export const dynamic = "force-dynamic";

// Approval marks the campaign; channel sends arrive with phase 3.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCampaign(id)) return NextResponse.json({ error: "unknown campaign" }, { status: 404 });
  approveCampaign(id);
  return NextResponse.redirect(new URL(`/campaigns/${id}`, req.url), 303);
}
