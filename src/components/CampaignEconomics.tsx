"use client";
import { revenueScenario, type RevenueScenario } from "@/lib/campaign-creative";
import { Icon } from "./Icon";
export function CampaignEconomics({ price, scenario, spend, onChange }: { price: string | null; scenario: RevenueScenario; spend: string; onChange?: (value: RevenueScenario) => void }) {
  const revenue = revenueScenario(price, scenario);
  const hasAssumptions=scenario.basis==="owner",paid=spend!=="US$0";
  return <section className="campaign-economics" aria-label="Campaign spend and potential revenue">
    <div className="campaign-money"><span><Icon name="wallet" size={15}/>Media spend</span><strong>{paid?spend:"No ad budget"}</strong><small>{paid?"Planned cap · ad not running":"Organic only · no paid local reach"}</small></div>
    <div className="campaign-money revenue-money"><span><Icon name="spark" size={15}/>Potential revenue</span><strong>{hasAssumptions?revenue?.label??"Not estimated":"Not estimated"}</strong><small>{!hasAssumptions?"Audience & conversion data unavailable":revenue ? `${scenario.basis === "owner" ? "Your scenario" : "Example scenario"} · ${scenario.lowSales}–${scenario.highSales} offer sales` : "A single offer price is needed"}</small></div>
    <details className="revenue-assumptions"><summary>{onChange ? hasAssumptions?"Adjust revenue scenario":"Set a sales scenario" : "Revenue scenario assumptions"}<span>Illustrative, not a forecast</span></summary>
      <p>{revenue ? `${revenue.unitLabel} per offer sold × your assumed number of sales. A bundle counts as one sale.` : "Revenue can be calculated once the menu has a single, unambiguous price."} This is gross revenue before costs, not profit or incremental revenue. Qloo does not estimate these sales.</p>
      {onChange && <div className="revenue-inputs"><label>Lower sales estimate<input type="number" min={0} max={10000} step={1} value={scenario.lowSales} onChange={e => { const value = Math.max(0, Math.min(10000, Math.floor(Number(e.target.value)))); onChange({ lowSales: value, highSales: Math.max(value, scenario.highSales), basis: "owner" }); }}/></label><label>Upper sales estimate<input type="number" min={scenario.lowSales} max={10000} step={1} value={scenario.highSales} onChange={e => { const value = Math.max(scenario.lowSales, Math.min(10000, Math.floor(Number(e.target.value)))); onChange({ ...scenario, highSales: value, basis: "owner" }); }}/></label></div>}
      {onChange&&!hasAssumptions&&<button className="quiet-button" type="button" onClick={()=>onChange({...scenario,basis:"owner"})}>Use these sales assumptions</button>}
      <p>Media spend does not change the sales assumption. Actual campaign results are not connected yet.</p>
    </details>
  </section>;
}
