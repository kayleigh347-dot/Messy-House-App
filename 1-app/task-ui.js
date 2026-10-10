// Shared recurring sections and timing badges for room and management lists.
import {priorityOf} from './v2-state.js?v=release-20261010-v3';
export function taskOrderGroups(tasks){
 return [['high','Needs done first'],['mid','Other tasks']].map(([id,label])=>({id,label,tasks:tasks.filter(task=>priorityOf(task)===id)})).filter(group=>group.tasks.length);
}
export function appendTaskGroups(root,tasks,makeCard){
 const doing=tasks.filter(task=>task.doingNow),other=tasks.filter(task=>!task.doingNow);
 if(doing.length){
  const section=document.createElement('details'),title=document.createElement('summary'),list=document.createElement('div'),key='mc-doing-group:'+root.id;
  section.className='doing-task-group';title.textContent=`Doing Now (${doing.length})`;section.open=sessionStorage.getItem(key)!=='collapsed';section.ontoggle=()=>sessionStorage.setItem(key,section.open?'expanded':'collapsed');section.append(title,list);root.append(section);
  appendPriorityGroups(list,doing,makeCard);
 }
 appendPriorityGroups(root,other,makeCard);colourTaskPositions(root);
}
function appendPriorityGroups(root,tasks,makeCard){
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
 return {days,status:task.pausedAt||days>0?'later':days<0?'needs':'ready',label:task.pausedAt?'Paused':days>0?`Due in ${days}d`:days<0?`Overdue ${-days}d`:'Due today',description:task.pausedAt?'Paused':days>0?`Needs doing in ${days} days`:days<0?`Overdue by ${-days} days`:'Due today'};
}
export function appendRecurringTiming(card,task){
 const timing=recurringTiming(task),badge=document.createElement('button');
 badge.type='button';badge.className='recurring-day-badge';badge.textContent=timing.label+' ✎';badge.title='Change next due date · '+timing.description;badge.setAttribute('aria-label','Change next due date: '+task.text+'. '+timing.description);badge.onclick=()=>document.dispatchEvent(new CustomEvent('edit-next-due',{detail:{id:task.id}}));
 card.dataset.recurringStatus=timing.status;
 card.querySelector(':scope > .body > .task-footer').prepend(badge);
 return card;
}

export function colourTaskPositions(root){let i=0;for(const card of root.querySelectorAll('.task'))if(!card.closest('.subtask-list'))card.style.setProperty('--task-hue',[320,165,45,235,15,195][i++%6]);for(const list of root.querySelectorAll('.subtask-list')){let n=0;for(const card of list.children)if(card.classList.contains('task'))card.style.setProperty('--task-hue',[45,235,15,195,320,165][n++%6])}}
