import { NextResponse, type NextRequest } from "next/server";
import { isSocialProvider } from "@/lib/social-channels";
import { getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { ChannelError, socialConfig } from "@/server/social/config";
import { ChannelStore, SESSION_COOKIE } from "@/server/social/store";
import { authorizationUrl } from "@/server/social/meta";
import { accountRedirect, channelForm, errorReason, oauthCookie, privateCookie, privatePostGuard, privateResponse } from "@/server/social/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const guard = privatePostGuard(request); if (guard) return guard;
  let merchant: string | undefined;
  try {
    const { provider } = await context.params;
    if (!isSocialProvider(provider)) throw new ChannelError("invalid");
    const config = socialConfig(provider); if (!config) throw new ChannelError("setup");
    const form = await channelForm(request); merchant = form.get("merchant") ?? undefined;
    if (!merchant || !getMerchant(merchant)) throw new ChannelError("invalid");
    const { state, browser } = new ChannelStore(getDb()).start(provider, merchant, request.cookies.get(SESSION_COOKIE)?.value);
    const response = privateResponse(NextResponse.redirect(authorizationUrl(provider, config, state), 303));
    response.cookies.set(oauthCookie(provider), browser, { ...privateCookie, maxAge: 600 });
    return response;
  } catch (error) { return accountRedirect(request, merchant, errorReason(error)); }
}
