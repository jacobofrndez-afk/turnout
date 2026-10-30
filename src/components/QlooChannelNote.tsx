import { platformAffinity, usableChannelAffinity } from '@/lib/channel-affinity';
import type { AgentWorkspace } from '@/lib/agent-workspace';
import type { PlanChannel } from '@/lib/campaign-plan';
import { Icon } from './Icon';

/** What Qloo says about this channel for this crowd, or honestly which rule chose it instead. */
export function qlooChannelNote(workspace: AgentWorkspace, channel: PlanChannel, now: number): { qloo: boolean; text: string; context?: string } {
 const profile = workspace.distribution.channelAffinity;
 if (channel === 'storefront') return { qloo: false, text: 'At your door', context: 'outside the platform comparison' };
 if (channel === 'geofenced_ad') {
  const places = workspace.proof.places.slice(0, 2);
  return places.length ? { qloo: true, text: 'Qloo · nearby places', context: `· ${places.join(' & ')}` } : { qloo: false, text: 'A few blocks from the venue' };
 }
 const affinity = platformAffinity(profile, channel, now);
 // "people who like Harry Styles" reads; "people who like Theatre crowd letting out" does not: long moment names become "this crowd".
 if (affinity && usableChannelAffinity(profile, now)) return { qloo: true, text: `Qloo · #${affinity.rank} of ${profile!.rankings.length} platforms`, context: `for ${profile!.contextLabel.length <= 32 ? profile!.contextLabel : 'this crowd'}` };
 return { qloo: false, text: 'Turnout · timing and format' };
}

export function QlooChannelNote({ workspace, channel, now }: { workspace: AgentWorkspace; channel: PlanChannel; now: number }) {
 const note = qlooChannelNote(workspace, channel, now);
 return <small className={`qloo-channel-note${note.qloo ? ' has-qloo' : ''}`}>{note.qloo && <Icon name="spark" size={11}/>}<span>{note.text}{note.context && <em className="qloo-context"> {note.context}</em>}</span></small>;
}
