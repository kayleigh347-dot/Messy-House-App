import {roomHues} from './room-colours.js';
import {nextOccurrence} from './v2-state.js?v=purple-subtasks-1';
import {localDateKey as dateKey} from './calendar.js';
import {taskDeadline} from './task-extras.js';
import {subtasksForDisplay} from './subtasks.js?v=cohesion-20261008-v6';
const $=s=>document.querySelector(s),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const symbols={'room-master':'🛏️','room-penny':'🧸','room-kitchen':'🍽️','room-living':'🛋️','room-bathroom':'🛁','room-hall':'🚪','room-entrance':'🔑','room-cats':'🐈','room-print':'🖨️','room-craft':'🎨'};
const completedTaskDeadline=task=>{const exact=Date.parse(task.dueDate);if(Number.isFinite(exact))return exact;if(!task.allowanceDays)return null;const start=Date.parse(task.activeSince||task.created);return Number.isFinite(start)?start+task.allowanceDays*86400000:null};
export const calendarRoomEntries=(entries,roomId='')=>entries.filter(entry=>!roomId||(roomId==='household'?!entry.roomId:entry.roomId===roomId));
export function calendarStep(anchor,direction){const d=new Date(anchor);if($('#calendarView').value==='week')d.setDate(d.getDate()+direction*7);else{d.setDate(1);d.setMonth(d.getMonth()+direction)}return d}
function jump(date){document.dispatchEvent(new CustomEvent('calendar-jump',{detail:{date}}))}
function appendDayEntries(container,entries,rooms,state,onComplete){
 for(const event of entries.filter(event=>!event.done))container.append(eventRow(event,rooms,state,onComplete));
 const completed=entries.filter(event=>event.done);
 if(completed.length){const group=el('section');group.className='calendar-completed-tasks';group.append(el('h4','Completed tasks'));for(const event of completed)group.append(eventRow(event,rooms,state,onComplete));container.append(group)}
}
function eventRow(event,rooms,state,onComplete){
 const entry=el('article');entry.className='calendar-event calendar-task-row '+event.type+(event.estimated?' estimated':'')+(event.done?' completed':'');entry.dataset.entryId=event.id||'';
 const room=rooms.get(event.roomId);if(room)entry.style.setProperty('--room-hue',room.hue);
 const row=el('div');row.className='calendar-task-main';row.append(el('span',room?.name|| (event.type==='appointment'?'Appointment':'Errand')),el('strong',event.title));
 const children=['recurring','task'].includes(event.type)?subtasksForDisplay(state.tasks,event.id):[];
 if(children.length){const count=el('span',`${children.filter(child=>child.done).length}/${children.length}`);count.className='calendar-subtask-progress';row.append(count);entry.classList.add('has-subtasks');entry.tabIndex=0;entry.setAttribute('role','button');entry.setAttribute('aria-label',`Show subtasks for ${event.title}`)}
 if(onComplete&&event.id&&!event.estimated){const done=el('button',event.done?'Undo':'Done it!');done.type='button';done.className='calendar-done';done.disabled=event.type==='recurring'&&event.done&&!event.canUndo;done.setAttribute('aria-label',(event.done?'Undo completion: ':'Complete: ')+event.title);done.onclick=e=>{e.stopPropagation();onComplete(event.type,event.id,!event.done)};const footer=el('div');footer.className='calendar-task-footer';footer.append(done);entry.append(footer)}
 entry.prepend(row);
 if(event.estimated)entry.append(el('small','Future repeat preview'));
 if(children.length){const sublist=el('div');sublist.className='calendar-subtasks';sublist.hidden=true;for(const child of children){const childRow=el('div');childRow.className='calendar-subtask-row'+(child.done?' completed':'');childRow.append(el('span',(child.done?'✓ ':'○ ')+child.text));if(onComplete){const done=el('button',child.done?'Undo':'Done it!');done.type='button';done.className='calendar-done';done.disabled=child.done&&!child.completionUndo;done.setAttribute('aria-label',(child.done?'Undo completion: ':'Complete: ')+child.text);done.onclick=e=>{e.stopPropagation();onComplete('task',child.id,!child.done)};childRow.append(done)}sublist.append(childRow)}entry.append(sublist);const toggle=()=>{sublist.hidden=!sublist.hidden;entry.setAttribute('aria-expanded',String(!sublist.hidden))};entry.onclick=e=>{if(!e.target.closest('button'))toggle()};entry.onkeydown=e=>{if(e.target!==entry)return;if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}}}
 if(event.time||event.location)entry.append(el('small',[event.time&&event.time+(event.end?'–'+event.end:''),event.location].filter(Boolean).join(' · ')));
 const footer=entry.querySelector('.calendar-task-footer');if(footer)entry.append(footer);return entry;
}
export function renderLocalCalendar(state,anchor,onComplete,options={}){
 const $=selector=>options.elements?(options.elements[selector]||null):document.querySelector(selector),storageKey=options.storageKey||'mc-calendar';
 const jump=date=>options.onJump?options.onJump(date):document.dispatchEvent(new CustomEvent('calendar-jump',{detail:{date}}));
 const grid=$('#houseCalendarGrid');if(!grid)return;
 const weekly=$('#calendarView').value==='week',showRecurring=$('#calendarRecurring').checked,showSetDay=$('#calendarSetDay').checked,start=weekly?new Date(anchor):new Date(anchor.getFullYear(),anchor.getMonth(),1);
 start.setHours(0,0,0,0);start.setDate(start.getDate()-(start.getDay()+6)%7);
 const end=new Date(start);end.setDate(end.getDate()+(weekly?7:42));const last=new Date(end);last.setDate(last.getDate()-1);
 $('#calendarMonthLabel').textContent=weekly?`${start.toLocaleDateString([],{day:'numeric',month:'short'})} – ${last.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'})}`:anchor.toLocaleDateString([],{month:'long',year:'numeric'});
 grid.replaceChildren();grid.classList.toggle('week-view',weekly);
 const hues=roomHues(state.rooms),rooms=new Map(state.rooms.map(r=>[r.id,{...r,symbol:symbols[r.id]||'🏠',hue:hues.get(r.id)}]));
 const roomFilter=$('#calendarRoomFilter'),filterSummary=$('#calendarRoomFilterSummary');let wholeRoom=options.showRoomFilter===false?'':sessionStorage.getItem(storageKey+'-filter')||'';
 if(wholeRoom&&wholeRoom!=='household'&&!rooms.has(wholeRoom))wholeRoom='';
 if(roomFilter){roomFilter.replaceChildren(new Option('All rooms & household',''),new Option('Household events','household'));for(const room of rooms.values())roomFilter.append(new Option(room.name+(room.archived?' (archived)':''),room.id));roomFilter.value=wholeRoom;roomFilter.onchange=()=>{sessionStorage.setItem(storageKey+'-filter',roomFilter.value);sessionStorage.removeItem(storageKey+'-room');renderLocalCalendar(state,anchor,onComplete,options)}}
 if(filterSummary)filterSummary.textContent='Room filter · '+(wholeRoom==='household'?'Household events':rooms.get(wholeRoom)?.name||'All rooms');
 const legend=$('#calendarLegend');legend.replaceChildren();if(showRecurring)for(const room of rooms.values()){if(room.archived||wholeRoom&&room.id!==wholeRoom)continue;const item=el('span',room.symbol+' '+room.name);item.className='room-legend';item.style.setProperty('--room-hue',room.hue);legend.append(item)}
 const entries=options.entries?[...options.entries]:[];
 if(!options.entries){
 for(const a of state.appointments)entries.push({date:a.date,title:a.text,time:a.startTime,end:a.endTime,kind:'Appointment',type:'appointment',location:a.location});
 for(const e of state.errands.filter(e=>e.dueDate&&e.showOnCalendar!==false))entries.push({date:e.dueDate,title:e.text,kind:e.done?'Completed errand':'Errand',type:'errand',id:e.id,done:e.done});
 if(showSetDay)for(const t of state.tasks.filter(t=>!t.parentId&&!t.recurrence)){const due=t.done?completedTaskDeadline(t):taskDeadline(t);if(due!==null)entries.push({date:dateKey(new Date(due)),title:t.text,roomId:t.roomId,kind:t.done?'Completed set-day task':'Set-day task',type:'task',id:t.id,done:t.done,canUndo:!!t.completionUndo})}
 if(showRecurring)for(const t of state.tasks.filter(t=>!t.parentId&&!t.done&&t.recurrence&&!t.pausedAt)){let due=new Date(t.nextDue||t.activeSince||t.created);if(!Number.isFinite(+due))continue;let estimated=false;for(let i=0;i<4000&&due<end;i++){if(due>=start)entries.push({date:dateKey(due),title:t.text,roomId:t.roomId,roomName:t.area,kind:estimated?'Estimated repeat':'Due',type:'recurring',estimated,id:t.id});const next=new Date(nextOccurrence(t.recurrence,due));if(!(next>due))break;due=next;estimated=true}}
 if(showRecurring)for(const t of state.tasks.filter(t=>t.done&&t.recurrence&&t.completedAt)){const due=new Date(t.completionUndo?.previous?.nextDue||t.completedAt);if(due>=start&&due<end)entries.push({date:dateKey(due),title:t.text,roomId:t.roomId,kind:'Completed',type:'recurring',id:t.id,done:true,canUndo:!!t.completionUndo&&!state.tasks.some(next=>next.id===t.completionUndo.nextTaskId&&next.done)})}
 }
 const filteredEntries=calendarRoomEntries(entries,wholeRoom);
 const currentMonth=dateKey(anchor).slice(0,7),today=dateKey(new Date());let selectedKey=sessionStorage.getItem(storageKey+'-day'),selectedRoom=sessionStorage.getItem(storageKey+'-room')||'';if(wholeRoom&&selectedRoom!==wholeRoom)selectedRoom='';if(!selectedKey||selectedKey.slice(0,7)!==currentMonth){selectedKey=today.slice(0,7)===currentMonth?today:dateKey(new Date(anchor.getFullYear(),anchor.getMonth(),1));selectedRoom=''}
 const selectDay=(d,roomId='')=>{sessionStorage.setItem(storageKey+'-day',dateKey(d));sessionStorage.setItem(storageKey+'-room',roomId);if(d.getMonth()!==anchor.getMonth()||d.getFullYear()!==anchor.getFullYear())jump(d);else renderLocalCalendar(state,anchor,onComplete,options);$('#calendarAgenda').scrollIntoView({behavior:'smooth',block:'nearest'})};
 if(!weekly)for(const day of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']){const n=el('strong',day);n.className='calendar-weekday';grid.append(n)}
 for(let i=0;i<(weekly?7:42);i++){
  const d=new Date(start);d.setDate(d.getDate()+i);const key=dateKey(d),cell=el('section'),heading=el('button',weekly?d.toLocaleDateString([],{weekday:'long',day:'numeric',month:'short'}):String(d.getDate()));cell.className='calendar-day weekday-'+((d.getDay()+6)%7);if(!weekly)cell.classList.toggle('outside-month',d.getMonth()!==anchor.getMonth());cell.classList.toggle('today',key===today);cell.classList.toggle('selected',!weekly&&key===selectedKey);
  heading.className='calendar-day-heading';heading.type='button';heading.setAttribute('aria-label',(weekly?'Show week of ':'Show tasks on ')+d.toLocaleDateString());heading.onclick=()=>weekly?jump(d):selectDay(d);cell.append(heading);
  const dayEntries=filteredEntries.filter(x=>x.date===key).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  if(weekly){appendDayEntries(cell,dayEntries,rooms,state,onComplete);if(!dayEntries.length)cell.append(el('p','Nothing scheduled.'))}
  else{const roomEntries=new Map();for(const event of dayEntries.filter(e=>e.type==='recurring'||e.type==='task')){if(!roomEntries.has(event.roomId))roomEntries.set(event.roomId,[]);roomEntries.get(event.roomId).push(event)}for(const [roomId,events] of roomEntries){const room=rooms.get(roomId),chip=el('button',room?.symbol||'🏠');chip.type='button';chip.className='calendar-room-symbol';chip.style.setProperty('--room-hue',room?.hue||0);chip.title=`${room?.name||'Room'}: ${events.length} tasks`;chip.setAttribute('aria-label',chip.title+' on '+d.toLocaleDateString()+'. Show only these room tasks.');chip.setAttribute('aria-pressed',String(key===selectedKey&&roomId===selectedRoom));chip.onclick=()=>selectDay(d,roomId);cell.append(chip)}for(const event of dayEntries.filter(e=>e.type!=='recurring'&&e.type!=='task')){const n=el('button',(event.type==='appointment'?'● ':'◆ ')+event.title);n.type='button';n.className='calendar-event '+event.type;n.title=event.kind+(event.time?' '+event.time:'')+': '+event.title;n.onclick=()=>selectDay(d);cell.append(n)}}grid.append(cell)
 }
 const agenda=$('#calendarAgenda');agenda.replaceChildren();agenda.hidden=weekly;
 if(!weekly){const date=new Date(selectedKey+'T12:00:00'),heading=el('div'),title=el('h3',date.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'})),viewWeek=el('button','View week'),selectedRoomDetails=wholeRoom?null:rooms.get(selectedRoom);heading.className='calendar-agenda-heading';viewWeek.type='button';viewWeek.onclick=()=>{$('#calendarView').value='week';if(options.elements)sessionStorage.setItem(storageKey+'-view','week');else localStorage.setItem('mc-calendar-view','week');jump(date)};heading.append(title,viewWeek);agenda.append(heading);if(selectedRoomDetails){const filter=el('div'),label=el('strong',`${selectedRoomDetails.symbol} ${selectedRoomDetails.name} tasks only`),clear=el('button','Show everything this day');filter.className='calendar-agenda-filter';clear.type='button';clear.onclick=()=>selectDay(date);filter.append(label,clear);agenda.append(filter)}const dayEntries=filteredEntries.filter(x=>x.date===selectedKey&&(!selectedRoom||x.roomId===selectedRoom)).sort((a,b)=>(a.time||'').localeCompare(b.time||''));appendDayEntries(agenda,dayEntries,rooms,state,onComplete);if(!dayEntries.length)agenda.append(el('p',selectedRoomDetails?'No tasks for this room on this day.':'Nothing scheduled.'))}
 const unscheduled=$('#unscheduledErrands');unscheduled.hidden=!!wholeRoom&&wholeRoom!=='household';if($('#calendarUnscheduled'))$('#calendarUnscheduled').hidden=unscheduled.hidden;unscheduled.replaceChildren();for(const t of state.errands.filter(t=>!t.done&&!t.dueDate&&t.showOnCalendar!==false))unscheduled.append(el('p',t.text+' · add a date in Errands'));if(!unscheduled.children.length)unscheduled.append(el('p','No undated calendar errands.'));
}

// A native instance of the main calendar for room schedules and schedule previews.
export function createSymbolCalendar(state,anchor,entries=null,options={}){
 const root=el('div');root.className='symbol-calendar';const elements={},make=(selector,tag)=>elements[selector]=el(tag);
 const view=make('#calendarView','select');view.append(new Option('Monthly','month'),new Option('Weekly','week'));view.value=sessionStorage.getItem((options.storageKey||'mc-symbol-calendar')+'-view')||'month';view.setAttribute('aria-label','Calendar view');
 const recurring=make('#calendarRecurring','input'),setDay=make('#calendarSetDay','input');recurring.checked=true;setDay.checked=false;
 const title=make('#calendarMonthLabel','strong'),grid=make('#houseCalendarGrid','div'),agenda=make('#calendarAgenda','section'),legend=make('#calendarLegend','div');grid.className='calendar-grid';agenda.className='calendar-agenda';make('#unscheduledErrands','div');
 const draw=date=>{if(options.onJump)options.onJump(date);else root.replaceWith(createSymbolCalendar(state,date,entries,options))};
 const toolbar=el('div');toolbar.className='calendar-month-toolbar';for(const [text,direction] of [['‹',-1],['›',1]]){const button=el('button',text);button.type='button';button.setAttribute('aria-label',direction<0?'Previous calendar period':'Next calendar period');button.onclick=()=>{const date=new Date(anchor);if(view.value==='week')date.setDate(date.getDate()+direction*7);else{date.setDate(1);date.setMonth(date.getMonth()+direction)}draw(date)};toolbar.append(button)}toolbar.insertBefore(title,toolbar.lastChild);toolbar.prepend(view);
 legend.className='calendar-legend';const details=el('details'),summary=el('summary','Room symbols');details.className='calendar-legend-wrap';details.append(summary,legend);root.append(toolbar);
 if(options.showRoomFilter!==false){const filter=el('details'),summary=make('#calendarRoomFilterSummary','summary'),fields=el('div'),label=el('label','Room'),select=make('#calendarRoomFilter','select');filter.className='optional-section calendar-room-filter';fields.className='optional-fields';label.append(select);fields.append(label);filter.append(summary,fields);root.append(filter)}
 root.append(details,grid,agenda);
 view.onchange=()=>{sessionStorage.setItem((options.storageKey||'mc-symbol-calendar')+'-view',view.value);draw(anchor)};
 renderLocalCalendar(state,anchor,options.onComplete,{...options,storageKey:options.storageKey||'mc-symbol-calendar',elements,entries,onJump:draw});return root;
}
