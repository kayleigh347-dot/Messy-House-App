// Kayleigh confirmed on 7 October 2026 that existing unrecorded completions were hers.
export const uniqueWins=state=>[...new Map((state.wins||[]).map(win=>[win.id,win])).values()];
export const hasRecordedPerson=win=>!!win.completedBy&&win.completedBy!=='local-device';
export const displayPersonName=person=>{const name=person?.name||person?.email||'Household member';return /^kayleigh\d+$/i.test(name)?'Kayleigh':/^andrewjameslamb14$/i.test(name)?'Andy':name};
export const archivedCompletionCount=state=>(state.completionArchive||[]).reduce((sum,row)=>sum+(Number(row.count)||0),0);
export function archiveOldCompletions(state,now=Date.now()){
 state.completionArchive||=[];
 const today=new Date(now);today.setUTCHours(0,0,0,0);const cutoff=+today-90*86400000,previous=Date.parse(state.historyArchivedThrough||'');
 const groups=new Map(state.completionArchive.map(row=>[row.id,row]));
 const completionTimes=new Map(state.wins.map(win=>[win.taskId||win.id.replace(/^win-/,''),win.at]));
 const retained=[];let archived=0;
 for(const win of uniqueWins(state)){
  const at=Date.parse(win.at);
  if(!Number.isFinite(at)||at>=cutoff||!hasRecordedPerson(win)){retained.push(win);continue}
  if(!Number.isFinite(previous)||at>previous){
   const month=new Date(at).toISOString().slice(0,7),personId=hasRecordedPerson(win)?win.completedBy:'',roomId=win.roomId||'';
   const id=`archive:${month}:${roomId}:${personId}`,row=groups.get(id)||{id,month,roomId,completedBy:personId,completedByName:win.completedByName||'',count:0};
   row.count++;groups.set(id,row);archived++;
  }
 }
 state.wins=retained;state.completionArchive=[...groups.values()];
 const removeDone=task=>{if(!task.done)return false;const at=Date.parse(task.completedAt||completionTimes.get(task.id));return Number.isFinite(at)&&at<cutoff};
 const before=state.tasks.length+state.side.length+(state.notifications||[]).length;
 state.tasks=state.tasks.filter(task=>!removeDone(task));state.side=state.side.filter(task=>!removeDone(task));
 state.notifications=(state.notifications||[]).filter(notice=>{const at=Date.parse(notice.createdAt);return !Number.isFinite(at)||at>=cutoff});
 if(archived||Number.isFinite(previous))state.historyArchivedThrough=new Date(Math.max(Number.isFinite(previous)?previous:0,cutoff)).toISOString();
 return !!archived||before!==state.tasks.length+state.side.length+state.notifications.length;
}
export function creditLegacyCompletions(state){
 const matches=(state.householdPeople||[]).filter(person=>person.id!=='local-device'&&/^kayleigh(?:\d+)?(?:\b|[._@-])/i.test(person.name||person.email||''));
 if(matches.length!==1)return false;
 const person=matches[0];let changed=false;
 for(const win of state.wins||[]){
  if(hasRecordedPerson(win))continue;
  win.completedBy=person.id;win.completedByName=person.name;win.attributionSource='legacy-confirmed-2026-10-07';changed=true;
 }
 return changed;
}
export function completionPeople(state){
 const people=new Map((state.householdPeople||[]).filter(p=>p.id!=='local-device').map(p=>[p.id,{id:p.id,name:displayPersonName(p)}]));
 for(const win of uniqueWins(state))if(hasRecordedPerson(win)&&!people.has(win.completedBy))people.set(win.completedBy,{id:win.completedBy,name:win.completedByName||'Former household member'});
 for(const row of state.completionArchive||[])if(row.completedBy&&!people.has(row.completedBy))people.set(row.completedBy,{id:row.completedBy,name:row.completedByName||'Former household member'});
 return [...people.values()];
}
