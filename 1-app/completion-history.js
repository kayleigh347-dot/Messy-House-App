// Kayleigh confirmed on 7 October 2026 that existing unrecorded completions were hers.
export const uniqueWins=state=>[...new Map((state.wins||[]).map(win=>[win.id,win])).values()];
export const hasRecordedPerson=win=>!!win.completedBy&&win.completedBy!=='local-device';
export const displayPersonName=person=>{const name=person?.displayName||person?.name||person?.email||'Household member';return person?.displayName?name:/^kayleigh\d+$/i.test(name)?'Kayleigh':/^andrewjameslamb14$/i.test(name)?'Andy':name};
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
   row.taskCounts||={};const taskKey=String(win.text||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');if(taskKey&&completionPoints(win))row.taskCounts[taskKey]=(row.taskCounts[taskKey]||0)+1;row.count+=completionPoints(win);if(row.count)groups.set(id,row);archived++;
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

// Preserve the main task relationship even after old completed tasks are pruned.
export function enrichCompletionRecords(state){
 const tasks=new Map([...(state.tasks||[]),...(state.side||[])].map(task=>[task.id,task]));
 for(const win of state.wins||[]){
  const task=tasks.get(win.taskId||win.id.replace(/^win-/,''));if(!task)continue;
  let root=task;const seen=new Set();while(root.parentId&&!seen.has(root.id)){seen.add(root.id);const parent=tasks.get(root.parentId);if(!parent)break;root=parent}
  win.parentId??=task.parentId||null;win.rootTaskId??=root.id;win.rootText??=root.text;win.rootRecurrence??=root.recurrence||null;win.rootSourceTemplateId??=root.sourceTemplateId||null;
  const children=[...tasks.values()].filter(child=>child.parentId===task.id);
  if(children.length){win.aggregate=true;win.points=0}
 }
}
export const completionPoints=win=>win.aggregate||win.points===0?0:1;
export function completionGroups(state,{roomId='',personId='',start=-Infinity,end=Infinity,category='all'}={}){
 const all=uniqueWins(state),groups=new Map(),tasks=new Map([...(state.tasks||[]),...(state.side||[])].map(task=>[task.id,task]));
 for(const win of all){
  const task=tasks.get(win.taskId||win.id.replace(/^win-/,''));let root=task;const seen=new Set();while(root?.parentId&&!seen.has(root.id)){seen.add(root.id);root=tasks.get(root.parentId)||root;if(seen.has(root.id))break}
  const rootId=win.rootTaskId||root?.id||win.taskId||win.id.replace(/^win-/,''),rootWin=all.find(item=>(item.taskId||item.id.replace(/^win-/,''))===rootId&&!item.parentId);
  const saved=state.templates?.find(template=>template.sourceId===rootId||template.sourceId===rootWin?.id);
  if(!groups.has(rootId))groups.set(rootId,{id:rootId,text:win.rootText||root?.text||rootWin?.text||win.text,roomId:win.roomId||root?.roomId,area:win.area,recurrence:win.rootRecurrence||root?.recurrence||rootWin?.recurrence,sourceTemplateId:win.rootSourceTemplateId||root?.sourceTemplateId||rootWin?.sourceTemplateId||saved?.id,rootWin,records:[]});groups.get(rootId).records.push(win);
 }
 return [...groups.values()].map(group=>{
  const records=group.records.filter(win=>Date.parse(win.at)>=start&&Date.parse(win.at)<=end&&(!personId||win.completedBy===personId)&&(!personId||completionPoints(win)));
  const children=records.filter(win=>(win.taskId||win.id.replace(/^win-/,''))!==group.id),direct=records.find(win=>(win.taskId||win.id.replace(/^win-/,''))===group.id);
  const type=group.recurrence?'recurring':group.sourceTemplateId?'reusable':'other';
  return {...group,category:type,shownRecords:records,children,direct,at:records.map(win=>win.at).sort().at(-1),points:records.reduce((sum,win)=>sum+completionPoints(win),0)};
 }).filter(group=>group.shownRecords.length&&(!roomId||group.roomId===roomId)&&(category==='all'||group.category===category)).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
export function deleteCompletionGroup(state,group){
 const ids=new Set(group.records.map(win=>win.id)),taskIds=new Set(group.records.map(win=>win.taskId||win.id.replace(/^win-/,'')));
 state.wins=state.wins.filter(win=>!ids.has(win.id));
 for(const key of ['tasks','side'])state[key]=(state[key]||[]).filter(task=>!(task.done&&taskIds.has(task.id)));
 return ids.size;
}
