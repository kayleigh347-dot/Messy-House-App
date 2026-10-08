// Shared recurring sections and timing badges for room and management lists.
import {priorityOf} from './v2-state.js';
export function taskOrderGroups(tasks){
 return [['high','Needs done first'],['mid','Other tasks']].map(([id,label])=>({id,label,tasks:tasks.filter(task=>priorityOf(task)===id)})).filter(group=>group.tasks.length);
}
export function appendTaskGroups(root,tasks,makeCard){
 for(const group of taskOrderGroups(tasks)){
  const heading=document.createElement('h3'),label=document.createElement('span'),count=document.createElement('span');heading.className='task-order-heading';label.textContent=group.label;count.textContent=String(group.tasks.length);heading.append(label,count);root.append(heading);
  for(const task of group.tasks){const card=makeCard(task);card.dataset.orderGroup=group.id;card.dataset.orderGroupLabel=group.label;root.append(card)}
 }
}
export const recurringSections=[['needs','Needs done now!'],['ready','Ready to do'],['later','Not yet']];
export function setTabLabel(tab,label,count){
 tab.textContent=label;const badge=document.createElement('span');badge.className='tab-count';badge.textContent=String(count);tab.append(badge);tab.setAttribute('aria-label',`${label}: ${count}`);return tab;
}
export function recurringTiming(task,now=new Date()){
 const today=new Date(now);today.setHours(0,0,0,0);
 const due=new Date(task.nextDue||task.activeSince||task.created);due.setHours(0,0,0,0);
 const days=Number.isFinite(+due)?Math.round((due-today)/86400000):0;
 return {days,status:task.pausedAt||days>0?'later':days<0?'needs':'ready',label:task.pausedAt?'Paused':days>0?`${days}d`:days<0?`${-days}d overdue`:'Today',description:task.pausedAt?'Paused':days>0?`Needs doing in ${days} days`:days<0?`Overdue by ${-days} days`:'Due today'};
}
export function appendRecurringTiming(card,task){
 const timing=recurringTiming(task),badge=document.createElement('span');
 badge.className='recurring-day-badge';badge.textContent=timing.label;badge.title=timing.description;badge.setAttribute('aria-label',timing.description);
 card.dataset.recurringStatus=timing.status;
 card.querySelector('.task-footer').prepend(badge);
 return card;
}
