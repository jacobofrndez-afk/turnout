"use client";
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// What the agent actually does, in order. The clock only chooses which line is lit: nothing is claimed as finished.
const STEPS = [
 { at: 0, title: 'Reading this crowd with Qloo', detail: 'Tastes, demographics and the places they already like near you' },
 { at: 8, title: 'Matching your menu to their tastes', detail: 'Every offer scored against the crowd, your signature included' },
 { at: 13, title: 'Ranking the channels for this crowd', detail: 'Qloo brand affinity across six platforms, plus timing and format' },
 { at: 17, title: 'Writing the campaign in your voice', detail: 'Claude, briefed with your place DNA and the Qloo evidence' },
 { at: 38, title: 'Setting the window and the budget', detail: 'A start you can still prepare for, a cap you control' },
];

export function AgentWorking({ startedAt, label }: { startedAt: number; label: string }) {
 const [now, setNow] = useState(startedAt);
 useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
 const elapsed = Math.max(0, Math.round((now - startedAt) / 1000));
 const active = STEPS.reduce((current, step, index) => elapsed >= step.at ? index : current, 0);
 return <div className="agent-working" role="status" aria-live="polite">
  <div className="agent-working-pulse" aria-hidden="true"><span/><span/><span/><i><Icon name="spark" size={18}/></i></div>
  <div className="agent-working-body">
   <div className="agent-working-head"><div><strong>Your agent is working.</strong><small>{label}</small></div><span>{elapsed}s</span></div>
   <ol className="agent-working-steps">{STEPS.map((step, index) => <li key={step.title} className={index < active ? 'is-done' : index === active ? 'is-active' : ''}><span className="agent-working-mark">{index < active ? <Icon name="check" size={11}/> : <i/>}</span><div><strong>{step.title}</strong><small>{step.detail}</small></div></li>)}</ol>
   <div className="agent-working-bar"><i/></div>
   <p>{elapsed >= 75 ? 'Taking longer than usual. Still working; nothing is sent or charged.' : 'Usually under a minute. Nothing is sent or charged.'}</p>
  </div>
 </div>;
}
