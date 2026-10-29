import { CHANNELS } from '@/lib/place-dna';
import type { PlanChannel } from '@/lib/campaign-plan';
import { usableChannelAffinity, platformAffinity } from '@/lib/channel-affinity';
import type { DistributionRecommendation } from '@/lib/distribution-recommendation';
import { paidChannelReason } from '@/lib/channel-recommendation';
import { ChannelIcon } from './ChannelIcon';
import { Icon } from './Icon';

export function ChannelRecommendationReason({recommendation,primary,prepared,paid,now,timezone}:{recommendation:DistributionRecommendation;primary?:PlanChannel;prepared:boolean;paid:boolean;now:number;timezone:string}) {
 const profile=recommendation.channelAffinity;
 const usable=usableChannelAffinity(profile,now),affinity=primary?platformAffinity(profile,primary,now):undefined;
 const strategy=recommendation.strategy.find(c=>c.channel===primary);
 const top=usable?profile!.rankings[0]:undefined;
 const skipped=top&&top.channel!==primary?recommendation.strategy.find(c=>c.channel===top.channel):undefined;
 const context=profile?.basis==='audience'?profile.contextLabel:profile?.contextLabel.toLowerCase();
 return <div className="channel-choice-reason">
   <div className="channel-choice-label"><span className={usable?'has-qloo':''}>{usable?'Qloo + Turnout':'Turnout'}</span><strong>{prepared?'Why this channel?':'Your channel choice'}</strong></div>
   {affinity&&<p><strong>{affinity.name} is #{affinity.rank} of {profile!.rankings.length}</strong> for {context} in Qloo’s platform comparison.</p>}
   <p>{strategy?.constraint??(paid&&primary?paidChannelReason(primary,recommendation.hasVisual):strategy?.reason)??'Select a channel to see the suggested format and preparation.'}</p>
   {skipped?.constraint&&<p className="channel-choice-tradeoff">{top!.name} ranks higher in Qloo. {skipped.constraint}</p>}
   {!usable&&<small>Qloo channel affinity {profile?.source.status==='empty'?'returned too little evidence':profile?'is unavailable or out of date':'is not available for this offer'}. This choice uses your goal, timing and format.</small>}
   <details className="channel-affinity-comparison"><summary>Compare the 6 platforms <Icon name="chevron" size={13}/></summary>
     <div className="channel-affinity-list">{(['facebook','instagram','tiktok','whatsapp','snapchat','google_post'] as const).map(channel=>{
       const item=recommendation.strategy.find(c=>c.channel===channel)!;
       const q=platformAffinity(profile,channel,now),selected=channel===primary;
       return <div key={channel} className={selected?'is-chosen':''}><ChannelIcon channel={channel}/><div><strong>{CHANNELS[channel]}{selected&&<span>{prepared?'Selected':'Your choice'}</span>}</strong><small>{item.constraint??(selected?(paid?"Add your creative and configure the ad account before launch.":item.requirement):paid&&channel!=='facebook'&&channel!=='instagram'?'Available as an organic channel; paid setup here supports Facebook and Instagram.':item.reason)}</small></div><span className="affinity-rank">{q?`#${q.rank}`:'—'}<small>{q?'Qloo affinity':'No reading'}</small></span></div>;
     })}</div>
     <p>Qloo compares affinity with platform brands for {context??'this campaign'}. Turnout combines it with format, timing and your usual channels. Google Maps is a proxy for listing discovery. Affinity is not platform usage, ad reach or a conversion rate.</p>
     <p>Ranking uses a bounded Qloo contribution alongside planning rules. It does not increase the campaign potential index or the media cap.</p>
     {profile&&<p>Signal: {profile.inputs.map(i=>i.name).join(' · ')||'Unavailable'}.{profile.source.retrievedAt&&<> Checked {new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(profile.source.retrievedAt))}.</>} <a href="https://docs.qloo.com/reference/api-overview" target="_blank" rel="noreferrer">Qloo Insights ↗</a></p>}
   </details>
 </div>;
}
