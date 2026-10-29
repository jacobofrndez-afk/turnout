import type { NextRequest } from "next/server";
import { isSocialProvider } from "@/lib/social-channels";
import { getDb } from "@/server/db/client";
import { ChannelError, socialConfig } from "@/server/social/config";
import { ChannelStore, SESSION_COOKIE, SESSION_SECONDS } from "@/server/social/store";
import { exchangeAccounts } from "@/server/social/meta";
import { accountRedirect, errorReason, oauthCookie, privateCookie } from "@/server/social/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isSocialProvider(provider)) return accountRedirect(request, undefined, "invalid");
  let merchant: string | undefined;
  try {
    const config = socialConfig(provider); if (!config) throw new ChannelError("setup");
    const store = new ChannelStore(getDb()), session = request.cookies.get(SESSION_COOKIE)?.value;
    const state = store.consume(request.nextUrl.searchParams.get("state") ?? undefined, request.cookies.get(oauthCookie(provider))?.value, provider, session);
    merchant = state.merchant_id;
    if (request.nextUrl.searchParams.has("error")) throw new ChannelError("denied");
    const code = request.nextUrl.searchParams.get("code");
    if (!code || code.length > 4096) throw new ChannelError("invalid");
    const result = await exchangeAccounts(provider, config, code);
    if (!result.candidates.length) throw new ChannelError("empty");
    // Identity, session rotation and pending selection commit together.
    const { auth, selection } = getDb().transaction(() => {
      const auth = store.authenticate(provider, result.subject, state.owner_id, session);
      const selection = store.createSelection(auth.owner, merchant!, provider, result.candidates, config.key);
      return { auth, selection };
    })();
    const response = accountRedirect(request, merchant, undefined, selection);
    response.cookies.set(SESSION_COOKIE, auth.session, { ...privateCookie, maxAge: SESSION_SECONDS });
    response.cookies.set(oauthCookie(provider), "", { ...privateCookie, maxAge: 0 });
    return response;
  } catch (error) {
    const response = accountRedirect(request, merchant, errorReason(error));
    response.cookies.set(oauthCookie(provider), "", { ...privateCookie, maxAge: 0 });
    return response;
  }
}
