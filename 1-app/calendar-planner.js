import {automaticTaskMinutes} from './task-estimates.js?v=checklist-20261012-v3';
import {localDateKey} from './calendar.js';
import {nextOccurrence,freshTask} from './v2-state.js?v=calendar-skip-20261012-v1';
import {descendants,childrenOf,repeatChildren} from './subtasks.js';
import {taskDeadline} from './task-extras.js';
import {isLaundryItem} from './laundry.js?v=checklist-20261012-v3';
export const defaultCalendarSettings={dailyMax:240,multiplier:2,oneRoom:true,wholeHouse:true};
export function calendarSettings(state){return {...defaultCalendarSettings,...state.calendarSettings};}
export function validDate(key){const d=new Date(key+'T12:00:00');return /^\d{4}-\d{2}-\d{2}$/.test(key)&&localDateKey(d)===key;}
export function addDays(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return localDateKey(d);}
export function weekStart(date){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return localDateKey(d);}
export function taskMinutes(state,task){
 const estimate=t=>automaticTaskMinutes(state,t);
 if(Number.isFinite(task.estimatedMinutes)&&task.estimatedMinutes>0)return {base:estimate(task),unknown:0};
 const family=descendants(state.tasks,task.id),leaves=family.filter(t=>!t.archived&&!t.pausedAt&&!childrenOf(state.tasks,t.id).length);
 if(!leaves.length)return {base:estimate(task),unknown:0};
 return leaves.reduce((sum,t)=>({base:sum.base+(estimate(t)||0),unknown:sum.unknown+(estimate(t)===null?1:0)}),{base:0,unknown:0});
}
// A pure suggestion layer: neither due dates nor recurrence rules are rewritten.
export function buildCalendarPlan(state,{today=localDateKey(new Date()),end=addDays(today,90),recurringOnly=false}={}){
 const settings=calendarSettings(state),entries=[],backlog=[],side=new Set((state.side||[]).map(t=>t.id));
 const overrides=new Map((state.calendarPlans||[]).map(p=>[p.id,p]));
 const sessions=new Map((state.calendarSessions||[]).map(s=>[s.id,s]));
 for(const task of state.tasks||[]){
  if(recurringOnly&&!task.recurrence||task.parentId||task.done||task.archived||task.pausedAt||task.bucket==='side'||side.has(task.id)||isLaundryItem(task))continue;
  const raw=task.recurrence?task.nextDue||task.activeSince||task.created:task.dueDate||taskDeadline({...task,scheduled:false});
  const due=raw!=null&&Number.isFinite(new Date(raw).getTime())?localDateKey(new Date(raw)):'';
  const duration=taskMinutes(state,task),session=(state.calendarSessions||[]).find(s=>s.taskIds.includes(task.id)||s.taskIds.includes(task.seriesId));
  let occurrence=due||'undated',count=0;
  do{
   const key=task.id+'@'+occurrence,override=overrides.get(key);
   if(occurrence==='undated'||occurrence<=end&&(count===0||occurrence>=today)){entries.push({id:key,taskId:task.id,title:task.text,roomId:task.roomId,dueDate:occurrence==='undated'?'':occurrence,projected:count>0,baseMinutes:duration.base,minutes:settings.preserveUserTimes?adjustedTaskMinutes(state,task,settings.multiplier):Math.ceil(duration.base*settings.multiplier),unknown:duration.unknown,sessionId:session?.id||'',sessionName:session?.name||'',manual:!!override,fixed:!!task.scheduleMaker&&occurrence>=today,date:override?.date||(task.scheduleMaker&&occurrence>=today?occurrence:''),done:false});}
   if(!task.recurrence||!due)break;
   const next=nextOccurrence(task.recurrence,new Date(occurrence+'T12:00:00'));if(!next)break;
   const nextKey=localDateKey(next);if(nextKey<=occurrence)break;occurrence=nextKey;count++;
  }while(occurrence<=end&&count<20000);
 }
 const loads=new Map();
 const put=e=>{const load=loads.get(e.date)||{minutes:0,rooms:new Set(),sessions:new Set(),unknown:0};load.minutes+=e.minutes;load.unknown+=e.unknown;load.rooms.add(e.roomId);load.sessions.add(e.sessionId);loads.set(e.date,load);};
 // Reserve explicit user choices first, even if they create a visible conflict.
 for(const e of entries.filter(e=>e.manual||e.fixed))put(e);
 const pending=entries.filter(e=>!e.manual&&!e.fixed).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||a.roomId.localeCompare(b.roomId)||a.id.localeCompare(b.id));
 const units=new Map();
 for(const e of pending){const key=e.sessionId&&settings.wholeHouse?e.sessionId+'@'+(e.projected?e.dueDate:'current'):e.id;if(!units.has(key))units.set(key,[]);units.get(key).push(e);}
 for(const unit of units.values()){
  const minutes=unit.reduce((n,e)=>n+e.minutes,0),unknown=unit.some(e=>e.unknown);
  if(unknown||minutes>settings.dailyMax){for(const e of unit)backlog.push({...e,reason:unknown?'Set a base time to plan this task or session':'Longer than the daily limit — split the task or session'});continue;}
  const first=unit[0],whole=!!first.sessionId&&settings.wholeHouse;
  const latestDue=unit.map(e=>e.dueDate||today).sort().at(-1);let date=latestDue>today?latestDue:today,placed=false;
  for(;date<=end;date=addDays(date,1)){
   if(settings.restDays?.includes(new Date(date+'T12:00:00').getDay()))continue;
   const load=loads.get(date),sameRoom=!load||!settings.oneRoom||([...load.rooms].every(r=>r===first.roomId)&&[...load.sessions].every(s=>!s||s===first.sessionId)),sameWhole=whole&&(!load||[...load.sessions].every(s=>s===first.sessionId));
   if((sameRoom||sameWhole)&&(!load||load.minutes+minutes<=settings.dailyMax)){for(const e of unit){e.date=date;put(e);}placed=true;break;}
  }
  if(!placed)for(const e of unit)backlog.push({...e,reason:'No space within the planning window'});
 }
 const conflicts=[];
 for(const [date,load] of loads){const whole=load.sessions.size===1&&!![...load.sessions][0]&&sessions.has([...load.sessions][0])&&settings.wholeHouse;if(load.minutes>settings.dailyMax)conflicts.push({date,message:'Above daily time limit'});if(settings.oneRoom&&load.rooms.size>1&&!whole)conflicts.push({date,message:'More than one room'});if(load.unknown)conflicts.push({date,message:'Some task times are missing'});}
 return {entries:entries.filter(e=>e.date),backlog,conflicts,settings};
}
export function movePlannedOccurrences(state,entries,date){
 if(!validDate(date))throw Error('Choose a valid planned date.');
 state.calendarPlans||=[];
 const before=structuredClone(state.calendarPlans);
 for(const entry of entries){const existing=state.calendarPlans.find(p=>p.id===entry.id);const value={id:entry.id,taskId:entry.taskId,date,dueDate:entry.dueDate,updatedAt:new Date().toISOString()};if(existing)Object.assign(existing,value);else state.calendarPlans.push(value);}
 return {before,after:structuredClone(state.calendarPlans)};
}
export function undoPlanMove(state,undo){if(!undo||JSON.stringify(state.calendarPlans)!==JSON.stringify(undo.after))return false;state.calendarPlans=structuredClone(undo.before);return true;}

