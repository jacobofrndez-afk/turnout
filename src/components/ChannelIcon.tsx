import type { PlanChannel } from "@/lib/campaign-plan";
import { SocialIcon } from "./SocialIcon";
import { Icon } from "./Icon";

export function ChannelIcon({ channel }: { channel: PlanChannel }) {
  if (channel === "instagram" || channel === "facebook") return <SocialIcon provider={channel}/>;
  return <span className={`channel-icon channel-icon-${channel}`} aria-hidden="true">
    {channel === "tiktok" ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v12.5a4.5 4.5 0 1 1-4-4.47M14 3c0 4 3 6 6 6V6c-2 0-3-1-3-3Z"/></svg> : channel === "snapchat" ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10V8a5 5 0 0 1 10 0v2l2-1 1 2-3 2c0 2 2 4 4 4l-1 2-3 .5-1 1.5-4-1-4 1-1-1.5-3-.5-1-2c2 0 4-2 4-4l-3-2 1-2Z"/></svg> : channel === "google_post" ? <b>G</b> : channel === "whatsapp" ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a8 8 0 0 1-12 7L3 20l1.5-5a8 8 0 1 1 15.5-3.5Z"/><path d="m8 7 2 3-1 1c1 2 2 3 4 3l1-1 3 2c-1 3-4 2-7 0s-4-6-2-8Z"/></svg> : <Icon name={channel === "storefront" ? "menu" : "pin"} size={19}/>}</span>;
}
