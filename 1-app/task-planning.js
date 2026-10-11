import {activeTask} from './task-flow.js';
import {childrenOf,descendants,nestTask} from './subtasks.js';
import {setNextDue} from './recurring-schedule.js';
import {localDateKey} from './calendar.js';
import {isLaundryItem} from './laundry.js';
export function smallTasks(state,{minutes=10,effort='low',actorId='',now=Date.now()}={}){
 return state.tasks.filter(t=>!t.parentId&&activeTask(t,now)&&!t.doingNow&&!isLaundryItem(t)&&(!actorId||actorId==='local-device'||!t.assignedTo||t.assignedTo===actorId)&&((Number.isFinite(t.estimatedMinutes)&&t.estimatedMinutes>0&&t.estimatedMinutes<=minutes)||(!t.estimatedMinutes&&t.effort==='low'))&&(!effort||t.effort===effort||!t.effort&&!!t.estimatedMinutes)).sort((a,b)=>(a.estimatedMinutes||Infinity)-(b.estimatedMinutes||Infinity)||a.text.localeCompare(b.text));
}
export function subtaskCandidates(items,parentId,{roomId='',query=''}={}){
 const parent=items.find(t=>t.id===parentId);if(!parent||parent.done||parent.archived)return [];
 const childIds=new Set(descendants(items,parentId).map(t=>t.id));
 return items.filter(t=>t.id!==parentId&&!t.parentId&&!t.done&&!t.archived&&!t.pausedAt&&!isLaundryItem(t)&&!childIds.has(t.id)&&!descendants(items,t.id).some(x=>x.id===parentId)&&(!roomId||t.roomId===roomId)&&(!query.trim()||[t,...descendants(items,t.id)].some(x=>(x.text+' '+(x.area||'')).toLowerCase().includes(query.trim().toLowerCase()))));
}
export function addExistingSubtasks(items,parentId,ids){
 const unique=[...new Set(ids)],eligible=new Set(subtaskCandidates(items,parentId).map(t=>t.id));if(!unique.length||unique.some(id=>!eligible.has(id)))return false;
 const parent=items.find(t=>t.id===parentId);for(const id of unique){nestTask(items,id,parentId);for(const t of [items.find(x=>x.id===id),...descendants(items,id)]){if(t.done)continue;t.nextDue=parent.nextDue||parent.dueDate||null;t.dueDate=parent.dueDate||null;t.scheduled=!!parent.scheduled;t.activeSince=parent.activeSince||parent.created;t.pausedAt=parent.pausedAt||null}}return true;
}
export function snoozeTask(items,id,date,now=Date.now()){
 const task=items.find(t=>t.id===id);if(!task||task.parentId||task.done||task.archived||task.pausedAt||isLaundryItem(task))return false;
 const due=new Date(date+'T00:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+due)||localDateKey(due)!==date||date<=localDateKey(new Date(now)))throw Error('Choose a date after today.');
 if(task.recurrence)setNextDue(task,date,now);else{task.dueDate=due.toISOString();delete task.nextDue;task.scheduled=false}
 for(const t of [task,...descendants(items,id)]){if(t.done)continue;if(t!==task){t.nextDue=due.toISOString();t.activeSince=due.toISOString();t.scheduled=true}t.updatedAt=new Date(now).toISOString()}
 return true;
}
export function createNamedParent(items,draggedId,targetId,text,id,now=new Date().toISOString()){
 const dragged=items.find(t=>t.id===draggedId),target=items.find(t=>t.id===targetId),name=text.trim();
 if(!name||name.length>180||!id||items.some(t=>t.id===id)||!dragged||!target||dragged===target||dragged.done||target.done||dragged.archived||target.archived||childrenOf(items,targetId).length||descendants(items,draggedId).some(t=>t.id===targetId))return false;
 const parent={...target,id,text:name,created:now,updatedAt:now};
 for(const key of ['sourceTemplateId','estimatedMinutes','effort','notes','completionUndo','completedAt','lastDone'])delete parent[key];
 items.push(parent);nestTask(items,targetId,id);nestTask(items,draggedId,id);return parent;
}
