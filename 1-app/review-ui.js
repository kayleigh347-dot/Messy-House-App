import {matchesTask,taskTiming,repeatedTaskGroups,archiveReviewedTask} from './review-tools.js';
import {recurrenceLabel} from './v2-state.js';
import {displayPersonName} from './completion-history.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const timingNames={all:'All dates',active:'Due or unscheduled',overdue:'Overdue',today:'Due today',upcoming:'Upcoming',unscheduled:'Unscheduled',paused:'Paused',completed:'Completed'};
let api;const controls=new Map();
export function initReviewUI(handlers){api=handlers;
 for(const id of ['nowList','sideList','doingList','attentionList','recurringList','templateList','roomTasks','laundryTasks','laundryTemplateList','laundryScheduleList','shoppingList','errandList','manualScheduleChoices']){
  const root=document.getElementById(id);if(!root)continue;
  if(id==='roomTasks'){
   const query=document.getElementById('roomSearchInput'),toggle=document.getElementById('roomSearchToggle'),wrap=document.getElementById('roomTextSearch');
   controls.set(id,{query,wrap});query.addEventListener('input',applyListFilters);
   toggle.onclick=()=>{wrap.hidden=!wrap.hidden;toggle.setAttribute('aria-expanded',String(!wrap.hidden));if(!wrap.hidden)query.focus();else{query.value='';applyListFilters()}};
   continue;
  }
  const wrap=el('div');wrap.className='list-search-controls';wrap.dataset.listFor=id;const details=el('details'),summary=el('summary','Search & filters'),fields=el('div');fields.className='list-search-fields';
  const query=el('input');query.type='search';query.placeholder='Search tasks';query.setAttribute('aria-label','Search '+(id==='templateList'?'reusable tasks':id==='roomTasks'?'this room':'tasks'));
  const timing=el('select');timing.setAttribute('aria-label','Task dates');for(const [value,name] of Object.entries(timingNames))timing.append(new Option(name,value));if(id.toLowerCase().includes('template'))timing.hidden=true;timing.value=['nowList','roomTasks'].includes(id)?'active':'all';
  const person=el('select');person.setAttribute('aria-label','Task assignee');const priority=el('select');priority.setAttribute('aria-label','Task priority');priority.append(new Option('All priorities',''),new Option('Important','high'),new Option('Other','other'));
  const reset=el('button','Reset');reset.type='button';const count=el('output');count.className='list-result-count';count.setAttribute('aria-live','polite');
  fields.append(query,timing,person,priority,reset);details.append(summary,fields);wrap.append(details,count);root.before(wrap);
  controls.set(id,{query,timing,person,priority,count});for(const field of [query,timing,person,priority])field.addEventListener(field===query?'input':'change',applyListFilters);
  reset.onclick=()=>{query.value='';timing.value='all';person.value='';priority.value='';applyListFilters()};
 }
 document.addEventListener('mc-lists-rendered',applyListFilters);
 document.getElementById('openDuplicateReview').onclick=()=>{renderRepeatedTasks();document.getElementById('duplicateReview').showModal()};
}
export function applyListFilters(){if(!api)return;const state=api.get(),indexes=new Map();const indexed=key=>{if(!indexes.has(key))indexes.set(key,new Map((state[key]||[]).map(task=>[task.id,task])));return indexes.get(key)};
 for(const [id,control] of controls){const root=document.getElementById(id);if(root.closest('.page')?.classList.contains('hide'))continue;if(control.wrap){document.getElementById('roomSearchToggle').hidden=root.hidden;if(root.hidden)control.wrap.hidden=true;}else root.previousElementSibling.hidden=root.hidden;if(control.person){const selected=control.person.value;control.person.replaceChildren(new Option('All people',''),new Option('Unassigned','anyone'));for(const p of state.householdPeople)control.person.append(new Option(displayPersonName(p),p.id));control.person.value=selected;}
  const options={query:control.query.value,timing:control.timing?.value||'all',person:control.person?.value||'',priority:control.priority?.value||''};
  const cards=[...root.querySelectorAll('.task,.laundry-extra-task,.shared-item,.manual-schedule-task')].filter(card=>!card.parentElement.closest('.task'));
  let shown=0;for(const card of cards){const collection=card.dataset.collection||(id.includes('Template')||id==='templateList'?'templates':id==='sideList'?'side':id.includes('laundry')?'settings':'tasks'),items=state[collection]||[],task=indexed(collection).get(card.dataset.taskId);const visible=!task||matchesTask(task,options,items);card.hidden=!visible;if(visible)shown++;
   let badge=card.querySelector(':scope > .body > .review-timing');if(task&&!['templates'].includes(collection)){if(!badge){badge=el('span');badge.className='review-timing meta';card.querySelector(':scope > .body')?.append(badge)}badge.textContent=timingNames[taskTiming(task)]||taskTiming(task)}
  }
  for(const box of root.querySelectorAll('.completed-list,.laundry-completed,.doing-task-group'))box.hidden=!!box.querySelector('.task,.laundry-extra-task')&&![...box.querySelectorAll('.task,.laundry-extra-task')].some(card=>!card.hidden);
  for(const heading of root.querySelectorAll('.task-order-heading,.template-room-heading')){let next=heading.nextElementSibling,visible=false;while(next&&!next.matches('.task-order-heading,.template-room-heading')){if(next.matches('.task')&&!next.hidden||next.querySelector?.('.task:not([hidden])'))visible=true;next=next.nextElementSibling}heading.hidden=!visible}
  if(control.count)control.count.textContent=`${shown} of ${cards.length} ${id.toLowerCase().includes('template')?'templates':'tasks'}`;
 }
 const side=document.querySelector('#side > .bottom-add');if(side)side.hidden=!state.side.some(t=>!t.done&&!t.archived);
}
function renderRepeatedTasks(){const state=api.get(),root=document.getElementById('duplicateReviewList');root.replaceChildren();const groups=repeatedTaskGroups(state);
 if(!groups.length){root.append(el('p','No repeated unfinished tasks to review.'));return}
 for(const tasks of groups){const group=el('section');group.className='repeated-task-group';group.append(el('h3',tasks[0].text));
  for(const task of tasks){const row=el('article'),source=state.templates.find(t=>t.id===task.sourceTemplateId),parent=state.tasks.find(t=>t.id===task.parentId),person=state.householdPeople.find(p=>p.id===task.assignedTo);row.className='repeated-task-record';
   const data=[['Room',state.rooms.find(r=>r.id===task.roomId)?.name||task.area],['Schedule',(task.pausedAt?'Paused · ':'')+(recurrenceLabel(task)||'One-off')],['Due',task.nextDue||task.dueDate||'No date'],['Source template',source?.text||task.sourceTemplateId||'None recorded'],['Parent',parent?.text||'Top-level task'],['Assignee',person?displayPersonName(person):task.assignedToName||'Anyone'],['Created',task.created||task.createdAt||'Unknown'],['Record ID',task.id]];
   const list=el('dl');for(const [name,value] of data)list.append(el('dt',name),el('dd',value));row.append(list);
   const archive=el('button',task.archived?'Restore task':'Archive this task');archive.type='button';archive.onclick=()=>{if(!task.archived&&!window.confirm('Archive only this task and its subtasks? Its schedule and history will be kept; you can restore it here.'))return;archiveReviewedTask(api.get(),task.id,!task.archived);api.save();renderRepeatedTasks()};row.append(archive);group.append(row);
  }root.append(group);
 }
}
