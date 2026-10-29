import type { CSSProperties } from "react";
export type IconName = "home" | "calendar" | "campaign" | "account" | "camera" | "arrow" | "chevron" | "pin" | "clock" | "spark" | "sun" | "rain" | "coffee" | "menu" | "check" | "settings" | "ticket" | "plus" | "voice" | "wallet";
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2m-8 3h2"/></>,
  campaign: <><path d="m3 10 15-6v16L3 14Zm15-2 3 1v6l-3 1M6 15l1 6h4l-1-5"/></>,
  account: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  camera: <><path d="M8 6 9.5 3h5L16 6h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="M20 2v4m-2-2h4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  rain: <><path d="M6 15a4 4 0 0 1-1-8 6 6 0 0 1 11-2 5 5 0 0 1 2 10M8 18l-1 3m6-3-1 3m6-3-1 3"/></>,
  coffee: <><path d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5Zm13 1h2a3 3 0 0 1 0 6h-2M6 3v2m4-3v3m4-2v2M2 23h16"/></>,
  menu: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8m-8 5h8m-8 4h5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
  ticket: <><path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z"/><path d="M15 7v3m0 3v2m0 2v2"/></>,
  plus: <path d="M12 4v16M4 12h16"/>,
  voice: <><path d="M5 9v6m4-10v14m4-16v18m4-15v12m4-9v6"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M17 5V2L3 5m18 6h-6v4h6"/></>,
};
export function Icon({ name, size = 20, style, className = "" }: { name: IconName; size?: number; style?: CSSProperties; className?: string }) {
  return <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>{paths[name]}</svg>;
}
