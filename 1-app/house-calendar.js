import {roomHues} from './room-colours.js';
import {recurrenceLabel} from './v2-state.js?v=schedule-20261010-v1';
import {localDateKey as dateKey} from './calendar.js';
import {taskDeadline} from './task-extras.js';
import {setNextDue} from './recurring-schedule.js?v=schedule-20261010-v1';
import {subtasksForDisplay} from './subtasks.js?v=streamline-20261009-v2';
const $=s=>document.querySelector(s),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const symbols={'room-master':'🛏️','room-penny':'🧸','room-kitchen':'🍽️','room-living':'🛋️','room-bathroom':'🛁','room-hall':'🚪','room-entrance':'🔑','room-cats':'🐈','room-print':'🖨️','room-craft':'🎨'};
export const roomSymbol=id=>symbols[id]||'🏠';

export const calendarRoomEntries=(entries,roomId='')=>entries.filter(entry=>!roomId||(roomId==='household'?!entry.roomId:entry.roomId===roomId));
// Upcoming calendars show the next activation, never guessed future completions.
export function upcomingCalendarEntries(state,{showRecurring=true,showSetDay=true}={}){
 const entries=[];
 for(const a of state.appointments||[])entries.push({date:a.date,title:a.text,time:a.startTime,end:a.endTime,type:'appointment',location:a.location});
 for(const e of (state.errands||[]).filter(e=>!e.done&&e.dueDate&&e.showOnCalendar!==false))entries.push({date:e.dueDate.slice(0,10),title:e.text,type:'errand',id:e.id});
 for(const task of (state.tasks||[]).filter(t=>!t.parentId&&!t.done&&!t.pausedAt)){
  if(task.recurrence&&!showRecurring||!task.recurrence&&!showSetDay)continue;
  const due=task.recurrence?Date.parse(task.nextDue||task.activeSince||task.created):task.dueDate?Date.parse(task.dueDate):taskDeadline({...task,scheduled:false});
  if(!Number.isFinite(due))continue;
  entries.push({date:dateKey(new Date(due)),title:task.text,roomId:task.roomId,type:task.recurrence?'recurring':'task',id:task.id});
 }
 return entries;
}

