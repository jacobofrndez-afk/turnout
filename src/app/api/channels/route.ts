import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { ChannelStore, SESSION_COOKIE } from "@/server/social/store";
import { privateResponse } from "@/server/social/http";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const response = (body: unknown, status = 200) => {
    const result = privateResponse(NextResponse.json(body, { status }));
    result.headers.set("Vary", "Cookie"); result.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return result;
  };
  if (request.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Open your channels in Turnout." }, 403);
  const merchant = request.nextUrl.searchParams.get("merchant");
  if (!merchant || !getMerchant(merchant)) return response({ error: "Place not found." }, 404);
  const store = new ChannelStore(getDb());
  return response({ accounts: store.list(store.owner(request.cookies.get(SESSION_COOKIE)?.value), merchant) });
}
