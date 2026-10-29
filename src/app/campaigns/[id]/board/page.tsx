import Link from 'next/link';
import { notFound } from 'next/navigation';
import { preparedBoard } from '@/server/agent/board';
import { CampaignBoard } from '@/components/CampaignBoard';
import { BoardActions } from '@/components/BoardActions';
import { localTimeToInstant } from '@/lib/campaign-plan';
export const dynamic='force-dynamic';
export const metadata={title:'Your chalkboard · Turnout',robots:{index:false,follow:false}};

export default async function BoardPage({params}:{params:Promise<{id:string}>}){
 const board=preparedBoard((await params).id);if(!board)notFound();
 const expired=localTimeToInstant(board.endLocal,board.timezone)<Date.now();
 return <main className="board-page">
  <div className="board-page-heading"><Link className="text-link" href={`/campaigns/${board.campaignId}`}>← Back to your receipt</Link><h1>Your board, ready to print.</h1><p>{expired?'This campaign window has passed. This is the saved board.':'Approved words, price and campaign window.'}</p><BoardActions/></div>
  <CampaignBoard board={board}/>
 </main>;
}
