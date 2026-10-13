import {presetTasks,roomCategory} from './schedule-maker.js';
import {isLaundryItem} from './laundry.js';
import {freshTask,validRecurrence} from './v2-state.js';
import {validDate} from './calendar-planner.js';

// Draft operations never invoke Schedule maker's preview/apply or board writers.
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function validateSetupFrequency(value){
 if(!object(value))throw Error('Choose a frequency.');
 if(value.kind==='as-needed')return {kind:'as-needed'};
 if(['days','weeks'].includes(value.kind)&&Number.isSafeInteger(value.every)&&value.every>=1&&value.every<=3650)return {kind:value.kind,every:value.every};
 throw Error('Choose As needed or a valid number of days or weeks.');
}
function frequency(task){
 if(!task.recurrence)return {kind:'as-needed'};
 if(['days','weeks'].includes(task.recurrence.kind))return validateSetupFrequency(task.recurrence);
 // Preserve supported existing weekday schedules without interpreting them as intervals.
 return {kind:'existing',recurrence:structuredClone(task.recurrence)};
}
export function setupRoomSequence(state){
 return (state.rooms||[]).filter(room=>!room.archived&&room.id!=='room-laundry').map((room,index)=>({room,index,rank:roomCategory(room)==='general'?0:roomCategory(room)==='custom'?2:1})).sort((a,b)=>a.rank-b.rank||(a.room.order??a.index)-(b.room.order??b.index)).map(({room})=>room.id);
}
export function createRoomSetupDraft(state,roomId){
 const room=(state.rooms||[]).find(item=>item.id===roomId&&!item.archived);
 if(!room||roomId==='room-laundry')throw Error('Choose an active cleaning room.');
 const sideIds=new Set((state.side||[]).map(task=>task.id));
 const existing=(state.tasks||[]).filter(task=>task.roomId===roomId&&!task.parentId&&!task.done&&!task.archived&&task.bucket!=='side'&&!sideIds.has(task.id)&&!isLaundryItem(task));
 const keys=new Set(existing.flatMap(task=>[task.scheduleKey,task.roomSetupReferenceKey]).filter(Boolean));
 const tasks=existing.map(task=>({id:'task:'+task.id,taskId:task.id,text:task.text,selected:true,frequency:frequency(task),estimatedMinutes:task.estimatedMinutes??null,effort:task.effort??null,areaId:null,tools:structuredClone(task.tools||[])}));
 for(const task of presetTasks(roomCategory(room))){
  const key=roomId+':'+task.key;if(keys.has(key))continue;
  tasks.push({id:'preset:'+key,referenceKey:task.key,text:task.text,selected:!!task.selected,frequency:{kind:'days',every:task.days},estimatedMinutes:null,presetMinutes:task.minutes,effort:null,areaId:null,tools:task.tools,steps:task.subtasks});
 }
 return {version:1,roomId,tasks};
}
export function editRoomSetupTask(draft,id,patch){
 if(!object(patch)||Object.keys(patch).some(key=>!['text','selected','frequency','estimatedMinutes','effort','areaId','tools'].includes(key)))throw Error('Invalid setup change.');
 const next=structuredClone(draft),task=next.tasks.find(item=>item.id===id);
 if(!task)throw Error('This setup task is no longer available.');
 if('text'in patch&&(typeof patch.text!=='string'||!patch.text.trim()))throw Error('Enter a task name.');
 if('selected'in patch&&typeof patch.selected!=='boolean')throw Error('Invalid selection.');
 if('frequency'in patch)patch={...patch,frequency:validateSetupFrequency(patch.frequency)};
 if('estimatedMinutes'in patch&&patch.estimatedMinutes!==null&&(!Number.isFinite(patch.estimatedMinutes)||patch.estimatedMinutes<=0))throw Error('Enter a positive estimated time.');
 if('effort'in patch&&!['low','medium','high',null].includes(patch.effort))throw Error('Choose Low, Medium or High effort.');
 if('areaId'in patch&&patch.areaId!==null&&(typeof patch.areaId!=='string'||!patch.areaId))throw Error('Invalid area.');
 if('tools'in patch&&(!Array.isArray(patch.tools)||patch.tools.some(tool=>typeof tool!=='string')))throw Error('Invalid tools.');
 Object.assign(task,structuredClone(patch));return next;
}
export function resumeRoomSetupDraft(value,state,{allowStale=false}={}){
 if(!object(value)||value.version!==1||!Array.isArray(value.tasks)||!setupRoomSequence(state).includes(value.roomId))throw Error('This room setup cannot be resumed.');
 const ids=new Set();
 for(const task of value.tasks){
  if(!object(task)||typeof task.id!=='string'||!task.id||ids.has(task.id)||typeof task.text!=='string'||!task.text.trim()||typeof task.selected!=='boolean')throw Error('Invalid saved room setup.');
  ids.add(task.id);
  if(!allowStale&&task.selected&&task.taskId&&!(state.tasks||[]).some(item=>item.id===task.taskId&&item.roomId===value.roomId&&!item.archived&&!item.done))throw Error('An existing task changed. Unselect it or review this room again.');
  if(task.frequency?.kind==='existing'){
   const current=(state.tasks||[]).find(item=>item.id===task.taskId&&item.roomId===value.roomId);
   if(!validRecurrence(task.frequency.recurrence)||!task.frequency.recurrence)throw Error('Invalid saved weekday schedule.');
   if(!allowStale&&task.selected&&(!current||JSON.stringify(current.recurrence)!==JSON.stringify(task.frequency.recurrence)))throw Error('An existing task schedule changed. Unselect it or review this room again.');
  }else validateSetupFrequency(task.frequency);
  editRoomSetupTask(value,task.id,{estimatedMinutes:task.estimatedMinutes??null,effort:task.effort??null,areaId:task.areaId??null,tools:task.tools||[]});
 }
 return structuredClone(value);
}