export function adjustedTaskMinutes(state,task,multiplier=calendarSettings(state).multiplier){
 const own=t=>{const template=state.templates?.find(x=>x.id===t.sourceTemplateId);return Number(t.estimatedMinutes)>0||Number(template?.estimatedMinutes)>0};
 if(Number(task.estimatedMinutes)>0)return Math.ceil(automaticTaskMinutes(state,task));
 if(Number(task.presetMinutes)>0)return Math.ceil(task.presetMinutes*multiplier);
 const leaves=descendants(state.tasks,task.id).filter(t=>!t.archived&&!t.pausedAt&&!childrenOf(state.tasks,t.id).length);
 return leaves.length?leaves.reduce((n,t)=>n+Math.ceil(automaticTaskMinutes(state,t)*(own(t)?1:multiplier)),0):Math.ceil(automaticTaskMinutes(state,task)*(own(task)?1:multiplier));
}

export function skipCalendarOccurrence(state,entry,now=new Date()){
 const task=state.tasks.find(t=>t.id===entry.taskId);if(!task||task.done||task.archived||task.pausedAt||task.parentId||!task.recurrence||!validDate(entry.dueDate))throw Error('This recurring occurrence changed. Refresh the calendar.');
 const due=localDateKey(task.nextDue||task.activeSince||task.created),recurrence=structuredClone(task.recurrence);if(entry.id!==task.id+'@'+entry.dueDate||entry.dueDate<due||(recurrence.skipDates||[]).includes(entry.dueDate))throw Error('This occurrence is no longer available.');
 let cursor=due;for(let i=0;cursor<entry.dueDate&&i<20000;i++){const next=nextOccurrence(recurrence,new Date(cursor+'T12:00:00'));if(!next)break;cursor=localDateKey(next)}if(cursor!==entry.dueDate)throw Error('This occurrence is no longer available.');
 recurrence.skipDates=[...new Set([...(recurrence.skipDates||[]),entry.dueDate])].sort();const at=now.toISOString();
 if(entry.dueDate!==due){task.recurrence=recurrence;task.updatedAt=at;return null}
 const nextDue=nextOccurrence(recurrence,new Date(due+'T12:00:00'));if(!nextDue)throw Error('The next repeat could not be scheduled.');const seriesId=task.seriesId||task.id,id='occ-'+seriesId+'-'+nextDue;if(state.tasks.some(t=>t.id===id))throw Error('The next repeat already exists. Refresh the calendar.');
 const next={...freshTask(task,id,at,task.order),seriesId,recurringGroupId:task.recurringGroupId||seriesId,...(task.importantWhenOverdue?{importantWhenOverdue:true}:{}),...(task.lastDone?{lastDone:task.lastDone}:{}),recurrence,scheduled:Date.parse(nextDue)>+now,nextDue,activeSince:nextDue,allowanceDays:null,updatedAt:at};
 const children=repeatChildren(state.tasks.filter(t=>!t.archived),task,next);const family=[task,...descendants(state.tasks,task.id)];for(const item of family)if(!item.done){item.archived=true;item.doingNow=false;item.skippedAt=at;item.updatedAt=at}if(family.some(t=>t.id===state.current))state.current=null;
 state.tasks.push(next,...children);state.calendarPlans=(state.calendarPlans||[]).filter(p=>p.id!==entry.id).map(p=>p.taskId===task.id?{...p,id:p.id.replace(task.id+'@',next.id+'@'),taskId:next.id,updatedAt:at}:p);
 for(const session of state.calendarSessions||[])if(session.taskIds.includes(task.id)){session.taskIds=[...new Set(session.taskIds.map(id=>id===task.id?seriesId:id))];session.updatedAt=at}return next;
}
