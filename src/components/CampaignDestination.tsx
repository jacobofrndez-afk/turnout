"use client";
import { googlePromotionNote } from "@/lib/channel-recommendation";
import type { LocalPromotion } from "@/lib/local-promotion";
import type { PlanChannel } from "@/lib/campaign-plan";
import type { ChannelAccount } from "@/lib/social-channels";
import { campaignDestination, type ConnectionState } from "@/lib/campaign-destination";
import { ChannelIcon } from "./ChannelIcon";
import { CopyText } from "./CopyText";
import { Icon } from "./Icon";
import { CHANNELS } from "@/lib/place-dna";
import { useChannelAccounts } from "./useChannelAccounts";
export function DestinationHeading({ channel, merchantId, merchantName, accounts, state, localPromotion }: { localPromotion?:LocalPromotion; channel: PlanChannel; merchantId: string; merchantName: string; accounts: ChannelAccount[]; state: ConnectionState }) {
  const d = campaignDestination(channel, merchantId, merchantName, accounts, state, localPromotion);
  return <div className="campaign-destination-heading"><div><span className="destination-format">{d.format}</span><strong>{d.title}</strong><small>{d.status}</small></div>{d.accountHref && <a href={d.accountHref} target="_blank" rel="noreferrer" className="destination-account-link">{d.accountAction}<Icon name="arrow" size={13}/><span className="sr-only"> (opens in a new tab; your draft stays here)</span></a>}</div>;
}
export function DestinationActions({ channel, merchantId, merchantName, accounts, state, text, localPromotion, validTiming = true }: { localPromotion?:LocalPromotion; channel: PlanChannel; merchantId: string; merchantName: string; accounts: ChannelAccount[]; state: ConnectionState; text: string; validTiming?: boolean }) {
  const d = campaignDestination(channel, merchantId, merchantName, accounts, state, localPromotion);
  return <div className="campaign-destination-actions">{channel==="google_post"&&googlePromotionNote(text)&&<p className="channel-content-note">{googlePromotionNote(text)} <a href="https://support.google.com/business/answer/7400114" target="_blank" rel="noreferrer">Google post policy ↗</a></p>}<p>{validTiming ? d.help : "This destination is kept for reference. Choose a new campaign window before sharing."}</p>{validTiming && <div><CopyText key={`${channel}:${text}`} text={text} label={channel === "instagram" ? "1. Copy caption" : channel === "storefront" ? "Copy board text" : "1. Copy message"}/>{d.links.map(link => <a key={link.href} className="destination-open" href={link.href} target="_blank" rel="noreferrer">{d.links.length === 1 ? "2. " : ""}{link.label}<Icon name="arrow" size={14}/><span className="sr-only"> (opens in a new tab)</span></a>)}</div>}</div>;
}
export function CampaignDestinations({ channels, merchantId, merchantName, text, messages, localPromotion, validTiming = true }: { localPromotion?:LocalPromotion; channels: PlanChannel[]; merchantId: string; merchantName: string; text: string; messages?: Partial<Record<PlanChannel, string>>; validTiming?: boolean }) {
  const { accounts, state } = useChannelAccounts(merchantId);
  return <section className="campaign-destinations" aria-label={validTiming ? "Where to publish" : "Campaign destinations"}><h3>{validTiming ? "Where to publish" : "Campaign destinations"}</h3><p>{validTiming ? "Your selected destinations. Copy the message, then finish in the channel." : "Destinations selected for this campaign. Its window needs updating before sharing."}</p><div>{channels.map(channel => <article key={channel}><div className="destination-channel-name"><ChannelIcon channel={channel}/><h4>{CHANNELS[channel]}</h4></div><DestinationHeading localPromotion={localPromotion} channel={channel} merchantId={merchantId} merchantName={merchantName} accounts={accounts} state={state}/><DestinationActions localPromotion={localPromotion} channel={channel} merchantId={merchantId} merchantName={merchantName} accounts={accounts} state={state} text={messages?.[channel] ?? text} validTiming={validTiming}/></article>)}</div></section>;
}