const moveFields=['nextDue','dueDate','activeSince','scheduled','bucket','allowanceDays'];
const moveSnapshot=task=>Object.fromEntries(moveFields.filter(key=>key in task).map(key=>[key,structuredClone(task[key])]));
// Recheck the source day before moving: a concurrent edit must not move a different occurrence.
export function moveCalendarRoom(state,{ids,roomId,from,to},now=Date.now()){
 const date=new Date(to+'T00:00:00');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(to)||!Number.isFinite(+date)||dateKey(date)!==to)throw new Error('Choose a valid day.');
 if(from===to)return [];
 const visible=new Set(upcomingCalendarEntries(state).filter(e=>e.roomId===roomId&&e.date===from).map(e=>e.id)),selected=new Set(ids),undo=[];
 for(const task of state.tasks)if(selected.has(task.id)&&visible.has(task.id)){
  const before=moveSnapshot(task);
  if(task.recurrence)setNextDue(task,to,now);
  else{task.dueDate=date.toISOString();task.nextDue=task.dueDate;task.scheduled=+date>+now;task.bucket='now'}
  undo.push({id:task.id,before,after:moveSnapshot(task)});
 }
 return undo;
}
export function undoCalendarRoomMove(state,undo){
 let count=0;
 for(const item of undo){const task=state.tasks.find(t=>t.id===item.id&&!t.done&&!t.pausedAt);if(!task||JSON.stringify(moveSnapshot(task))!==JSON.stringify(item.after))continue;
  for(const key of moveFields)delete task[key];Object.assign(task,item.before);count++;
 }
 return count;
}
function calendarRoomDrag(grid,options,status){
 let picked=null,target=null,touch=null,suppressClick=false;
 const announce=text=>status.textContent=text;
 const clear=()=>{target?.classList.remove('calendar-drop-target');picked?.chip.classList.remove('calendar-room-dragging');picked?.chip.setAttribute('aria-pressed','false');picked=null;target=null};
 const pointCell=(x,y)=>document.elementsFromPoint(x,y).map(n=>n.closest('.calendar-day')).find(n=>n&&grid.contains(n));
 const aim=cell=>{target?.classList.remove('calendar-drop-target');target=cell;target?.classList.add('calendar-drop-target');if(cell)announce('Move to '+new Date(cell.dataset.date+'T12:00:00').toLocaleDateString())};
 const pick=chip=>{clear();picked={chip,ids:JSON.parse(chip.dataset.taskIds),roomId:chip.dataset.roomId,from:chip.dataset.date};chip.classList.add('calendar-room-dragging');chip.setAttribute('aria-pressed','true');aim(chip.closest('.calendar-day'))};
 const drop=()=>{if(!picked)return;const move=target&&{ids:picked.ids,roomId:picked.roomId,from:picked.from,to:target.dataset.date};clear();suppressClick=true;setTimeout(()=>suppressClick=false,500);if(move&&move.from!==move.to){sessionStorage.setItem((options.storageKey||'mc-calendar')+'-day',move.to);options.onMoveRoom(move)}else announce('Move cancelled.')};
 grid.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;const chip=e.target.closest('.calendar-room-symbol[data-task-ids]');if(!chip)return;touch={chip,x:e.clientX,y:e.clientY,id:e.pointerId};chip.setPointerCapture(e.pointerId)};
 grid.onpointermove=e=>{if(!touch||touch.id!==e.pointerId)return;if(!picked&&Math.hypot(e.clientX-touch.x,e.clientY-touch.y)>8)pick(touch.chip);if(picked){e.preventDefault();aim(pointCell(e.clientX,e.clientY));if(e.pointerType==='touch'){if(e.clientY<24)window.scrollBy(0,-8);else if(e.clientY>window.innerHeight-24)window.scrollBy(0,8)}}};
 grid.onpointerup=e=>{if(!touch||touch.id!==e.pointerId)return;touch=null;if(picked){e.preventDefault();aim(pointCell(e.clientX,e.clientY));drop()}};
 grid.onpointercancel=()=>{touch=null;clear();announce('Move cancelled.')};
 grid.onclick=e=>{if(suppressClick){e.preventDefault();e.stopPropagation()}};
 grid.onkeydown=e=>{const chip=e.target.closest('.calendar-room-symbol[data-task-ids]');if(!chip)return;
  if(!picked&&(e.key===' '||e.key==='Enter')){e.preventDefault();pick(chip);announce('Room picked up. Arrow keys choose a day; Enter moves; Escape cancels.');return}
  if(picked?.chip!==chip)return;
  if(e.key==='Escape'){e.preventDefault();clear();announce('Move cancelled.')}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();drop()}
  else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const cells=[...grid.querySelectorAll('.calendar-day')],at=cells.indexOf(target),step={ArrowLeft:-1,ArrowRight:1,ArrowUp:grid.classList.contains('week-view')?-1:-7,ArrowDown:grid.classList.contains('week-view')?1:7}[e.key];const next=cells[at+step];if(next)aim(next)}
 };
 return ()=>suppressClick||!!picked;
}

