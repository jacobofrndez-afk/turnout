"use client";
import { useId, useState } from "react";
import { CHANNELS, CHANNEL_IDS } from "@/lib/place-dna";
import type { LocalPromotion } from "@/lib/local-promotion";
import type { CampaignVisual } from "@/lib/campaign-creative";
import type { PlanChannel } from "@/lib/campaign-plan";
import { ChannelIcon } from "./ChannelIcon";
import { DestinationActions, DestinationHeading } from "./CampaignDestination";
import { useChannelAccounts } from "./useChannelAccounts";
import { googlePromotionNote } from "@/lib/channel-recommendation";
import { Icon } from "./Icon";

const status: Record<PlanChannel, string> = {
  tiktok: "Photo or video", snapchat: "Story",
  storefront: "At the entrance", instagram: "Feed caption", facebook: "Page post",
  google_post: "Business update", whatsapp: "To your regulars", geofenced_ad: "Paid local ad",
};

export function CampaignChannelPreview({ visual, localPromotion, channels, merchantId, merchantName, message, windowLabel, budget, onMessageChange, onChannelsChange, edited = false, validTiming = true, showPublishingActions = true }: {
  localPromotion?: LocalPromotion; visual?: CampaignVisual; channels: PlanChannel[]; merchantId: string; merchantName: string; message: string; windowLabel: string; budget: number;
  onChannelsChange?: (channels: PlanChannel[]) => void;
  onMessageChange?: (value: string) => void; edited?: boolean; validTiming?: boolean; showPublishingActions?: boolean;
}) {
  const id = useId();
  const { accounts, state } = useChannelAccounts(merchantId);
  const [selected, setSelected] = useState<PlanChannel | undefined>(channels[0]);
  const channel = selected && channels.includes(selected) ? selected : channels[0];
  const [focused, setFocused] = useState(false);
  if (!channel) return <p className="notice" role="status">Select a channel in “Edit plan” to preview your message.</p>;
  const finalMessage = `${message.trim()}\n${windowLabel}`;
  return <div className="channel-composer">
    <div className="composer-label"><strong>Where to publish</strong><span>Select a destination to preview</span></div>
    <div className="channel-picker" role="group" aria-label="Preview a campaign channel">
      {channels.map(c => <button key={c} type="button" aria-pressed={c === channel} aria-controls={id} onClick={() => setSelected(c)}>
        <ChannelIcon channel={c}/><span><strong>{CHANNELS[c]}</strong><small>{status[c]}</small></span>
      </button>)}
    </div>
    {onChannelsChange && CHANNEL_IDS.filter(c => c !== "geofenced_ad").some(c => !channels.includes(c as PlanChannel)) && <div className="channel-add-social"><span>Add a destination</span>{CHANNEL_IDS.filter(c => c !== "geofenced_ad" && !channels.includes(c)).map(c => <button type="button" key={c} onClick={() => { onChannelsChange([...channels, c]); setSelected(c); }}><ChannelIcon channel={c}/>+ {CHANNELS[c]}</button>)}</div>}
    <DestinationHeading localPromotion={localPromotion} channel={channel} merchantId={merchantId} merchantName={merchantName} accounts={accounts} state={state}/>
    <div id={id} className={`channel-stage stage-${channel}`} role="region" aria-label={`${CHANNELS[channel]} message preview`}>
      <div className="channel-preview-top"><span>{channel === "storefront" ? "At your door" : channel === "whatsapp" ? "To your regulars" : channel === "google_post" ? "Business update" : channel === "instagram" ? "Instagram · caption preview" : channel === "facebook" ? "Facebook · post preview" : channel === "tiktok" ? "TikTok · caption preview" : channel === "snapchat" ? "Snapchat · Story text" : "Local ad · creative draft"}</span><span>{onMessageChange ? edited ? "Your touch added" : "Editable preview" : "Preview"}</span></div>
      <div className={`channel-artwork ${focused ? "is-editing" : ""}`}>
        <div className="channel-identity">{channel !== "storefront" && <span className="channel-merchant-avatar">{merchantName.slice(0, 1)}</span>}<strong>{merchantName}</strong>{channel === "geofenced_ad" && <small>Sponsored · draft</small>}</div>
        {visual && channel !== "storefront" ? <img className="channel-attached-visual" src={visual.dataUrl} alt="Attached campaign visual"/> : ["instagram", "tiktok", "snapchat"].includes(channel) && <div className="channel-image-needed"><Icon name="camera" size={20}/><span>Add your photo or video in {CHANNELS[channel]}</span></div>}
        <div className="channel-message-body">
          {onMessageChange ? <><label htmlFor={`${id}-message`} className="channel-edit-hint sr-only">{edited ? "Your touch added" : "Your message · edit here"}</label><textarea id={`${id}-message`} aria-label={`Campaign message for ${CHANNELS[channel]}`} maxLength={1200} rows={3} value={message} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={e => onMessageChange(e.target.value)}/></> : <p className="channel-final-message">{message}</p>}
          <p className="channel-preview-time">{windowLabel}</p>
        </div>
        {channel === "geofenced_ad" && <div className="channel-ad-limit">US${budget} maximum media budget · not running</div>}
      </div>
    </div>
    {!showPublishingActions && channel === "google_post" && googlePromotionNote(message) && <p className="channel-content-note">{googlePromotionNote(message)} <a href="https://support.google.com/business/answer/7400114" target="_blank" rel="noreferrer">Google post policy ↗</a></p>}
    {showPublishingActions && <DestinationActions localPromotion={localPromotion} channel={channel} merchantId={merchantId} merchantName={merchantName} accounts={accounts} state={state} text={finalMessage} validTiming={validTiming}/>}
  </div>;
}
