import type { LocalPromotion } from "./local-promotion";
import type { PlanChannel } from "./campaign-plan";
import type { ChannelAccount } from "./social-channels";
export type ConnectionState = "loading" | "ready" | "unavailable";
export type CampaignDestination = { title: string; format: string; status: string; help: string; accountHref?: string; accountAction?: string; links: { label: string; href: string }[]; needsImage?: boolean };
export function campaignDestination(channel: PlanChannel, merchantId: string, merchantName: string, accounts: ChannelAccount[], state: ConnectionState = "ready", promotion?: LocalPromotion): CampaignDestination {
  if (channel === "instagram" || channel === "facebook") {
    const account = state === "ready" ? accounts.find(a => a.provider === channel) : undefined;
    const label = channel === "instagram" ? "Instagram" : "Facebook", connected = account?.status === "connected";
    const identity = channel === "instagram" && account?.username ? `@${account.username}` : account?.name;
    const validName = account?.username && /^[a-zA-Z0-9._]+$/.test(account.username);
    const validPage = account && /^\d+$/.test(account.externalId);
    const href = channel === "instagram" ? connected && validName ? `https://www.instagram.com/${account!.username}/` : "https://www.instagram.com/" : connected && validPage ? `https://www.facebook.com/${account!.externalId}` : "https://business.facebook.com/";
    return {
      title: identity ?? (channel === "instagram" ? "Choose your Instagram account" : "Choose your Facebook Page"),
      format: channel === "instagram" ? "Feed post · caption" : "Page post · message",
      status: state === "loading" ? "Checking account…" : state === "unavailable" ? "Account status unavailable" : connected ? "Connected · manual posting" : account ? "Reconnect account" : "Account not connected",
      help: channel === "instagram" ? "Copy the caption, add a photo or video in Instagram, then review and publish from the right account." : "Copy the message, open your Page in Facebook and review the post before publishing.",
      accountHref: `/account?merchant=${encodeURIComponent(merchantId)}#channel-${channel}`,
      accountAction: state === "unavailable" ? "Check account" : connected ? "Manage account" : account ? `Reconnect ${label}` : `Connect ${label}`,
      links: [{ label: channel === "instagram" ? "Open Instagram" : connected ? "Open Facebook Page" : "Open Meta Business Suite", href }],
      needsImage: channel === "instagram",
    };
  }
  if (channel === "tiktok" || channel === "snapchat") return {
    title: channel === "tiktok" ? "Your TikTok profile" : "Your Snapchat profile",
    format: channel === "tiktok" ? "Photo post or short video · caption" : "Story · photo or vertical video",
    status: "Manual publishing · not connected",
    help: channel === "tiktok" ? "Film a short look at the offer, or use a photo. Add this caption in TikTok, check the audience and publish from your business profile." : "Create a photo or vertical video of the offer. Add the details to your Story in Snapchat and review the audience before sharing.",
    accountHref: `/account?merchant=${encodeURIComponent(merchantId)}#channel-${channel}`, accountAction: "Channel setup",
    links: [{ label: channel === "tiktok" ? "Open TikTok" : "Open Snapchat", href: channel === "tiktok" ? "https://www.tiktok.com/" : "https://www.snapchat.com/" }], needsImage: true,
  };
  if (channel === "storefront") return { title: `${merchantName} · at the entrance`, format: "Chalkboard · in person", status: "No account needed", help: "Write the offer, price and time on the board before service. Brief your team.", links: [] };
  if (channel === "whatsapp") return { title: "Your opted-in regulars", format: "WhatsApp Business · message", status: "Manual sharing · not connected", accountHref: `/account?merchant=${encodeURIComponent(merchantId)}#channel-whatsapp`, accountAction: "Channel setup", help: "Copy the message into WhatsApp Business. Choose only customers who agreed to hear from you, then review and send.", links: [{ label: "Open WhatsApp Web", href: "https://web.whatsapp.com/" }] };
  if (channel === "google_post") return { title: `${merchantName} · Google listing`, format: "Google Business Profile · update", status: "Profile not connected", accountHref: `/account?merchant=${encodeURIComponent(merchantId)}#channel-google_post`, accountAction: "Channel setup", help: "Copy the message, choose your real business profile and create an update. Demo places do not have a Google listing.", links: [{ label: "Open Google Business", href: "https://business.google.com/" }] };
  if(promotion)return {title:`${promotion.platform==="facebook"?"Facebook":"Instagram"} advertising account`,format:"Paid local ad · targeting draft",status:"Ad account not connected",help:`Configure the ${promotion.platform==="facebook"?"Facebook":"Instagram"} placement, request a ${promotion.radiusKm} km area around your place, and enter the campaign dates and total budget above. Confirm audience eligibility, supported targeting and platform review before launch.`,links:[{label:"Open Meta Ads Manager",href:"https://adsmanager.facebook.com/"}]};
  return { title: "Your advertising account", format: "Local paid ad · creative draft", status: "Ad account not connected", help: "Choose your ad platform, add the creative, local targeting, dates and the total budget shown above. Review the cost there before launching.", links: [{ label: "Meta Ads Manager", href: "https://adsmanager.facebook.com/" }, { label: "Snapchat Ads", href: "https://ads.snapchat.com/" }] };
}
