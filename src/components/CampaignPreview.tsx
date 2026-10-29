import { nb } from "@/lib/nbsp";
import { plainList } from "@/lib/text";
import type { CampaignDraft } from "@/server/agent/schema";
import { type ChannelId, type SendRow } from "@/server/channels";
import { whatsappConfigured } from "@/server/channels/twilio";
import { snapConfigured } from "@/server/channels/snapchat";
import { CampaignDestinations } from "./CampaignDestination";
import { CopyText } from "./CopyText";
import { receiptLabel } from '@/lib/agent-workspace';
const order: ChannelId[] = [
  "storefront",
  "instagram",
  "facebook",
  "tiktok",
  "snapchat",
  "whatsapp",
  "geofenced_ad",
  "google_post",
  "dooh",
];
const names: Record<ChannelId, string> = {
  instagram: "Instagram caption",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  facebook: "Facebook Page post",
  storefront: "At your door",
  whatsapp: "WhatsApp message",
  geofenced_ad: "Nearby ad",
  google_post: "Google listing",
  dooh: "Street screen",
};
export function CampaignPreview({
  draft,
  merchantName,
  merchantId,
  channels,
  sends = [],
  validTiming = true,
}: {
  draft: CampaignDraft;
  merchantName: string;
  merchantId: string;
  channels: string[];
  sends?: SendRow[];
  validTiming?: boolean;
}) {
  return (
    <><div className="channel-grid">
      {order
        .filter(
          (c) =>
            c === "storefront" ||
            channels.includes(c) ||
            sends.some((s) => s.channel === c),
        )
        .map((channel) => {
          const send = sends.find((s) => s.channel === channel);
          const live =
            channel === "whatsapp"
              ? whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO)
              : channel === "geofenced_ad" &&
                draft.geofenced_ad.platform === "snapchat" &&
                snapConfigured();
          const failed = send?.status.startsWith("failed");
          const status = send ? receiptLabel(send) : channel === "storefront"
                  ? "Write it on your board"
                  : live
                    ? channel === "whatsapp"
                      ? "Demo number only"
                      : "Will be created paused"
                    : "Preview · not connected";
          const text =
            channel === "storefront"
              ? draft.storefront.chalkboard
              : channel === "whatsapp"
                ? draft.whatsapp.message
                : channel === "geofenced_ad"
                  ? `${draft.geofenced_ad.headline}\n${draft.geofenced_ad.body}`
                  : (channel === "google_post" || channel === "instagram" || channel === "facebook" || channel === "tiktok" || channel === "snapchat")
                    ? `${draft.google_post.title}\n${draft.google_post.body}\n${draft.google_post.offer_terms}`
                    : `${draft.dooh.headline}\n${draft.dooh.body}`;
          return (
            <article className="channel-card" key={channel}>
              <div className="channel-heading">
                <h3>{names[channel]}</h3>
                <CopyText text={text} />
              </div>
              <p className={`channel-status${failed ? " channel-failed" : ""}`}>
                {status}
              </p>
              <div className="channel-art">
                {channel === "storefront" ? (
                  <div className="preview preview-board">
                    <p className="t-name whitespace-pre-wrap">{nb(text)}</p>
                  </div>
                ) : channel === "whatsapp" ? (
                  <div className="preview preview-bubble">
                    <p className="t-body whitespace-pre-wrap">{nb(text)}</p>
                  </div>
                ) : channel === "geofenced_ad" ? (
                  <div className="preview">
                    <p className="preview-by">{merchantName} · Sponsored</p>
                    <p className="t-name mt-3">
                      {nb(draft.geofenced_ad.headline)}
                    </p>
                    <p className="t-body mt-2">{nb(draft.geofenced_ad.body)}</p>
                  </div>
                ) : (channel === "google_post" || channel === "instagram" || channel === "facebook" || channel === "tiktok" || channel === "snapchat") ? (
                  <div className="preview">
                    <p className="t-name">{nb(draft.google_post.title)}</p>
                    <p className="t-body mt-2">{nb(draft.google_post.body)}</p>
                  </div>
                ) : (
                  <div className="preview preview-screen">
                    <p className="t-name">{nb(draft.dooh.headline)}</p>
                    <p className="t-body mt-2">{nb(draft.dooh.body)}</p>
                  </div>
                )}
              </div>
              <p className="channel-note">
                {channel === "storefront"
                  ? `Tell your staff: “${draft.storefront.staff_line}”`
                  : channel === "whatsapp"
                    ? "The demo can send to one configured test number. Customer lists are never messaged."
                    : channel === "geofenced_ad"
                      ? `${draft.geofenced_ad.platform === "meta" ? "Meta" : "Snapchat"} · ${draft.geofenced_ad.radius_m} m around your place · budget proposal $${draft.geofenced_ad.daily_budget_usd}/day. Interests: ${plainList(draft.geofenced_ad.interests)}. Activation is a separate step in Ads Manager.`
                      : channel === "instagram" || channel === "facebook" || channel === "tiktok" || channel === "snapchat"
                        ? "Manual posting only. Review your account and destination below."
                      : channel === "google_post"
                        ? "Copy this to your Google listing. Turnout does not post it automatically."
                        : "Screen preview only. No screen network is connected."}
              </p>
              {failed && (
                <p className="channel-note channel-failed">
                  Delivery did not complete. No automatic retry is scheduled.
                </p>
              )}
              {send && (
                <details className="mt-3">
                  <summary className="link text-sm">Delivery details</summary>
                  <pre className="mt-3 max-h-64 overflow-auto text-sm">
                    {JSON.stringify(
                      {
                        status: send.status,
                        simulated: Boolean(send.simulated),
                        payload: send.payload_json
                          ? JSON.parse(send.payload_json)
                          : null,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              )}
            </article>
          );
        })}
    </div><CampaignDestinations validTiming={validTiming} channels={channels.filter((c): c is Exclude<ChannelId, "dooh"> => ["instagram", "facebook", "tiktok", "snapchat", "google_post", "whatsapp", "storefront", "geofenced_ad"].includes(c))} merchantId={merchantId} merchantName={merchantName} messages={{storefront:draft.storefront.chalkboard,whatsapp:draft.whatsapp.message,geofenced_ad:`${draft.geofenced_ad.headline}\n${draft.geofenced_ad.body}`}} text={`${draft.google_post.title}\n${draft.google_post.body}\n${draft.google_post.offer_terms}`}/></>
  );
}
