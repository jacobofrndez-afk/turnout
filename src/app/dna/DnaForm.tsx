"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { DnaSchema, CHANNELS, VOICES, GOALS, campaignExample, type PlaceDna, type DnaRecord, type MenuOffer } from "@/lib/place-dna";
const STEPS = ["Your place", "Your voice", "Your preferences"];
export function DnaForm({ merchant, merchants, record, offers, eventId, initialStep = 0 }: { merchant: { id: string; name: string; city: string }; merchants: { id: string; name: string }[]; record: DnaRecord; offers: MenuOffer[]; eventId?: string; initialStep?: number }) {
  const router = useRouter(); const form = useRef<HTMLFormElement>(null); const title = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState(record); const [profile, setProfile] = useState(record.profile);
  const [step, setStep] = useState(initialStep); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const dirty = JSON.stringify(profile) !== JSON.stringify(saved.profile);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    const leave = (e: MouseEvent) => { const a = (e.target as Element).closest?.("a[href]"); if (dirty && a && !e.ctrlKey && !e.metaKey && !window.confirm("Leave without saving your DNA changes?")) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", leave, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", leave, true); };
  }, [dirty]);
  useEffect(() => { if (title.current && step !== initialStep) title.current.focus(); }, [step, initialStep]);
  function set<K extends keyof PlaceDna>(key: K, value: PlaceDna[K]) { setProfile(p => ({ ...p, [key]: value })); setSuccess(false); setError(""); }
  const offer = offers.find(o => o.id === profile.signatureOfferId); const preview = offer ? campaignExample(profile, offer) : undefined;
  function go(next: number) { if (next > step && !form.current?.reportValidity()) return; setError(""); setStep(next); }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (step < 2) { go(step + 1); return; }
    const valid = DnaSchema.safeParse(profile);
    if (!valid.success) { const issue = valid.error.issues[0]; const key = String(issue.path[0]); setStep(["positioning", "audience", "goal", "signatureOfferId"].includes(key) ? 0 : ["voice", "exampleLine"].includes(key) ? 1 : 2); setError(key === "channels" ? "Choose at least one channel for your campaign drafts." : issue.message); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/merchants/${merchant.id}/dna`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, version: saved.version }) });
      const body = await res.json().catch(() => ({ error: "Could not save. Your changes are still here. Try again in a moment." }));
      if (!res.ok) throw new Error(body.error ?? "Could not save. Try again.");
      setSaved(body as DnaRecord); setProfile((body as DnaRecord).profile); setSuccess(true); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save. Your changes are still here."); } finally { setBusy(false); }
  }
  return <>
    <header className="dna-heading"><p className="eyebrow">Account / Place DNA</p><h1 className="t-display">Your place DNA</h1><p className="t-lead">Three quick checks. Every campaign starts with what makes you, you.</p></header>
    <div className="dna-place"><label>Place<select aria-label="Place" className="field" value={merchant.id} disabled={busy} onChange={e => { if (!dirty || window.confirm("Leave without saving your DNA changes?")) router.push(`/dna?merchant=${e.target.value}`); }}>{merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><span className="dna-status">{saved.status === "suggested" ? "Ready for review" : `Saved · version ${saved.version}`}</span></div>
    {success && <div className="dna-success" role="status"><Icon name="check"/><div><strong>Your DNA is saved.</strong><p>New campaigns will use these preferences.</p><Link className="text-link" href={eventId ? `/campaigns/new?merchant=${merchant.id}&event=${encodeURIComponent(eventId)}` : `/dna/campaigns?merchant=${merchant.id}`}>{eventId ? "Continue with your event" : "Preview your campaign"}<Icon name="arrow" size={16}/></Link></div></div>}
    <nav className="dna-steps" aria-label="DNA steps">{STEPS.map((name, i) => <button key={name} type="button" disabled={busy} aria-current={step === i ? "step" : undefined} onClick={() => go(i)}><span>{i + 1}</span>{name}</button>)}</nav>
    <form ref={form} onSubmit={submit} className="dna-grid dna-wizard">
      <div className="dna-fields"><fieldset disabled={busy}><h2 ref={title} tabIndex={-1} className="wizard-title">{step === 0 ? "What brings people through your door?" : step === 1 ? "How would you say it?" : "What works for your business?"}</h2><p className="wizard-description">{step === 0 ? "A few essentials to choose offers that belong in your place." : step === 1 ? "Your messages should sound like you. The preview changes as you edit." : "Set sensible defaults. You can refine them for each campaign."}</p>
      {step === 0 && <section className="dna-section">
        <label>Describe your place<textarea className="field" rows={3} required minLength={10} maxLength={240} value={profile.positioning} onChange={e => set("positioning", e.target.value)} /></label>
        <label>Who you want to welcome<input className="field" required minLength={3} maxLength={180} value={profile.audience} onChange={e => set("audience", e.target.value)} /><small>Your intended customers, not a measured audience.</small></label>
        <label>Your main focus<select className="field" value={profile.goal} onChange={e => set("goal", e.target.value as PlaceDna["goal"])}>{Object.entries(GOALS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Your signature offer<select className="field" required value={profile.signatureOfferId} onChange={e => set("signatureOfferId", e.target.value)}>{!offers.length && <option value="">Add an offer first</option>}{offers.map(o => <option key={o.id} value={o.id}>{o.title}{o.price ? ` · ${o.price}` : ""}</option>)}</select></label>
      </section>}
      {step === 1 && <section className="dna-section"><p className="wizard-label">Your tone of voice</p><div className="dna-choices" role="group" aria-label="Tone of voice">{Object.entries(VOICES).map(([id,label]) => <button key={id} type="button" aria-pressed={profile.voice === id} onClick={() => set("voice", id as PlaceDna["voice"])}><Icon name="voice" size={17}/>{label}</button>)}</div><label>A line you would actually say<textarea className="field" required minLength={3} maxLength={180} rows={3} value={profile.exampleLine} onChange={e => set("exampleLine", e.target.value)} /><small>A phrase you could say to a guest, in your own words.</small></label><div className="wizard-tip"><Icon name="spark"/><p>Found better wording in a campaign? Choose to remember it. Your DNA keeps getting more personal.</p></div></section>}
      {step === 2 && <section className="dna-section"><div className="dna-pair"><label>Daily ad ceiling · US$<input className="field" type="number" required min={0} max={200} step={1} value={profile.dailyBudgetUsd} onChange={e => set("dailyBudgetUsd", Number(e.target.value))} /><small>Paid media only. No spending starts here.</small></label><label>Preparation · minutes<input className="field" type="number" required min={5} max={1440} step={1} value={profile.leadMinutes} onChange={e => set("leadMinutes", Number(e.target.value))} /></label></div><fieldset className="dna-channels"><legend>Channels to prepare for</legend>{Object.entries(CHANNELS).map(([id,label]) => <label key={id}><input type="checkbox" checked={profile.channels.includes(id as PlaceDna["channels"][number])} onChange={e => set("channels", e.target.checked ? [...profile.channels, id as PlaceDna["channels"][number]] : profile.channels.filter(c => c !== id))}/>{label}</label>)}</fieldset><p className="wizard-description">Channel preferences only. Connecting an account and publishing are separate steps.</p><label>Your non-negotiables<textarea className="field" rows={3} maxLength={300} value={profile.boundaries} onChange={e => set("boundaries", e.target.value)}/><small>For example: no discounts, no promotions before opening.</small></label></section>}
      </fieldset>{error && <p role="alert" className="dna-error">{error}</p>}<div className="wizard-actions"><button type="button" className="action-button secondary" onClick={() => go(step - 1)} disabled={step === 0 || busy}>Back</button><span>{step + 1} of 3{dirty ? " · Unsaved" : ""}</span><button className="action-button" disabled={busy || !offers.length}>{busy ? "Saving…" : step === 2 ? "Save my DNA" : "Continue"}<Icon name={step === 2 ? "check" : "arrow"} size={17}/></button></div></div>
      <aside className="dna-preview"><details className="wizard-preview" open><summary><Icon name="campaign"/>Your message preview</summary><p className="preview-caption">Illustrative copy · {merchant.name}</p>{preview && <><blockquote>{preview.message}</blockquote><div className="preview-channels">{profile.channels.map(c => <span key={c}>{CHANNELS[c]}</span>)}</div><p className="preview-caption">{profile.leadMinutes} min preparation · {preview.budget ? `US$${preview.budget}/day ad cap` : "No paid media"}</p></>}<p className="preview-caption">Uses your saved menu price. No event, sales forecast or scheduled delivery is implied.</p></details></aside>
    </form>
  </>;
}