export function scheduledCalendarState(state,proposals){
 const preview=structuredClone(state),dates=new Map(proposals.map(p=>[p.id,p.date]));
 for(const task of preview.tasks)if(dates.has(task.id)){task.nextDue=dates.get(task.id);task.activeSince=task.nextDue;task.scheduled=Date.parse(task.nextDue)>Date.now();task.previewChange=true}
 return preview;
}
export function calendarStep(anchor,direction){const d=new Date(anchor);if($('#calendarView').value==='week')d.setDate(d.getDate()+direction*7);else{d.setDate(1);d.setMonth(d.getMonth()+direction)}return d}
function jump(date){document.dispatchEvent(new CustomEvent('calendar-jump',{detail:{date}}))}
function appendDayEntries(container,entries,rooms,state,onComplete){
 for(const event of entries.filter(event=>!event.done))container.append(eventRow(event,rooms,state,onComplete));
 const completed=entries.filter(event=>event.done);
 if(completed.length){const group=el('section');group.className='calendar-completed-tasks';group.append(el('h4','Completed tasks'));for(const event of completed)group.append(eventRow(event,rooms,state,onComplete));container.append(group)}
}
function eventRow(event,rooms,state,onComplete){
 const entry=el('article');entry.className='calendar-event calendar-task-row '+event.type+(event.estimated?' estimated':'')+(event.done?' completed':'');entry.dataset.entryId=event.id||'';
 const room=rooms.get(event.roomId);entry.classList.toggle('calendar-muted-room',!!room?.muted);if(room)entry.style.setProperty('--room-hue',room.hue);
 const row=el('div');row.className='calendar-task-main';row.append(el('span',room?room.symbol+' '+room.name: (event.type==='appointment'?'Appointment':'Errand')));const title=el('button',event.title);title.type='button';title.className='calendar-task-title';row.append(title);
 const children=['recurring','task'].includes(event.type)?subtasksForDisplay(state.tasks,event.id):[];
 if(children.length){const count=el('span',`${children.filter(child=>child.done).length}/${children.length} subtasks`);count.className='calendar-subtask-progress';row.append(count)}
 if(onComplete&&event.id&&!event.estimated){const done=el('button',event.done?'Undo':'Done it!');done.type='button';done.className='calendar-done';done.disabled=event.type==='recurring'&&event.done&&!event.canUndo;done.setAttribute('aria-label',(event.done?'Undo completion: ':'Complete: ')+event.title);done.onclick=e=>{e.stopPropagation();onComplete(event.type,event.id,!event.done)};const footer=el('div');footer.className='calendar-task-footer';footer.append(done);entry.append(footer)}
 entry.prepend(row);
 const info=el('div');info.className='calendar-task-info';info.hidden=document.body.classList.contains('task-compact-view');
 const task=state.tasks.find(t=>t.id===event.id);
 if(task){
  if(task.recurrence){info.append(el('p',recurrenceLabel(task)));const previous=Date.parse(task.lastDone||'');info.append(el('p',Number.isFinite(previous)?`${Math.max(0,Math.floor((Date.now()-previous)/86400000))} days since last done`:'Not completed yet'));info.append(el('p','Next active: '+new Date(event.date+'T12:00:00').toLocaleDateString()))}
  if(task.notes)info.append(el('p',task.notes));if(task.previewChange)info.append(el('strong','Proposed date'));
 }
 if(children.length){const sublist=el('div');sublist.className='calendar-subtasks';for(const child of children){const childRow=el('div');childRow.className='calendar-subtask-row'+(child.done?' completed':'');childRow.append(el('span',(child.done?'✓ ':'○ ')+child.text));if(onComplete){const done=el('button',child.done?'Undo':'Done it!');done.type='button';done.className='calendar-done';done.disabled=child.done&&!child.completionUndo;done.setAttribute('aria-label',(child.done?'Undo completion: ':'Complete: ')+child.text);done.onclick=e=>{e.stopPropagation();onComplete('task',child.id,!child.done)};childRow.append(done)}sublist.append(childRow)}info.append(sublist)}
 if(info.children.length){title.setAttribute('aria-expanded',String(!info.hidden));title.setAttribute('aria-label','Task information: '+event.title);title.onclick=()=>{info.hidden=!info.hidden;title.setAttribute('aria-expanded',String(!info.hidden))};entry.append(info)}else title.disabled=true;
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
 let dragging=()=>false;
 if(options.onMoveRoom){const tools=el('div');tools.className='calendar-drag-tools';const status=el('span','Drag a room symbol to another day to move its tasks.');status.setAttribute('role','status');tools.append(status);if(options.onUndoRoomMove){const undo=el('button','Undo room move');undo.type='button';undo.onclick=options.onUndoRoomMove;tools.append(undo)}grid.append(tools);dragging=calendarRoomDrag(grid,{...options,storageKey},status)}
 const hues=roomHues(state.rooms),rooms=new Map(state.rooms.map(r=>[r.id,{...r,symbol:symbols[r.id]||'🏠',hue:hues.get(r.id),muted:!!options.focusRoomIds&&!options.focusRoomIds.includes(r.id)}]));
 const roomFilter=$('#calendarRoomFilter'),filterSummary=$('#calendarRoomFilterSummary');let wholeRoom=options.showRoomFilter===false?'':sessionStorage.getItem(storageKey+'-filter')||'';
 if(wholeRoom&&wholeRoom!=='household'&&!rooms.has(wholeRoom))wholeRoom='';
 if(roomFilter){roomFilter.replaceChildren(new Option('All rooms & household',''),new Option('Household events','household'));for(const room of rooms.values())roomFilter.append(new Option(room.symbol+' '+room.name+(room.archived?' (archived)':''),room.id));roomFilter.value=wholeRoom;roomFilter.onchange=()=>{sessionStorage.setItem(storageKey+'-filter',roomFilter.value);sessionStorage.removeItem(storageKey+'-room');renderLocalCalendar(state,anchor,onComplete,options)}}
 if(filterSummary)filterSummary.textContent='Room filter · '+(wholeRoom==='household'?'Household events':rooms.get(wholeRoom)?.name||'All rooms');
 const entries=options.entries?[...options.entries]:upcomingCalendarEntries(state,{showRecurring,showSetDay});
 const filteredEntries=calendarRoomEntries(entries,wholeRoom);
 const currentMonth=dateKey(anchor).slice(0,7),today=dateKey(new Date());let selectedKey=options.selectedDay||sessionStorage.getItem(storageKey+'-day'),selectedRoom='';if(wholeRoom&&selectedRoom!==wholeRoom)selectedRoom='';if(!selectedKey||selectedKey.slice(0,7)!==currentMonth){selectedKey=today.slice(0,7)===currentMonth?today:dateKey(new Date(anchor.getFullYear(),anchor.getMonth(),1));selectedRoom=''}
 const selectDay=(d,roomId='')=>{sessionStorage.setItem(storageKey+'-day',dateKey(d));sessionStorage.removeItem(storageKey+'-room');if(options.onSelectDate){options.onSelectDate(d);return}if(d.getMonth()!==anchor.getMonth()||d.getFullYear()!==anchor.getFullYear())jump(d);else renderLocalCalendar(state,anchor,onComplete,options);$('#calendarAgenda').scrollIntoView({behavior:'smooth',block:'nearest'})};
 if(!weekly)for(const day of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']){const n=el('strong',day);n.className='calendar-weekday';grid.append(n)}
 for(let i=0;i<(weekly?7:42);i++){
  const d=new Date(start);d.setDate(d.getDate()+i);const key=dateKey(d),cell=el('section'),heading=el('button',weekly?d.toLocaleDateString([],{weekday:'long',day:'numeric',month:'short'}):String(d.getDate()));cell.dataset.date=key;cell.className='calendar-day weekday-'+((d.getDay()+6)%7);if(!weekly)cell.classList.toggle('outside-month',d.getMonth()!==anchor.getMonth());cell.classList.toggle('today',key===today);cell.classList.toggle('selected',key===selectedKey);
  heading.className='calendar-day-heading';heading.type='button';heading.setAttribute('aria-label',(options.onSelectDate?'Move tasks to ':weekly?'Show week of ':'Show tasks on ')+d.toLocaleDateString());heading.onclick=()=>options.onSelectDate?selectDay(d):weekly?jump(d):selectDay(d);cell.append(heading);
  const dayEntries=filteredEntries.filter(x=>x.date===key).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  const tasks=dayEntries.filter(e=>(e.type==='recurring'||e.type==='task')&&!e.done&&!e.estimated);
  if(!options.taskCountsOnly&&(!weekly||options.onMoveRoom)){
   const roomEntries=new Map();for(const event of tasks){if(!roomEntries.has(event.roomId))roomEntries.set(event.roomId,[]);roomEntries.get(event.roomId).push(event)}
   for(const [roomId,events] of roomEntries){const room=rooms.get(roomId),chip=el('button',(room?.symbol||'🏠')+' '+events.length);chip.type='button';chip.className='calendar-room-symbol'+(room?.muted?' calendar-muted-room':'');chip.style.setProperty('--room-hue',room?.hue||0);chip.title=`${room?.name||'Room'}: ${events.length} tasks`;chip.setAttribute('aria-label',chip.title+' on '+d.toLocaleDateString()+(options.onMoveRoom?'. Drag to reschedule; press Space to move with arrow keys.':''));chip.onclick=e=>{if(dragging()){e.preventDefault();return}selectDay(d)};
    if(options.onMoveRoom){chip.draggable=false;chip.dataset.taskIds=JSON.stringify(events.map(e=>e.id));chip.dataset.roomId=roomId||'';chip.dataset.date=key;chip.setAttribute('aria-pressed','false')}
    cell.append(chip)
   }
  }
  if(weekly){appendDayEntries(cell,dayEntries,rooms,state,onComplete);if(!dayEntries.length)cell.append(el('p','Nothing scheduled.'))}
  else{if(options.taskCountsOnly&&tasks.length){const count=el('button',`${tasks.length}`);count.type='button';count.className='calendar-task-count';count.setAttribute('aria-label',`${tasks.length} tasks become active on ${d.toLocaleDateString()}`);count.onclick=()=>selectDay(d);cell.append(count)}for(const event of dayEntries.filter(e=>e.type!=='recurring'&&e.type!=='task')){const n=el('button',(event.type==='appointment'?'● ':'◆ ')+event.title);n.type='button';n.className='calendar-event '+event.type;n.title=event.title;n.onclick=()=>selectDay(d);cell.append(n)}}grid.append(cell)
 }
 const agenda=$('#calendarAgenda');agenda.replaceChildren();agenda.hidden=weekly||options.showAgenda===false;
 if(!weekly&&options.showAgenda!==false){const date=new Date(selectedKey+'T12:00:00'),heading=el('div'),title=el('h3',date.toLocaleDateString([],{weekday:'long',day:'numeric',month:'long'})),viewWeek=el('button','View week'),selectedRoomDetails=wholeRoom?null:rooms.get(selectedRoom);heading.className='calendar-agenda-heading';viewWeek.type='button';viewWeek.onclick=()=>{$('#calendarView').value='week';if(options.elements)sessionStorage.setItem(storageKey+'-view','week');else localStorage.setItem('mc-calendar-view','week');jump(date)};heading.append(title,viewWeek);agenda.append(heading);const dayEntries=filteredEntries.filter(x=>x.date===selectedKey).sort((a,b)=>(a.time||'').localeCompare(b.time||''));appendDayEntries(agenda,dayEntries,rooms,state,onComplete);if(!dayEntries.length)agenda.append(el('p',selectedRoomDetails?'No tasks for this room on this day.':'Nothing scheduled.'))}
 const unscheduled=$('#unscheduledErrands');unscheduled.hidden=!!wholeRoom&&wholeRoom!=='household';if($('#calendarUnscheduled'))$('#calendarUnscheduled').hidden=unscheduled.hidden;unscheduled.replaceChildren();for(const t of state.errands.filter(t=>!t.done&&!t.dueDate&&t.showOnCalendar!==false))unscheduled.append(el('p',t.text+' · add a date in Errands'));if(!unscheduled.children.length)unscheduled.append(el('p','No undated calendar errands.'));
}

// A native instance of the main calendar for room schedules and schedule previews.
export function createSymbolCalendar(state,anchor,entries=null,options={}){
 const root=el('div');root.className='symbol-calendar';const elements={},make=(selector,tag)=>elements[selector]=el(tag);
 const view=make('#calendarView','select');view.append(new Option('Monthly','month'),new Option('Weekly','week'));view.value=sessionStorage.getItem((options.storageKey||'mc-symbol-calendar')+'-view')||'month';view.setAttribute('aria-label','Calendar view');
 const recurring=make('#calendarRecurring','input'),setDay=make('#calendarSetDay','input');recurring.checked=true;setDay.checked=options.showSetDay!==false;
 const title=make('#calendarMonthLabel','strong'),grid=make('#houseCalendarGrid','div'),agenda=make('#calendarAgenda','section');grid.className='calendar-grid';agenda.className='calendar-agenda';make('#unscheduledErrands','div');
 const draw=date=>{if(options.onJump)options.onJump(date);else root.replaceWith(createSymbolCalendar(state,date,entries,options))};
 const toolbar=el('div');toolbar.className='calendar-month-toolbar';for(const [text,direction] of [['‹',-1],['›',1]]){const button=el('button',text);button.type='button';button.setAttribute('aria-label',direction<0?'Previous calendar period':'Next calendar period');button.onclick=()=>{const date=new Date(anchor);if(view.value==='week')date.setDate(date.getDate()+direction*7);else{date.setDate(1);date.setMonth(date.getMonth()+direction)}draw(date)};toolbar.append(button)}toolbar.insertBefore(title,toolbar.lastChild);toolbar.prepend(view);
 root.append(toolbar);
 if(options.showRoomFilter!==false){const filter=el('label'),summary=make('#calendarRoomFilterSummary','span'),select=make('#calendarRoomFilter','select');filter.className='calendar-room-filter';select.setAttribute('aria-label','Room filter');filter.append(summary,select);root.append(filter)}
 root.append(grid,agenda);
 view.onchange=()=>{sessionStorage.setItem((options.storageKey||'mc-symbol-calendar')+'-view',view.value);draw(anchor)};
 renderLocalCalendar(state,anchor,options.onComplete,{...options,storageKey:options.storageKey||'mc-symbol-calendar',elements,entries,onJump:draw});return root;
}
