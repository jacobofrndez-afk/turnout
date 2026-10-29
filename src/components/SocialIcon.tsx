import type { SocialProvider } from "@/lib/social-channels";
export function SocialIcon({ provider }: { provider: SocialProvider }) {
  return <span className={`social-logo social-logo-${provider}`} aria-hidden="true">{provider === "instagram" ? <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg> : <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M14.2 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7H18V2.5c-.4-.1-1.6-.2-2.9-.2-2.9 0-4.8 1.7-4.8 4.8v2.4H7.1V13h3.2v9z"/></svg>}</span>;
}
