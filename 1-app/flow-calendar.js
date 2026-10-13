import {addCivilDays} from './flow-dates.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const button=(text,action)=>{const node=el('button',text);node.type='button';node.onclick=action;return node};
export function renderFlowCalendar(api,ui){
 const view=api.flow.view(),state=api.get(),root=document.getElementById('tidyCalendar'),weekly=document.getElementById('calendarView').value==='week';
 const date=new Date(ui.anchor);date.setHours(12,0,0,0);if(weekly)date.setDate(date.getDate()-(date.getDay()+6)%7);else{date.setDate(1);date.setDate(date.getDate()-(date.getDay()+6)%7);}
 const civil=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,start=civil(date),end=addCivilDays(start,weekly?6:41);
 document.getElementById('calendarMonthLabel').textContent=weekly?`${new Date(start+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${new Date(end+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`:ui.anchor.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
 for(const item of document.querySelectorAll('[data-calendar-view]'))item.setAttribute('aria-pressed',String(item.dataset.calendarView===(weekly?'week':'month')));
 for(const [id,label] of [['previousCalendarMonth','Previous'],['nextCalendarMonth','Next']])document.getElementById(id).setAttribute('aria-label',label+(weekly?' week':' month'));
 const filter=document.getElementById('calendarRoomFilter'),prior=filter.value;filter.replaceChildren(new Option('All rooms & household',''),new Option('Household','household'));for(const room of state.rooms.filter(room=>!room.archived))filter.append(new Option(room.name,room.id));filter.value=prior;
 const entries=view.entries.filter(entry=>!entry.unavailable&&(!filter.value||(filter.value==='household'?!entry.roomId:entry.roomId===filter.value)));
 const eventsFor=day=>[...(state.appointments||[]).filter(event=>event.date===day),...(state.errands||[]).filter(event=>!event.done&&event.showOnCalendar!==false&&event.dueDate?.slice(0,10)===day)].filter(()=>!filter.value||filter.value==='household');
 root.replaceChildren();if(view.notice){const status=el('p',view.notice);status.setAttribute('role','status');root.append(status);}
 if(weekly){const controls=el('div');controls.className='tidy-view-switch';controls.append(button(ui.presentation==='overview'?'Day detail':'Overview',()=>ui.presentationChange(ui.presentation==='overview'?'detail':'overview')));root.append(controls);}
 const grid=el('div');grid.className=weekly?(ui.presentation==='overview'?'tidy-week-overview':'tidy-week-strip'):'tidy-month-grid';if(!weekly)for(const name of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])grid.append(el('strong',name));
 for(let index=0;index<(weekly?7:42);index++){
  const day=addCivilDays(start,index),suggestions=entries.filter(entry=>entry.displayOn===day),events=eventsFor(day),rooms=[...new Set(suggestions.map(entry=>entry.roomId))].map(id=>state.rooms.find(room=>room.id===id)).filter(Boolean);
  const card=button('',()=>ui.selectDay(day));card.className='tidy-day-card'+(day===ui.selected?' is-selected':'')+(day===view.snapshot?.day?' is-today':'');card.dataset.date=day;card.setAttribute('aria-label',`Open ${day}: ${suggestions.length} recommendations`);
  const heading=el('span');heading.className='tidy-card-date';heading.append(el('strong',weekly?new Date(day+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'}):String(new Date(day+'T12:00:00').getDate())),el('small',weekly?new Date(day+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):''));card.append(heading);
  const art=el('span');art.className=weekly?'tidy-card-art':'tidy-month-symbols';for(const room of rooms.slice(0,2))art.append(ui.sprite(room));if(events.length)art.append(el('span','📅'));if(!art.children.length)art.append(el('span','☾'));card.append(art);
  const content=el('span');content.className='tidy-card-content';if(weekly)content.append(el('strong',rooms.length?rooms[0].name+(rooms.length>1?' + '+(rooms.length-1):''):events.length?'Events':''));content.append(el('small',`${suggestions.length} recommendations${events.length?' · '+events.length+' events':''}`));const count=el('span',suggestions.length?String(suggestions.length):'—');count.className='tidy-card-minutes';count.setAttribute('aria-hidden','true');content.append(count);card.append(content);grid.append(card);
 }
 root.append(grid);
 if(weekly&&ui.presentation!=='overview'){
  const selected=ui.selected>=start&&ui.selected<=end?ui.selected:start,panel=el('section');panel.className='tidy-day-panel';panel.append(el('h3',new Date(selected+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})));
  const day=entries.filter(entry=>entry.displayOn===selected);if(!day.length)panel.append(el('p','No recommendations for this day.'));
  const extra=el('details');extra.append(el('summary','More recommendations'));
  for(const entry of day){const row=el('article');row.className='calendar-checklist-row flow-recommendation-row';const text=el('div');text.className='calendar-checklist-text';text.append(el('strong',entry.title),el('small',entry.reason));const action=button(entry.done?'Completed':state.tasks.find(task=>task.id===entry.taskId)?.doingNow?'In Doing Now':'Add to Doing Now',async()=>{action.disabled=true;try{const id=await api.flow.select(entry);if(id)api.toast('Added to Doing Now.');else action.disabled=false;}catch(error){api.toast(error.message);action.disabled=false;}});action.disabled=entry.done||!!state.tasks.find(task=>task.id===entry.taskId)?.doingNow;row.append(text,action);const options=el('details');options.append(el('summary','Options'),button('Stop recommending this task',async()=>{try{await api.flow.suppress(entry.sourceKey,true)}catch(error){api.toast(error.message)}}));text.append(options);(entry.primary?panel:extra).append(row);}
  if(extra.children.length>1)panel.append(extra);
  for(const event of eventsFor(selected))panel.append(el('p',event.title||event.text||event.name||'Event'));root.append(panel);
 }
}
