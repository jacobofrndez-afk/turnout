import { localTimeToInstant, planWindowLabel } from './campaign-plan';
export type CampaignBoardData = {
 campaignId:string;merchantId:string;merchantName:string;address?:string|null;
 message:string;offerTitle:string;price:string;startLocal:string;endLocal:string;timezone:string;
};
export function boardWindow(board:Pick<CampaignBoardData,'startLocal'|'endLocal'|'timezone'>){
 try{return planWindowLabel(localTimeToInstant(board.startLocal,board.timezone),localTimeToInstant(board.endLocal,board.timezone),board.timezone);}
 catch{return 'Set the campaign time before printing.';}
}
