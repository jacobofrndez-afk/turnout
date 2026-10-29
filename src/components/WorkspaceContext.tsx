import MerchantSwitch from "@/app/radar/MerchantSwitch";
import { Icon } from "./Icon";
import type { Merchant } from "@/server/events/radar";
export function WorkspaceContext({ merchant, merchants, destination }: { merchant: Merchant; merchants: Merchant[]; destination: string }) {
  return <div className="place-context"><div className="place-context-main"><span className="place-avatar"><Icon name="pin" /></span><div><MerchantSwitch current={merchant.id} destination={destination} options={merchants.map(m => ({ id: m.id, label: m.name }))} />{merchants.length < 2 && <strong>{merchant.name}</strong>}<p>{merchant.city} · {["m_penn_pour", "m_quai_bercy"].includes(merchant.id) ? "Demo place" : "Your place"}</p></div></div><span className="context-note">Your local marketing workspace</span></div>;
}
