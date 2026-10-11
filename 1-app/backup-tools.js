import {prizes} from './rewards.js';
import {validateV2,validRecurrence} from './v2-state.js';
export const boardCollections=['tasks','side','wins','completionArchive','rewards','rooms','templates','homeless','shopping','appointments','errands','notes','householdPeople','notifications','settings','sideTabs'];
export function validateBackup(board){
 if(!board||typeof board!=='object'||Array.isArray(board))throw Error('Choose a Mission Control backup file.');
 if(board.schemaVersion!==undefined&&(!Number.isInteger(board.schemaVersion)||board.schemaVersion<1||board.schemaVersion>7))throw Error('This backup version is not supported.');
 for(const key of boardCollections){
  if(board[key]===undefined&&!['tasks','side','wins'].includes(key))continue;
  if(!Array.isArray(board[key])||board[key].some(t=>!t||typeof t!=='object'||typeof t.id!=='string'||!t.id))throw Error('Backup contains invalid '+key+'.');
  if(new Set(board[key].map(t=>t.id)).size!==board[key].length)throw Error('Backup contains duplicate '+key+'.');
 }
 for(const key of ['tasks','side','wins','templates','homeless'])for(const t of board[key]||[])if(typeof t.text!=='string')throw Error('Backup contains invalid '+key+'.');
 if(board.wins.some(t=>!Number.isFinite(Date.parse(t.at))))throw Error('Backup contains invalid completion dates.');
 if((board.rewards||[]).some(r=>!Number.isInteger(r.prizeIndex)||r.prizeIndex<0||r.prizeIndex>=prizes.length))throw Error('Backup contains invalid rewards.');
 validateV2(board);
 for(const t of board.settings||[])if(t.text!==undefined&&(!validRecurrence(t.recurrence)||typeof t.text!=='string'))throw Error('Backup contains invalid laundry task settings.');
 const rooms=new Set((board.rooms||[]).map(r=>r.id));
 for(const key of ['tasks','side','templates','homeless','settings']){
  const ids=new Set((board[key]||[]).map(t=>t.id));
  for(const t of board[key]||[]){const parent=key==='templates'?t.parentTemplateId:t.parentId;if(parent&&(!ids.has(parent)||parent===t.id))throw Error('Backup contains an invalid parent reference.');if(board.rooms&&t.roomId&&!rooms.has(t.roomId))throw Error('Backup contains an unknown room reference.');let p=t,seen=new Set();while(p){if(seen.has(p.id))throw Error('Backup contains a parent cycle.');seen.add(p.id);p=(board[key]||[]).find(x=>x.id===(key==='templates'?p.parentTemplateId:p.parentId))}}
 }
 return board;
}
export function backupPreview(current,incoming){return boardCollections.map(key=>{const before=new Set((current[key]||[]).map(x=>x.id)),after=new Set((incoming[key]||[]).map(x=>x.id));return {key,incoming:after.size,matching:[...after].filter(id=>before.has(id)).length,retained:[...before].filter(id=>!after.has(id)).length}}).filter(row=>row.incoming||row.retained)}
