import {migrateKitchenLaundry,restoreUniformBackupSteps} from './laundry-migration.js?v=laundry-uniform-20261010-v2';
import {settleScheduledLaundry} from './laundry.js?v=laundry-uniform-20261010-v2';
import {activeTask,recurringDueNotification} from './task-flow.js?v=schedule-20261010-v1';
import {normalizeSubtasks,childrenOf,rootTask,repeatChildren} from './subtasks.js';
import {seedCommonTasks} from './common-tasks.js?v=release-20261010-v3';
import {migrateRewards} from './rewards.js?v=release-20261010-v3';
import {creditLegacyCompletions,archiveOldCompletions,enrichCompletionRecords} from './completion-history.js?v=release-20261010-v3';
export const DAY=86400000;
export function taskAge(t,now=Date.now()){
 const created=Date.parse(t.created);
 if(!Number.isFinite(created))return 'Added date unknown';
 const days=Math.max(0,Math.floor((now-created)/DAY));
 return days===0?'Added today':`Added ${days} ${days===1?'day':'days'} ago`;
}
export function ordered(items){return items.map((item,index)=>({item,index})).sort((a,b)=>(a.item.order??a.index)-(b.item.order??b.index)||a.index-b.index).map(x=>x.item)}
export function move(items,id,delta){
 const list=ordered(items),index=list.findIndex(x=>x.id===id),target=index+delta;
 if(index<0||target<0||target>=list.length)return false;
 const slots=list.map((t,i)=>Number.isFinite(t.order)?t.order:i);
 [list[index],list[target]]=[list[target],list[index]];
 list.forEach((t,i)=>t.order=slots[i]);return true;
}
export function moveToTop(items,id){
 const list=ordered(items),index=list.findIndex(x=>x.id===id);
 if(index<=0)return false;
 const slots=list.map((t,i)=>Number.isFinite(t.order)?t.order:i),[item]=list.splice(index,1);
 list.unshift(item);list.forEach((t,i)=>t.order=slots[i]);return true;
}
export function moveToBottom(items,id){
 const list=ordered(items),index=list.findIndex(x=>x.id===id);
 if(index<0||index===list.length-1)return false;
 const slots=list.map((t,i)=>Number.isFinite(t.order)?t.order:i),[item]=list.splice(index,1);
 list.push(item);list.forEach((t,i)=>t.order=slots[i]);return true;
}
export const TASK_PRIORITIES=['high','mid'];
export const isPaused=task=>Boolean(task?.pausedAt);
export const recurringDeadline=task=>task?.recurrence&&!task.done&&!task.scheduled&&!isPaused(task)?Date.parse(task.nextDue||task.activeSince||task.created):NaN;
export const priorityOf=task=>task?.priority==='high'||recurringDeadline(task)<Date.now()?'high':'mid';
export function priorityOrdered(items){
 const rank={high:0,mid:1,low:2};return [...items].sort((a,b)=>rank[priorityOf(a)]-rank[priorityOf(b)]||((a.order??0)-(b.order??0)));
}
export function moveBefore(items,id,beforeId){
 const list=ordered(items),from=list.findIndex(t=>t.id===id),to=list.findIndex(t=>t.id===beforeId);
 if(from<0||to<0||from===to)return false;
 const slots=list.map((t,i)=>Number.isFinite(t.order)?t.order:i),[item]=list.splice(from,1);
 list.splice(from<to?to-1:to,0,item);list.forEach((t,i)=>t.order=slots[i]);return true;
}
export const INITIAL_ROOMS=[
 ['entrance','Downstairs Entrance Landing','Parcel Dragon'],['hall','Main Floor Landing / Hallway','Direction Creature'],
 ['penny',"Penny’s Bedroom",'Light-blue Winged Cat'],['master','Master Bedroom','Bigfoot'],['bathroom','Bathroom','Water Sprite'],
 ['living','Living Room','Leaf / Nature Sprite'],['kitchen','Kitchen','Kitchen Gremlin'],['cats','Upper Landing / Cat Area','Litter Troll'],
 ['print','Print Room / Large Loft','Workshop Goblin'],['craft','Craft & Storage Room / Small Loft','Hoarding Gnome']
];
export const roomId=name=>'area-'+encodeURIComponent(name.trim().toLowerCase());
export function normalize(input){
 const state=structuredClone(input);
 for(const key of ['tasks','side','wins','rewards','templates','homeless','shopping','appointments','errands','notes','householdPeople','notifications','settings','sideTabs'])state[key]||=[];
 state.rooms ||= INITIAL_ROOMS.map(([id,name,guardian],order)=>({id:'room-'+id,name,guardian,order,archived:false}));
 for(const key of ['tasks','side','wins','templates','homeless'])state[key].forEach((t,index)=>{
  const name=typeof t.area==='string'&&t.area.trim()?t.area.trim():'General';
  let room=state.rooms.find(r=>r.id===t.roomId)||state.rooms.find(r=>r.name.toLowerCase()===name.toLowerCase());
  if(!room){room={id:roomId(name),name,order:state.rooms.length,archived:false};state.rooms.push(room)}
  t.roomId=room.id;t.area=room.name;
  if(key==='tasks'&&t.recurrence&&!t.done)t.allowanceDays=null;
  // Old backups used a Later bucket. Dates now control scheduling on their own.
  if(t.bucket==='later'){t.bucket='now';if(!t.scheduled)t.activeSince ||= t.created;}
  if(!Number.isFinite(t.order))t.order=index;
  if(!TASK_PRIORITIES.includes(t.priority))t.priority='mid';
 });
 for(const key of ['tasks','side'])normalizeSubtasks(state[key]);
 migrateKitchenLaundry(state);
 restoreUniformBackupSteps(state);
 settleScheduledLaundry(state);
 completeReadyParents(state);
 // Retain an overloaded room's scale until its current mess is cleared.
 for(const room of state.rooms){
  const mess=roomMess(state,room.id);
  room.messCapacity=mess.score>0?mess.capacity:MESS_CONFIG.thresholds.disaster;
 }
 const doing=state.tasks.filter(t=>t.doingNow).sort((a,b)=>(a.doingNowOrder??a.order??0)-(b.doingNowOrder??b.order??0));
 doing.forEach((task,index)=>{if(!Number.isFinite(task.doingNowOrder))task.doingNowOrder=index});
 creditLegacyCompletions(state);
 enrichCompletionRecords(state);
 archiveOldCompletions(state);
 seedCommonTasks(state);
 migrateRewards(state);
 state.schemaVersion=7;
 return state;
}
export function validateV2(board){
 for(const key of ['rooms','templates','homeless','sideTabs'])if(board[key]!==undefined){
  if(!Array.isArray(board[key])||board[key].some(x=>!x||typeof x.id!=='string'||typeof x[['rooms','sideTabs'].includes(key)?'name':'text']!=='string'))throw new Error('Backup contains invalid '+key+'.');
  if(new Set(board[key].map(x=>x.id)).size!==board[key].length)throw new Error('Backup contains duplicate '+key+'.');
 }
 for(const t of [...board.tasks,...(board.templates||[])]){
  if(t.messImpact!==undefined&&!['none','small','normal','big'].includes(t.messImpact))throw new Error('Backup contains an invalid mess impact.');
  if(t.priority!==undefined&&!['high','mid','low'].includes(t.priority))throw new Error('Backup contains an invalid task priority.');
  if(!validRecurrence(t.recurrence))throw new Error('Backup contains invalid recurrence settings.');
  if(t.allowanceDays!=null&&(!Number.isFinite(t.allowanceDays)||t.allowanceDays<=0))throw new Error('Backup contains an invalid time allowance.');
 }
 for(const key of ['shopping','appointments','errands','notes'])if(board[key]!==undefined){
  if(!Array.isArray(board[key])||board[key].some(x=>!x||typeof x.id!=='string'||typeof x.text!=='string'))throw new Error('Backup contains invalid '+key+'.');
  if(new Set(board[key].map(x=>x.id)).size!==board[key].length)throw new Error('Backup contains duplicate '+key+'.');
 }
 if(board.householdPeople!==undefined&&(!Array.isArray(board.householdPeople)||board.householdPeople.some(x=>!x||typeof x.id!=='string'||typeof x.name!=='string')))throw new Error('Backup contains invalid household people.');
 if(board.notifications!==undefined&&(!Array.isArray(board.notifications)||board.notifications.some(x=>!x||typeof x.id!=='string'||typeof x.taskId!=='string'||typeof x.recipientId!=='string')))throw new Error('Backup contains invalid notifications.');
}
export function dueAt(t){
 if(t.done||t.pausedAt||t.scheduled)return null;
 if(t.dueDate&&Number.isFinite(Date.parse(t.dueDate)))return Date.parse(t.dueDate);
 if(!t.allowanceDays)return null;
 const start=Date.parse(t.activeSince||t.created);
 return Number.isFinite(start)?start+t.allowanceDays*DAY:null;
}
export function allowanceLabel(t,now=Date.now()){
 if(!t.allowanceDays)return 'No time allowance';
 const due=dueAt(t);if(due===null)return `${t.allowanceDays}-day allowance`;
 const days=Math.ceil(Math.abs(due-now)/DAY);
 return due<now?`Overdue by ${days} ${days===1?'day':'days'}`:`${days} ${days===1?'day':'days'} left`;
}
export function freshTask(template,id,now=new Date().toISOString(),order=0){
 return {id,text:template.text,roomId:template.roomId,area:template.area||'General',notes:template.notes||'',bucket:'now',done:false,created:now,activeSince:now,order,allowanceDays:template.allowanceDays||null,messImpact:template.messImpact||'normal',priority:template.priority==='high'?'high':'mid',...(template.assignedTo?{assignedTo:template.assignedTo,assignedToName:template.assignedToName}:{}),sourceTemplateId:template.sourceTemplateId||((template.sourceId||template.builtinKey)?template.id:null)};
}
export function validRecurrence(r){return r===null||r===undefined||((r.kind==='days'||r.kind==='weeks')&&Number.isInteger(r.every)&&r.every>=1&&r.every<=3650)||(r.kind==='weekdays'&&Array.isArray(r.days)&&r.days.length>0&&r.days.every(d=>Number.isInteger(d)&&d>=0&&d<=6))||(r.kind==='fixed-weekday'&&Number.isInteger(r.day)&&r.day>=0&&r.day<=6)}
export function nextOccurrence(recurrence,from=new Date()){
 const d=new Date(from);d.setHours(0,0,0,0);
 if(!validRecurrence(recurrence)||!recurrence)return null;
 if(recurrence.kind==='weekdays'||recurrence.kind==='fixed-weekday'){const days=recurrence.kind==='weekdays'?recurrence.days:[recurrence.day];do{d.setDate(d.getDate()+1)}while(!days.includes(d.getDay()))}
 else d.setDate(d.getDate()+recurrence.every*(recurrence.kind==='weeks'?7:1));
 return d.toISOString();
}
export function scheduleNext(task,now=new Date()){
 if(!task.recurrence)return null;
 const nextDue=nextOccurrence(task.recurrence,now);if(!nextDue)return null;
 const seriesId=task.seriesId||task.id;
 task.lastDone=now.toISOString();task.nextDue=nextDue;
 return {...freshTask(task,`occ-${seriesId}-${nextDue}`,now.toISOString(),task.order),...(task.importantWhenOverdue?{importantWhenOverdue:true}:{}),seriesId,recurringGroupId:task.recurringGroupId||seriesId,recurrence:structuredClone(task.recurrence),bucket:'now',scheduled:true,allowanceDays:null,nextDue,lastDone:task.lastDone,activeSince:nextDue};
}
export function activateDue(st,now=Date.now()){
 let changed=false;for(const t of st.tasks)if(!t.done&&!t.pausedAt&&t.scheduled&&Date.parse(t.nextDue)<=now){const notice=recurringDueNotification(t,st.householdPeople,new Date(now).toISOString());if(notice){st.notifications||=[];if(!st.notifications.some(n=>n.id===notice.id))st.notifications.push(notice)}t.bucket='now';t.scheduled=false;t.activeSince=t.nextDue;changed=true}return changed;
}
export function recurrenceLabel(t){
 const r=t.recurrence;if(!r)return '';
 if(r.kind==='weekdays')return 'Every '+r.days.map(d=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
 if(r.kind==='fixed-weekday')return `Every ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][r.day]}`;
 return `Every ${r.every} ${r.kind==='weeks'?(r.every===1?'week':'weeks'):(r.every===1?'day':'days')}`;
}
// Recurring occurrences contribute once when due; ordinary task allowance pressure remains capped.
export const MESS_CONFIG={impact:{none:0,small:0.5,normal:1,big:2},overduePerDay:0.25,maxOverdueDays:14,thresholds:{clean:0.01,messy:5,disaster:14}};
export function roomMess(st,roomId,now=Date.now()){
 const tasks=st.tasks.filter(t=>activeTask(t,now)&&t.roomId===roomId);
 const score=tasks.reduce((sum,t)=>{
  const weight=MESS_CONFIG.impact[t.messImpact||'normal']??1;
  if(t.recurrence){
   const due=Date.parse(t.nextDue||t.activeSince||t.created);
   return sum+(Number.isFinite(due)&&due>now?0:weight);
  }
  const due=dueAt(t),overdue=due===null?0:Math.max(0,(now-due)/DAY);
  return sum+weight*(1+Math.min(MESS_CONFIG.maxOverdueDays,overdue)*MESS_CONFIG.overduePerDay);
 },0);
 const {thresholds}=MESS_CONFIG,stored=st.rooms?.find(room=>room.id===roomId)?.messCapacity;
 const capacity=Math.max(thresholds.disaster,Number.isFinite(stored)?stored:0,score);
 const scaledScore=score/capacity*thresholds.disaster;
 return {score,capacity,percent:Math.min(100,Math.round(score/capacity*1000)/10),count:tasks.length,state:scaledScore>=thresholds.disaster?'DISASTER':scaledScore>=thresholds.messy?'MESSY':score>=thresholds.clean?'CLEAN':'SPOTLESS'};
}

// Also settle parents after two devices finish different final subtasks concurrently.
export function completeReadyParents(state){
 for(const kind of ['tasks','side']){
  const items=state[kind];let settled=true;
  while(settled){settled=false;for(const task of [...items]){
   if(task.done)continue;const children=childrenOf(items,task.id);if(!children.length||!children.every(child=>child.done))continue;
   const records=children.map(child=>state.wins.find(win=>win.taskId===child.id||win.id==='win-'+child.id)),dates=children.map((child,index)=>Date.parse(child.completedAt||records[index]?.at));if(dates.some(date=>!Number.isFinite(date)))continue;
   const index=dates.indexOf(Math.max(...dates)),at=new Date(dates[index]).toISOString(),actor=records[index],root=rootTask(items,task),due=Date.parse(task.nextDue||task.dueDate),previous={hasNextDue:Object.hasOwn(task,'nextDue'),nextDue:task.nextDue,hasLastDone:Object.hasOwn(task,'lastDone'),lastDone:task.lastDone};
   const record={id:'win-'+task.id,taskId:task.id,text:task.text,roomId:task.roomId,area:task.area,kind:kind==='side'?'side':'task',at,parentId:task.parentId||null,rootTaskId:root.id,rootText:root.text,recurrence:task.recurrence||null,rootRecurrence:root.recurrence||null,sourceTemplateId:task.sourceTemplateId||null,rootSourceTemplateId:root.sourceTemplateId||null,aggregate:true,points:0,dueAt:Number.isFinite(due)?new Date(due).toISOString():null,overdueMs:Number.isFinite(due)?Math.max(0,dates[index]-due):null,completedBy:actor?.completedBy||null,completedByName:actor?.completedByName||null};
   if(!state.wins.some(win=>win.id===record.id))state.wins.unshift(record);task.done=true;task.completedAt=at;task.lastDone=at;let next=null;
   if(kind==='tasks'&&!task.parentId&&task.recurrence){next=scheduleNext(task,new Date(at));if(next&&!items.some(item=>item.id===next.id))items.push(next,...repeatChildren(items,task,next))}
   task.completionUndo={winId:record.id,nextTaskId:next?.id||null,previous};settled=true;
  }}
 }
}
