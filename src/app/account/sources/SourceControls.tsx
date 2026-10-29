"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SourceSettings, SourceKey } from "@/lib/source-settings";
import { Icon } from "@/components/Icon";
const options: {key:SourceKey;name:string;description:string;icon:"spark"|"calendar"|"voice"}[] = [
  {key:"trends",name:"National search trends",description:"Google Trends, filtered against the food and drink on your menu.",icon:"spark"},
  {key:"openAgenda",name:"Independent local agendas",description:"OpenAgenda exhibitions, concerts and cultural venues. Greater Paris coverage.",icon:"calendar"},
  {key:"social",name:"Public social listening",description:"Recent Bluesky posts from the publishers you choose below.",icon:"voice"},
];
export function SourceControls({merchantId,initial}:{merchantId:string;initial:SourceSettings}) {
  const router = useRouter(); const [settings,setSettings]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[handle,setHandle]=useState("");
  async function change(input:object) {
    setBusy(true);setError("");setMessage("");
    try {
      const response=await fetch(`/api/merchants/${encodeURIComponent(merchantId)}/sources`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,version:settings.version})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save. Try again.");
      setSettings(result);setHandle("");setMessage("Saved. Today will use these sources.");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not save. Try again.");}finally{setBusy(false);}
  }
  return <section className="surface source-settings"><div className="section-title"><h2>What informs your campaigns</h2><span className="status-chip">Per place</span></div>
    <div className="source-switches">{options.map(option=><div className="source-switch-row" key={option.key}><span className="icon-tile"><Icon name={option.icon}/></span><div><strong id={`source-label-${option.key}`}>{option.name}</strong><p>{option.description}</p></div><button type="button" className="source-switch" role="switch" aria-labelledby={`source-label-${option.key}`} aria-checked={settings[option.key]} disabled={busy} onClick={()=>change({action:"toggle",key:option.key,enabled:!settings[option.key]})}><span/></button></div>)}</div>
    <div className="source-follow"><h3>Whose voice matters around you?</h3><p>Follow organisers, cultural venues or neighbourhood publishers on Bluesky. We read their public posts; this does not connect your own account.</p>
      {settings.accounts.length>0?<ul>{settings.accounts.map(account=><li key={account.did}><div><a href={`https://bsky.app/profile/${account.did}`} target="_blank" rel="noreferrer">{account.name} ↗</a><small>@{account.handle}</small></div><button className="source-remove" type="button" disabled={busy} onClick={()=>change({action:"remove",did:account.did})} aria-label={`Remove ${account.name}`}>Remove</button></li>)}</ul>:<p className="source-empty">No publisher followed for this place yet.</p>}
      <form onSubmit={e=>{e.preventDefault();void change({action:"follow",handle});}}><label htmlFor="public-handle">Bluesky handle</label><div><input className="field" id="public-handle" value={handle} onChange={e=>setHandle(e.target.value)} placeholder="e.g. paris.fr" maxLength={253} autoCapitalize="none" autoCorrect="off" disabled={busy||settings.accounts.length>=5} required/><button className="action-button secondary" disabled={busy||settings.accounts.length>=5||!handle.trim()}>Follow <Icon name="plus" size={16}/></button></div><small>Up to five accounts. Add public handles only; never enter a password or API key.</small></form>
    </div><p className="source-save" role="status" aria-live="polite">{busy?"Saving…":message}</p>{error&&<p className="notice" role="alert">{error}</p>}
  </section>;
}
