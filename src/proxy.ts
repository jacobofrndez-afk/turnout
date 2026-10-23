import { NextResponse, type NextRequest } from "next/server";

// Remember the place the owner is looking at, so the header's bare /today and /radar stay on it.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const id = request.nextUrl.searchParams.get("merchant");
  if (id) response.cookies.set("merchant", id, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: ["/today", "/radar", "/alerts", "/pulse", "/campaigns/new"] };
