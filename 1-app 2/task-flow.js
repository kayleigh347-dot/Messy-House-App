import {descendants} from './subtasks.js';
// Future occurrences remain on the calendar until their due time.
export function activeTask(task,now=Date.now()){
 if(task.done||task.pausedAt)return false;
 const due=Date.parse(task.nextDue||task.dueDate);
 return !(Number.isFinite(due)&&due>+now);
}
const time=value=>{const parsed=Date.parse(value);return Number.isFinite(parsed)?parsed:null};
const sameLocalDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();

export function completionTime(task,wins=[]){
 const direct=time(task?.completedAt);if(direct!==null)return direct;
 const record=wins.find(win=>win.taskId===task?.id||win.id==='win-'+task?.id);
 return time(record?.at);
}

export function completedToday(task,wins=[],now=new Date()){
 if(!task?.done)return false;
 const completed=completionTime(task,wins);return completed!==null&&sameLocalDay(new Date(completed),now);
}

export function doingNowTasks(tasks,wins=[],now=new Date()){
 return tasks.filter(task=>!task.parentId&&task.doingNow&&(activeTask(task,now)||completedToday(task,wins,now))).sort((a,b)=>(a.doingNowOrder??0)-(b.doingNowOrder??0)||(a.order??0)-(b.order??0));
}

export function addToDoingNow(task,tasks){
 if(task.parentId||task.done||task.doingNow)return false;
 task.doingNow=true;task.doingNowOrder=Math.max(-1,...tasks.filter(item=>item.doingNow).map(item=>item.doingNowOrder??-1))+1;return true;
}

export function removeFromDoingNow(task){
 if(!task.doingNow)return false;task.doingNow=false;delete task.doingNowOrder;return true;
}

export function moveDoingNow(tasks,id,where){
 const list=doingNowTasks(tasks).filter(task=>!task.done),index=list.findIndex(task=>task.id===id);
 if(index<0)return false;
 const target=where==='top'?0:where==='bottom'?list.length-1:index+where;
 if(target<0||target>=list.length||target===index)return false;
 const [task]=list.splice(index,1);list.splice(target,0,task);list.forEach((item,order)=>item.doingNowOrder=order);return true;
}

export function captureCompletion(task,at,winId,nextTaskId=null,previous={}){
 task.completedAt=at;task.completionUndo={winId,nextTaskId,previous};
}

export function undoCompletion(state,task,{fromChild=false}={}){
 if(!task?.done)return false;
 const items=[...state.tasks,...(state.side||[])],undoState=task.completionUndo||{};
 if(undoState.nextTaskId&&[...items.filter(item=>item.id===undoState.nextTaskId),...descendants(items,undoState.nextTaskId)].some(item=>item.done))return false;
 const family=descendants(items,task.id),record=state.wins.find(win=>win.taskId===task.id);
 if(record?.aggregate&&!fromChild){const latest=family.filter(item=>item.done&&!items.some(child=>child.parentId===item.id)).sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0];if(latest)return undoCompletion(state,latest)}
 const parent=items.find(t=>t.id===task.parentId);if(parent?.done&&!undoCompletion(state,parent,{fromChild:true}))return false;
 const undo=task.completionUndo||{};
 state.wins=state.wins.filter(win=>win.id!==(undo.winId||'win-'+task.id)&&win.taskId!==task.id);
 if(undo.nextTaskId){const removed=new Set([undo.nextTaskId,...descendants(state.tasks,undo.nextTaskId).map(t=>t.id)]);state.tasks=state.tasks.filter(item=>!removed.has(item.id))}
 task.done=false;delete task.completedAt;
 const previous=undo.previous;
 if(previous){
  if(previous.hasNextDue)task.nextDue=previous.nextDue;else delete task.nextDue;
  if(previous.hasLastDone)task.lastDone=previous.lastDone;else delete task.lastDone;
 }
 delete task.completionUndo;return true;
}

export function taskNotification(task,target,actor,at=new Date().toISOString(),newId=()=>crypto.randomUUID()){
 return {id:newId(),taskId:task.id,recipientId:target.id,recipientName:target.name||target.email||'Household member',text:task.text,roomId:task.roomId,area:task.area,createdAt:at,createdBy:actor?.id||null,createdByName:actor?.name||actor?.email||'Someone in your house',readBy:[]};
}

export function recurringDueNotification(task,people=[],at=new Date().toISOString()){
 if(!task.recurrence||task.parentId||!task.assignedTo||task.done||task.pausedAt)return null;
 const person=people.find(p=>p.id===task.assignedTo);
 return {...taskNotification(task,{id:task.assignedTo,name:person?.displayName||person?.name||task.assignedToName},null,at,()=>`due:${task.id}:${task.nextDue}`),kind:'recurring-due'};
}
export function taskNoticeForPerson(notice,personId,tasks){
 if(notice.recipientId!==personId||notice.readBy?.includes(personId))return false;
 const task=tasks.find(t=>t.id===notice.taskId);
 const auto=notice.kind==='recurring-due'||(task?.recurrence&&notice.createdBy===notice.recipientId);
 return !auto||!!task&&!task.done&&!task.pausedAt&&!task.scheduled&&task.assignedTo===personId&&(notice.kind!=='recurring-due'||notice.id===`due:${task.id}:${task.nextDue}`);
}
