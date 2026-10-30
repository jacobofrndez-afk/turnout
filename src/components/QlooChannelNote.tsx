import { platformAffinity, usableChannelAffinity } from '@/lib/channel-affinity';
import type { AgentWorkspace } from '@/lib/agent-workspace';
import type { PlanChannel } from '@/lib/campaign-plan';
import { Icon } from './Icon';

/** What Qloo says about this channel for this crowd, or honestly which rule chose it instead. */
export function qlooChannelNote(workspace: AgentWorkspace, channel: PlanChannel, now: number): { qloo: boolean; text: string } {
 const profile = workspace.distribution.channelAffinity;
 if (channel === 'storefront') return { qloo: false, text: 'At your door · outside the platform comparison' };
 if (channel === 'geofenced_ad') {
  const places = workspace.proof.places.slice(0, 2);
  return places.length ? { qloo: true, text: `Qloo · around ${places.join(' & ')}` } : { qloo: false, text: 'A few blocks from the venue' };
 }
 const affinity = platformAffinity(profile, channel, now);
 if (affinity && usableChannelAffinity(profile, now)) return { qloo: true, text: `Qloo · #${affinity.rank} of ${profile!.rankings.length} platforms for ${profile!.contextLabel}` };
 return { qloo: false, text: 'Turnout · timing and format' };
}

export function QlooChannelNote({ workspace, channel, now }: { workspace: AgentWorkspace; channel: PlanChannel; now: number }) {
 const note = qlooChannelNote(workspace, channel, now);
 return <small className={`qloo-channel-note${note.qloo ? ' has-qloo' : ''}`}>{note.qloo && <Icon name="spark" size={11}/>}{note.text}</small>;
}
