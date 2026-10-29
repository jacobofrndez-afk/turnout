import type { PlanChannel } from './campaign-plan';
import type { IntelligenceSource } from './qloo-intelligence';

export const QLOO_CHANNELS = [
  { channel: 'instagram', name: 'Instagram' }, { channel: 'facebook', name: 'Facebook' },
  { channel: 'tiktok', name: 'TikTok' }, { channel: 'whatsapp', name: 'WhatsApp' },
  { channel: 'snapchat', name: 'Snapchat' }, { channel: 'google_post', name: 'Google Maps' },
] as const;
export type AffinityChannel = typeof QLOO_CHANNELS[number]['channel'];
export type ChannelAffinity = { channel: AffinityChannel; entityId: string; name: string; affinity: number; rank: number };
export type ChannelAffinityProfile = {
  basis: 'audience' | 'references'; contextLabel: string;
  inputs: { id: string; name: string }[]; rankings: ChannelAffinity[]; source: IntelligenceSource;
};
export type CampaignChannelAffinities = { audiences: Record<string, ChannelAffinityProfile>; offers: Record<string, ChannelAffinityProfile> };

/** Only scored, resolved platform entities count; metadata and unknown entities never become evidence. */
export function parseChannelAffinities(value: unknown, resolved: {channel:AffinityChannel;id:string;name:string}[]): ChannelAffinity[] {
  if (!Array.isArray(value)) return [];
  const found = new Map<AffinityChannel, Omit<ChannelAffinity,'rank'>>();
  for (const row of value) {
    const match=resolved.find(r=>r.id.toLowerCase()===String(row?.entity_id).toLowerCase()),score=row?.query?.affinity;
    if (!match || typeof score!=='number' || !Number.isFinite(score) || score<0 || score>1 || found.has(match.channel)) continue;
    found.set(match.channel,{channel:match.channel,entityId:match.id,name:match.name,affinity:score});
  }
  const sorted=[...found.values()].sort((a,b)=>b.affinity-a.affinity);
  return sorted.map((r,i)=>({...r,rank:sorted.findIndex(x=>Math.abs(x.affinity-r.affinity)<1e-8)+1}));
}
export function usableChannelAffinity(profile:ChannelAffinityProfile|undefined,now:number) {
  const at=Date.parse(profile?.source.retrievedAt??'');
  return !!profile && profile.source.status==='available' && profile.rankings.length>=2 && Number.isFinite(at) && at<=now+60000 && now-at<=7*86400000;
}
export function platformAffinity(profile:ChannelAffinityProfile|undefined,channel:PlanChannel,now:number) {
  return usableChannelAffinity(profile,now)?profile!.rankings.find(r=>r.channel===channel):undefined;
}
export function selectChannelAffinity(profiles:CampaignChannelAffinities|undefined,offerId:string,audienceId?:string) {
  // If an audience read failed, keep its explicit status instead of silently substituting a different population.
  return audienceId?profiles?.audiences[audienceId]:profiles?.offers[offerId];
}