export function previewRoomSetupAdditions(state,setup,entryIds,firstDates={}){
 const ids=new Set(entryIds),draft=resumeRoomSetupDraft({...setup.draft,tasks:setup.draft.tasks.map(task=>({...task,selected:ids.has(task.id)}))},state),room=state.rooms.find(item=>item.id===draft.roomId);
 if(typeof setup.id!=='string'||!setup.id||!ids.size||ids.size!==entryIds.length||[...ids].some(id=>!draft.tasks.some(task=>task.id===id)))throw Error('Choose tasks from this saved setup.');
 const entries=draft.tasks.filter(task=>ids.has(task.id)).map(task=>{
  const referenceKey=task.referenceKey?room.id+':'+task.referenceKey:null,known=referenceKey?(state.tasks||[]).find(item=>item.roomId===room.id&&!item.done&&!item.archived&&(item.scheduleKey===referenceKey||item.roomSetupReferenceKey===referenceKey)):null;
  const taskId=task.taskId||known?.id||'room-setup:'+encodeURIComponent(setup.id)+':'+encodeURIComponent(task.id),existing=(state.tasks||[]).find(item=>item.id===taskId);
  if(existing&&(existing.roomId!==room.id||existing.done||existing.archived))throw Error('An earlier added task changed. Review this setup before adding again.');
  const firstDate=firstDates[task.id]||null;
  if(!existing&&task.frequency.kind!=='as-needed'&&!validDate(firstDate))throw Error('Choose the first date for each scheduled task.');
  return {task:structuredClone(task),taskId,existing:!!existing,before:existing?JSON.stringify(existing):null,firstDate};
 });
 return {setupId:setup.id,roomId:room.id,roomName:room.name,roomBefore:JSON.stringify(room),entries};
}
export function applyRoomSetupAdditions(state,preview,now=new Date()){
 const room=(state.rooms||[]).find(item=>item.id===preview.roomId&&!item.archived);
 if(!room||JSON.stringify(room)!==preview.roomBefore)throw Error('This room changed. Review the additions again.');
 const added=[],reused=[];
 for(const entry of preview.entries){
  const current=(state.tasks||[]).find(item=>item.id===entry.taskId);
  if(entry.existing){if(!current||JSON.stringify(current)!==entry.before)throw Error('An existing task changed. Review the additions again.');reused.push(current);continue}
  // Concurrent identical additions use the same stable identity, never title matching.
  if(current){if(current.roomId!==room.id||current.done||current.archived)throw Error('An added task changed. Review the additions again.');reused.push(current);continue}
  const choice=entry.task,freq=validateSetupFrequency(choice.frequency);
  if(freq.kind!=='as-needed'&&!validDate(entry.firstDate))throw Error('Choose a valid first date.');
  const task=freshTask({text:choice.text,roomId:room.id,area:room.name,effort:choice.effort,tools:choice.tools,estimatedMinutes:choice.estimatedMinutes,presetMinutes:choice.presetMinutes},entry.taskId,now.toISOString());
  task.roomSetupId=preview.setupId;task.roomSetupEntryId=choice.id;
  if(choice.referenceKey)task.roomSetupReferenceKey=room.id+':'+choice.referenceKey;
  if(choice.estimatedMinutes)task.estimateSource='user';
  if(freq.kind!=='as-needed'){task.recurrence={kind:freq.kind,every:freq.every};task.nextDue=new Date(entry.firstDate+'T00:00:00').toISOString();task.activeSince=task.nextDue;task.scheduled=Date.parse(task.nextDue)>+now;}
  added.push(task);
  for(const [index,text] of (choice.steps||[]).entries()){
   const child=freshTask({text,roomId:room.id,area:room.name},task.id+':step:'+index,now.toISOString());child.parentId=task.id;added.push(child);
  }
 }
 const start=Math.max(-1,...(state.tasks||[]).map(task=>task.order??0))+1;
 added.forEach((task,index)=>task.order=start+index);state.tasks.push(...added);
 return {added,reused};
}
