import { BoardScreenExit } from './BoardActions';
import { boardWindow, type CampaignBoardData } from '@/lib/campaign-board';

export function CampaignBoard({board}:{board:CampaignBoardData}){
 return <article className="campaign-board" aria-label="Chalkboard preview">
  <BoardScreenExit/>
  <div className="board-place">{board.merchantName}</div>
  <p className="board-invitation">{board.message}</p>
  <div className="board-offer"><span>{board.offerTitle}</span><strong>{board.price}</strong></div>
  <div className="board-window">{boardWindow(board)}<small>{board.timezone}</small></div>
  {board.address&&<div className="board-address">{board.address}</div>}
 </article>;
}
