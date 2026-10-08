import {dueAt,freshTask,ordered} from './v2-state.js?v=purple-subtasks-1';
import {descendants} from './subtasks.js';
export function addSavedTasks(state,ids,newId=()=>crypto.randomUUID(),now=new Date().toISOString()){
 const selected=new Set(ids),roots=ordered(state.templates).filter(t=>selected.has(t.id)&&!t.parentTemplateId&&state.rooms.some(r=>r.id===t.roomId&&!r.archived)),start=Math.max(-1,...state.tasks.map(t=>t.order??0))+1;let count=0;
 for(const template of roots){const family=[],pending=[template];while(pending.length){const item=pending.shift();family.push(item);pending.push(...ordered(state.templates.filter(child=>child.parentTemplateId===item.id)))}const generated=new Map(),baseOrder=start+count;
  for(const [index,item] of family.entries()){const fresh=freshTask(item,newId(),now,baseOrder+index);generated.set(item.id,fresh);if(item.parentTemplateId)fresh.parentId=generated.get(item.parentTemplateId)?.id||generated.get(template.id).id;state.tasks.push(fresh);count++}
 }
 return count;
}
export function saveReusable(state,task,allRooms=false,newId=()=>crypto.randomUUID()){
 const groupId=allRooms?newId():null,rooms=allRooms?state.rooms.filter(r=>!r.archived):state.rooms.filter(r=>r.id===task.roomId),source=[task,...(task.parentId?[]:descendants(allItems(state,task),task.id))];
 for(const room of rooms){const ids=new Map();for(const item of source){const template={id:newId(),groupId,sourceId:item.id,text:item.text,roomId:room.id,area:room.name,notes:item.notes||'',allowanceDays:item.allowanceDays||null,messImpact:item.messImpact||'normal',priority:item.priority||'mid',order:state.templates.length};if(item.parentId)template.parentTemplateId=ids.get(item.parentId)||ids.get(task.id);ids.set(item.id,template.id);state.templates.push(template)}}
}
function allItems(state,task){return state.side?.some(x=>x.id===task.id)?state.side:state.tasks}
export function deleteReusable(state,template,allRooms=false){
 state.templates=state.templates.filter(t=>allRooms&&template.groupId?t.groupId!==template.groupId:t.id!==template.id);
}
export function roomTemplates(state,roomId){return state.templates.filter(t=>t.roomId===roomId&&!t.parentTemplateId)}
export function reusableSuggestionEligible(item,now=Date.now(),completedAt=item?.completedAt||item?.at){
 if(item?.reusableDismissedAt)return false;
 const completed=Date.parse(completedAt);return !Number.isFinite(completed)||now-completed<=30*86400000;
}
export function nextTaskId(tasks,current){const at=tasks.findIndex(t=>t.id===current);return tasks.length?tasks[(at+1)%tasks.length].id:null}

export function taskDeadline(task){
 if(task.done||task.pausedAt||task.scheduled)return null;
 if(task.recurrence){const date=Date.parse(task.nextDue||task.activeSince||task.created);return Number.isFinite(date)?date:null;}
 const allowance=dueAt(task);if(allowance!==null)return allowance;
 const recurring=task.recurrence?Date.parse(task.nextDue):NaN;
 return Number.isFinite(recurring)?recurring:null;
}
