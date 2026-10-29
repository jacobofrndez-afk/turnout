import { getDb } from '@/server/db/client';
let active=0;

/** A persistent call ceiling shared by HTTP generation and background scans. */
export async function withGenerationBudget<T>(work:()=>Promise<T>):Promise<T>{
 if(active>=2)throw new Error('The demo is preparing two campaigns. Please try again shortly.');
 const db=getDb();
 db.exec('CREATE TABLE IF NOT EXISTS agent_budget (day TEXT PRIMARY KEY, calls INTEGER NOT NULL)');
 const requested=Number(process.env.AGENT_DAILY_LIMIT ?? 30);
 const limit=Number.isFinite(requested)&&requested>=0?Math.floor(requested):30;
 const reserved=db.transaction(()=>{
  const day=new Date().toISOString().slice(0,10);
  const count=(db.prepare('SELECT calls FROM agent_budget WHERE day=?').get(day) as {calls:number}|undefined)?.calls??0;
  if(count>=limit)return false;
  db.prepare('INSERT INTO agent_budget(day,calls) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1').run(day);
  return true;
 })();
 if(!reserved)throw new Error('The demo has reached its daily generation limit. Saved campaigns are still available.');
 // Failed provider requests still count: retries must not evade the spending guard.
 active++;
 try{return await work();}finally{active--;}
}
