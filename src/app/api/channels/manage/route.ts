import type { NextRequest } from "next/server";
import { isSocialProvider } from "@/lib/social-channels";
import { getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { ChannelError, socialConfig, tokenKey } from "@/server/social/config";
import { ChannelStore, SESSION_COOKIE } from "@/server/social/store";
import { verifyAccount } from "@/server/social/meta";
import { accountRedirect, channelForm, errorReason, privateCookie, privatePostGuard } from "@/server/social/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const guard = privatePostGuard(request); if (guard) return guard;
  let merchant: string | undefined;
  try {
    const form = await channelForm(request); merchant = form.get("merchant") ?? undefined;
    if (!merchant || !getMerchant(merchant)) throw new ChannelError("invalid");
    const store = new ChannelStore(getDb()), session = request.cookies.get(SESSION_COOKIE)?.value, owner = store.owner(session);
    if (!owner) throw new ChannelError("session");
    const action = form.get("action");
    if (action === "signout") {
      store.signout(session!); const response = accountRedirect(request, merchant, "signedout");
      response.cookies.set(SESSION_COOKIE, "", { ...privateCookie, maxAge: 0 }); return response;
    }
    if (action === "select") {
      store.select(owner, merchant, form.get("selection") ?? "", form.get("account") ?? "", tokenKey());
      return accountRedirect(request, merchant, "connected");
    }
    if (action === "cancel") { store.cancel(owner, merchant, form.get("selection") ?? ""); return accountRedirect(request, merchant, "cancelled"); }
    const provider = form.get("provider"); if (!isSocialProvider(provider)) throw new ChannelError("invalid");
    if (action === "disconnect") { store.disconnect(owner, merchant, provider); return accountRedirect(request, merchant, "disconnected"); }
    if (action !== "check") throw new ChannelError("invalid");
    const config = socialConfig(provider); if (!config) throw new ChannelError("setup");
    const credential = store.credential(owner, merchant, provider, config.key);
    try { await verifyAccount(provider, config, credential); }
    catch (error) {
      if (error instanceof ChannelError && ["reconnect", "permissions"].includes(error.reason)) store.checked(owner, merchant, provider, credential.revision, false);
      throw error;
    }
    // Network work may outlive sign-out; never persist results for a revoked session.
    if (store.owner(session) !== owner) throw new ChannelError("session");
    store.checked(owner, merchant, provider, credential.revision, true);
    return accountRedirect(request, merchant, "checked");
  } catch (error) { return accountRedirect(request, merchant, errorReason(error)); }
}
