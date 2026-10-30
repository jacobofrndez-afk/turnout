"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
import type { EventPotential as Potential } from '@/lib/event-potential';

export function EventPotential({ merchantId, eventId, href, initial, onChecked, compact = false }: {
  merchantId: string; eventId: string; href: string; initial?: Potential; onChecked?: (potential: Potential) => void; compact?: boolean;
}) {
  const [potential,setPotential] = useState(initial);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function check() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/events/potential', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchant: merchantId, event: eventId }) });
      if (response.status === 429) throw new Error('A few Qloo checks are already running. Try again in a minute.');
      const data = await response.json();
      if (!response.ok || !data.potential) throw new Error(data.error || 'Qloo could not complete this check. Please try again.');
      setPotential(data.potential); onChecked?.(data.potential);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not check this event.'); }
    finally { setBusy(false); }
  }
  return <div className={`event-potential ${compact ? 'event-potential-compact' : ''}`} aria-label="Campaign potential">
    {potential ? <>
      <div className="event-potential-top"><div className="event-potential-number"><span>Potential</span><strong>{potential.score ?? '—'}{potential.score !== null && <small>/100</small>}</strong></div><div className="event-potential-choice"><span className="event-qloo-label"><Icon name="spark" size={13}/>Qloo-informed · {potential.label}</span>{potential.offer && <strong>{potential.offer.title}<span>{potential.offer.price}</span></strong>}</div></div>
      {!compact && <><p className="event-potential-reason">{potential.reason}</p><details className="event-potential-details"><summary>Why this potential?</summary><p>{potential.reason} References searched within {potential.radiusM / 1000} km of your place.</p>{potential.factors.map(f => <div className="event-potential-factor" key={f.label}><span>{f.label}</span><b>{f.points}/{f.max}</b></div>)}<p>Turnout relevance index informed by Qloo, your menu and timing. Not a Qloo success probability or a sales forecast. {potential.campaignId ? 'Based on your prepared campaign.' : 'An initial offer match; the campaign agent may refine it.'} Confirm opening hours and stock.</p></details></>}
      <Link href={potential.campaignId ? `/today?merchant=${merchantId}&event=${encodeURIComponent(eventId)}` : href} prefetch={false} className="event-potential-action">{potential.campaignId ? 'Review campaign' : potential.score !== null ? 'Prepare campaign' : 'Explore this event'}<Icon name="arrow" size={14}/></Link>
    </> : <div className="event-potential-unchecked"><div><span className="event-qloo-label"><Icon name="spark" size={13}/>Campaign potential</span>{!compact && <p>Match this audience with your menu before deciding.</p>}</div><button type="button" onClick={check} disabled={busy} aria-busy={busy}>{busy ? 'Checking Qloo…' : 'Check with Qloo'}{!busy && <Icon name="arrow" size={14}/>}</button></div>}
    <div role="status">{busy && <p className="event-potential-status">Comparing audience tastes, nearby places and your menu. No campaign is created.</p>}</div>
    {error && <p className="event-potential-error" role="alert">{error}</p>}
  </div>;
}
