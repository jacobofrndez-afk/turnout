"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon, type IconName } from "./Icon";
export function AppNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const merchant = params.get("merchant");
  const query = merchant ? `?merchant=${encodeURIComponent(merchant)}` : "";
  const items: { href: string; label: string; icon: IconName; active: boolean }[] = [
    { href: "/today", label: "Today", icon: "home", active: ["/today", "/radar", "/pulse"].includes(pathname) },
    { href: "/calendar", label: "Calendar", icon: "calendar", active: pathname === "/calendar" },
    { href: "/campaigns", label: "Campaigns", icon: "campaign", active: pathname.startsWith("/campaigns") || pathname === "/alerts" },
    { href: "/account", label: "Account", icon: "account", active: pathname.startsWith("/account") || pathname.startsWith("/dna") },
  ];
  return <><nav aria-label="Main navigation" className="workspace-nav">{items.map(item => <Link key={item.href} href={item.href + query} aria-current={item.active ? "page" : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link>)}</nav><Link href={`/campaigns/from-photo${query}`} className="workspace-create"><Icon name="plus" size={18} /><span>New campaign</span></Link></>;
}
