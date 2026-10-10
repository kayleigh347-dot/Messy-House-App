import {localDateKey} from './calendar.js';
export const scheduleFields=['nextDue','activeSince','bucket','scheduled','pausedAt','recurrence','allowanceDays'];
export const scheduleSnapshot=task=>Object.fromEntries(scheduleFields.filter(key=>key in task).map(key=>[key,structuredClone(task[key])]));
export function recurringScheduleTasks(state,roomId=''){
 return state.tasks.filter(t=>!t.parentId&&!t.done&&t.recurrence&&(!roomId||t.roomId===roomId));
}
export function nextDueDate(task){const due=task?.nextDue||task?.activeSince||task?.created;return Number.isFinite(Date.parse(due))?localDateKey(new Date(due)):''}
export function setNextDue(task,date,now=Date.now()){
 const due=new Date(date+'T00:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(+due)||localDateKey(due)!==date)throw new Error('Choose a valid next due date.');
 task.nextDue=due.toISOString();task.activeSince=task.nextDue;task.scheduled=+due>+now;task.bucket='now';task.allowanceDays=null;
 return task;
}
export const schedulePlan=tasks=>tasks.map(t=>({id:t.id,before:JSON.stringify(t)}));
export function unchangedScheduleTasks(state,plan){return plan.map(p=>state.tasks.find(t=>t.id===p.id&&!t.done&&!t.parentId&&t.recurrence&&JSON.stringify(t)===p.before)).filter(Boolean)}
