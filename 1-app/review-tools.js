import {taskDeadline} from './task-extras.js';
import {descendants} from './subtasks.js';
import {localDateKey} from './calendar.js';
export function taskTiming(task,now=new Date()){
 if(task.archived)return 'archived';if(task.done)return 'completed';if(task.pausedAt)return 'paused';
 const due=task.recurrence?Date.parse(task.nextDue||task.activeSince||task.created):taskDeadline({...task,scheduled:false});
 if(!Number.isFinite(due))return 'unscheduled';const day=localDateKey(new Date(due)),today=localDateKey(now);
 return day<today?'overdue':day===today?'today':'upcoming';
}
export function matchesTask(task,{query='',timing='all',person='',priority=''}={},items=[],now=new Date()){
 const kind=taskTiming(task,now);
 if(timing==='active'&&['upcoming','paused','archived'].includes(kind)||timing!=='all'&&timing!=='active'&&kind!==timing)return false;
 if(person==='anyone'?!!task.assignedTo:person&&task.assignedTo!==person)return false;
 if(priority==='other'?task.priority==='high':priority&&(task.priority||'mid')!==priority)return false;
 const family=[task,...descendants(items.map(t=>({...t,parentId:t.parentTemplateId||t.parentId})),task.id)],text=family.map(t=>[t.text,t.area,t.notes,t.assignedToName].join(' ')).join(' ').toLocaleLowerCase();
 return !query.trim()||text.includes(query.trim().toLocaleLowerCase());
}
export function repeatedTaskGroups(state){
 const groups=new Map();for(const task of state.tasks.filter(t=>!t.done&&!t.parentId)){
  const key=task.roomId+'|'+task.text.trim().toLocaleLowerCase();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(task);
 }return [...groups.values()].filter(items=>items.length>1||items.some(t=>t.archived));
}
export function archiveReviewedTask(state,id,archived=true,at=new Date().toISOString()){
 const task=state.tasks.find(t=>t.id===id&&!t.done&&!t.parentId);if(!task)return false;
 for(const item of [task,...descendants(state.tasks,id)]){if(archived){item.archived=true;item.archivedAt=at}else{delete item.archived;delete item.archivedAt}item.updatedAt=at}
 return true;
}
