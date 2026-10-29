import { NextResponse, type NextRequest } from "next/server";

// Remember the place the owner is looking at, so the header's bare /today and /radar stay on it.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/account")) {
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
  }
  const id = request.nextUrl.searchParams.get("merchant");
  if (id) response.cookies.set("merchant", id, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: ["/today", "/calendar", "/campaigns", "/account", "/account/sources", "/radar", "/alerts", "/pulse", "/campaigns/new", "/dna", "/dna/campaigns", "/campaigns/from-photo"] };
