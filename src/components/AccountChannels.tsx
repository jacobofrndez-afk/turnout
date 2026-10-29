import { cookies } from "next/headers";
import { ChannelManager } from "./ChannelManager";
import { CHANNEL_NOTICES, type ChannelSelection } from "@/lib/social-channels";
import { ChannelStore, SESSION_COOKIE } from "@/server/social/store";
import { socialConfig, tokenKey } from "@/server/social/config";
import { getDb } from "@/server/db/client";
export async function AccountChannels({ merchant, merchantName, noticeCode, selectionId }: { merchant: string; merchantName: string; noticeCode?: string; selectionId?: string }) {
  const store = new ChannelStore(getDb()), owner = store.owner((await cookies()).get(SESSION_COOKIE)?.value);
  let selection: ChannelSelection | null = null, notice = noticeCode && Object.hasOwn(CHANNEL_NOTICES, noticeCode) ? CHANNEL_NOTICES[noticeCode] : undefined;
  if (selectionId) {
    try { if (owner) selection = store.selection(owner, merchant, selectionId, tokenKey()); else notice = CHANNEL_NOTICES.session; }
    catch { notice = CHANNEL_NOTICES.expired; }
  }
  return <ChannelManager key={`${merchant}:${selectionId ?? ""}:${noticeCode ?? ""}`} merchant={merchant} merchantName={merchantName} accounts={store.list(owner, merchant)} privateSession={!!owner} ready={{ instagram: !!socialConfig("instagram"), facebook: !!socialConfig("facebook") }} selection={selection} notice={notice}/>;
}
