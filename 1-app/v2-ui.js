import {localStorage,sessionStorage} from './safe-storage.js';
import {isLaundryItem,isLaundryCycleItem,deleteLaundryItem} from './laundry.js?v=checklist-20261012-v3';
import {nextDueDate,setNextDue} from './recurring-schedule.js?v=tools-20261012-v1';
import {appendCycleStepControls,appendCycleAutoOption} from './task-tools-ui.js?v=checklist-20261012-v3';
import {renderSidequestTabs,fillQuestTabs,sidequestMatches} from './sidequest-tabs.js';
import {appendItemImage,readItemImage} from './item-images.js';
import {recurringSections,recurringTiming,appendRecurringTiming,setTabLabel,appendTaskGroups,colourTaskPositions} from './task-ui.js?v=tools-20261012-v1';
import {createSymbolCalendar} from './house-calendar.js?v=tools-20261012-v1';
import {roomArtworkFor} from './room-art.js';
import {characterLine} from './personalities.js';
import {messPhrase,cleanPercent,isSparkling,barState} from './mess-phrase.js';
import {createReusable,saveReusable,deleteReusable,roomTemplates,taskDeadline,overdueTaskGroups,addSavedTasks,activeSavedTasks,removeSavedTasks,reusableSuggestionEligible} from './task-extras.js?v=new-tasks-first-20261010-v1';
import {activeTask,completedToday,roomActiveTasks} from './task-flow.js?v=tools-20261012-v1';
import {navigate} from './navigation.js';
import {messPieces,renderRoomMess} from './room-mess.js';
import {displayPersonName} from './completion-history.js?v=tools-20261012-v1';
import {updateCompanion,leaveCompanion} from './room-companion.js?v=mobile-1';
import {placeNewTasksFirst,ordered,priorityOrdered,move,freshTask,roomMess,setRoomMessLevel} from './v2-state.js?v=checklist-20261012-v3';
let getState,save,makeTaskCard,collaboration={},selectedRoom=null,roomBucket="now",roomRecurringView='list',roomRecurringMonth=new Date(),roomRecurringSelectedDay=null,roomRecurringStatus='all',roomSideFilter='all';
let navigationDebugModule,navigationDebugImport;
function syncNavigationDebug(scene,roomId){
 if(new URLSearchParams(location.search).get('creatureDebug')!=='1')return;
 navigationDebugImport ||= import('./room-navigation-debug.js').then(module=>navigationDebugModule=module);
 void navigationDebugImport.then(module=>{if(selectedRoom===roomId&&!document.querySelector('#roomDetail').classList.contains('hide'))module.syncLivingNavigationDebug(scene,roomId)});
}
function removeNavigationDebug(){navigationDebugModule?.removeLivingNavigationDebug()}
let savedTasksNotice='';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const button=(text,action,label=text)=>{const b=el('button',text);b.type='button';b.onclick=action;b.setAttribute('aria-label',label);return b};
function fillAssignees(select,state,value=''){
 select.replaceChildren(new Option('Anyone',''));
 for(const person of [...state.householdPeople].sort((a,b)=>a.name.localeCompare(b.name)))select.append(new Option(displayPersonName(person),person.id));
 select.value=state.householdPeople.some(person=>person.id===value)?value:'';
}
export function initV2(get,changed,taskCard,shared={}){getState=get;save=changed;makeTaskCard=taskCard;collaboration=shared;
 const roomSceneDetails=document.querySelector('#roomSceneDetails'),sceneChoice=localStorage.getItem('mc-room-scene-open');
 roomSceneDetails.open=sceneChoice===null?!matchMedia('(max-width:600px)').matches:sceneChoice==='true';
 roomSceneDetails.ontoggle=()=>{localStorage.setItem('mc-room-scene-open',String(roomSceneDetails.open));if(selectedRoom)renderRoom(getState())};
 document.querySelector('#backHouse').onclick=()=>document.querySelector('nav button[data-tab="house"]').click();
 document.querySelector('#homeAdd').onclick=()=>quickAdd();
 document.querySelector('#roomQuickAdd').onclick=()=>roomBucket==='homeless'?editHomeless():quickAdd(selectedRoom,{bucket:roomBucket,type:roomSideFilter==='all'?'organisation':roomSideFilter});
 document.querySelector('#roomBottomAdd').onclick=()=>roomBucket==='homeless'?editHomeless():quickAdd(selectedRoom,{bucket:roomBucket,type:roomSideFilter==='all'?'organisation':roomSideFilter});
 document.querySelectorAll('[data-open-reusable]').forEach(button=>{button.onclick=()=>{document.querySelector('#reusableDialog').showModal();document.querySelector('#reusableDialog').focus()}});
 installInlineTemplates('task','area');const reusableForm=document.querySelector('#addReusable');
 reusableForm.elements.allRooms.onchange=()=>{reusableForm.elements.room.disabled=reusableForm.elements.allRooms.checked;reusableForm.elements.room.required=!reusableForm.elements.allRooms.checked};
 reusableForm.oninput=()=>document.querySelector('#reusableStatus').textContent='';
 reusableForm.onsubmit=e=>{e.preventDefault();const st=getState(),fields=reusableForm.elements;
  const created=createReusable(st,{text:fields.text.value,roomId:fields.room.value,allRooms:fields.allRooms.checked,subtasks:fields.subtasks.value,doingNow:fields.doingNow.checked});
  if(!created.length){document.querySelector('#reusableStatus').textContent='No template added. Check the task name and rooms; matching templates already saved are kept.';return}
  savedTasksNotice=`Saved ${created.length===1?'reusable task':`templates for ${created.length} rooms`}.`;reusableForm.reset();fields.room.disabled=false;fields.room.required=true;document.querySelector('#reusableStatus').textContent='';document.querySelector('#reusableDialog').close();save();
 };

 document.querySelector('#quickTaskForm').elements.bucket.onchange=quickFields;
 document.querySelector('#addRoom').onsubmit=e=>{e.preventDefault();const input=document.querySelector('#roomName'),name=input.value.trim(),st=getState();if(!name)return;if(st.rooms.some(r=>r.name.toLowerCase()===name.toLowerCase())){input.setCustomValidity('That room already exists. Restore it if archived.');input.reportValidity();input.oninput=()=>input.setCustomValidity('');return}st.rooms.push({id:crypto.randomUUID(),name,order:Math.max(-1,...st.rooms.map(r=>r.order))+1,archived:false});input.value='';save()};
}
export function renderV2(st){const templateRoom=document.querySelector('#templateRoomFilter');if(templateRoom&&!templateRoom.dataset.bound){templateRoom.dataset.bound='1';templateRoom.onchange=()=>renderLibrary(getState())}
 if(!document.querySelector('#house').classList.contains('hide'))renderHouse(st);if(!document.querySelector('#library').classList.contains('hide')||!document.querySelector('#laundryLibrary').classList.contains('hide'))renderLibrary(st);if(!document.querySelector('#roomDetail').classList.contains('hide'))renderRoom(st);
 const overdue=document.querySelector('#homeOverdue'),important=document.querySelector('#homeImportantOverdue'),groups=overdueTaskGroups(st.tasks);overdue.replaceChildren();important.replaceChildren();important.hidden=!groups.important.length;if(groups.important.length){important.append(el('h3','⚠ Important · do these first'));for(const t of groups.important)important.append(makeTaskCard(t,'task'))}for(const t of groups.other)overdue.append(makeTaskCard(t,'task'));if(!groups.other.length)overdue.append(el('p',groups.important.length?'No other overdue tasks.':'No overdue tasks.'));
 const list=document.querySelector('#roomList');list.replaceChildren();
 const rooms=ordered(st.rooms);
 rooms.forEach((r,i)=>{
  const row=el('article');row.className='task';const body=el('div');body.className='body';body.append(el('strong',r.name),el('span',r.archived?'Archived · history kept':`${roomMess(st,r.id).state} · ${roomMess(st,r.id).count} active tasks`));
  const tools=el('div');tools.className='tools';
  tools.append(button('Rename',()=>renameRoom(r.id)));
  for(const [label,d] of [['↑',-1],['↓',1]]){const b=button(label,()=>{move(st.rooms,r.id,d);save()},`${d<0?'Move up':'Move down'} ${r.name}`);b.disabled=i+d<0||i+d>=rooms.length;tools.append(b)}
  tools.append(button(r.archived?'Restore':'Archive',()=>{r.archived=!r.archived;save()}));row.append(body,tools);list.append(row);
 });
}

export function editTask(t){
 const st=getState();if(isLaundryCycleItem(st,t)&&!window.confirm('This task is part of a laundry cycle. Editing it may change that cycle. Continue?'))return;
 const dialog=document.querySelector('#taskEditor'),form=document.querySelector('#editTaskForm'),originalTask=JSON.stringify(t);
 for(const section of form.querySelectorAll('details.optional-section'))section.open=false;
 form.elements.text.value=t.text;form.elements.effort.value=t.effort||'';
 const rooms=form.elements.room;rooms.replaceChildren();for(const r of ordered(st.rooms).filter(r=>!r.archived||r.id===t.roomId||isLaundryItem(t)&&r.id==='room-laundry'))rooms.append(new Option(r.name+(r.archived?' (archived)':''),r.id));rooms.value=t.roomId||(isLaundryItem(t)?'room-laundry':'');
 form.elements.allowance.value=t.allowanceDays||'';form.elements.dueDate.value=t.dueDate?new Date(t.dueDate).toISOString().slice(0,10):'';form.elements.impact.value=t.messImpact||'normal';
 form.elements.important.checked=t.priority==='high';
 fillAssignees(form.elements.assignee,st,t.assignedTo||'');
 const recipients=form.elements.notifyRecipient;recipients.replaceChildren(new Option('No notification',''));for(const person of st.householdPeople.filter(p=>p.id!=='local-device'))recipients.append(new Option(`Notify ${displayPersonName(person)}`,person.id));recipients.value='';
 const laundry=st.settings.some(x=>x.id===t.id),template=st.templates.some(x=>x.id===t.id),side=st.side.some(x=>x.id===t.id),r=t.recurrence;form.querySelector('[data-cycle-auto]')?.remove();const autoDoing=appendCycleAutoOption(t,template?'templates':laundry?'settings':'tasks',form);
 const imagePanel=document.querySelector('#editTaskImage');imagePanel.replaceChildren();imagePanel.hidden=!side;document.querySelector('#editQuestTab').hidden=!side;fillQuestTabs(form.elements.questType,st,t.type);if(side)appendItemImage(imagePanel,t,()=>getState().side.find(x=>x.id===t.id),save);
 document.querySelector('#editRepeatOptions').hidden=template||side;document.querySelector('#editRepeatOptions').open=!!r;
 recipients.closest('label').hidden=template;
 document.querySelector('#repeatFields').hidden=template;
 form.elements.repeat.value=r?(r.kind==='fixed-weekday'?'fixed-weekday':r.kind==='days'&&r.every===1?'daily':r.kind==='weeks'&&r.every===1?'weekly':r.kind):'';
 form.elements.interval.value=r?.every||1;
 for(const c of form.querySelectorAll('[name=weekday]'))c.checked=!!r?.days?.includes(Number(c.value))||(r?.kind==='fixed-weekday'&&Number(c.value)===r.day);
 const originalDue=nextDueDate(t);form.elements.nextDue.value=originalDue;form.elements.importantWhenOverdue.checked=!!t.importantWhenOverdue;
 const scheduleUI=()=>{document.querySelector('#editNextDueLabel').hidden=!form.elements.repeat.value;document.querySelector('#editImportantOverdueLabel').hidden=!form.elements.repeat.value;form.elements.nextDue.required=!!form.elements.repeat.value;form.elements.dueDate.closest('label').hidden=!!form.elements.repeat.value;form.elements.allowance.closest('label').hidden=!!form.elements.repeat.value;document.querySelector('#intervalLabel').hidden=!['days','weeks'].includes(form.elements.repeat.value);form.elements.interval.disabled=template||!['days','weeks'].includes(form.elements.repeat.value);document.querySelector('#weekdayChoices').hidden=!['weekdays','fixed-weekday'].includes(form.elements.repeat.value);form.elements.repeat.setCustomValidity('')};form.elements.repeat.onchange=scheduleUI;for(const c of form.querySelectorAll('[name=weekday]'))c.onchange=()=>form.elements.repeat.setCustomValidity('');scheduleUI();
 form.onsubmit=e=>{e.preventDefault();const current=getState()[template?'templates':laundry?'settings':st.side.some(x=>x.id===t.id)?'side':'tasks'].find(x=>x.id===t.id);if(!current){dialog.close();alert('This item was removed on another device.');return}if(r&&JSON.stringify(current)!==originalTask){alert('This task changed on another device. Close and reopen the editor.');return}t=current;const text=form.elements.text.value.trim();if(!text)return;
 const kind=form.elements.repeat.value,days=[...form.querySelectorAll('[name=weekday]:checked')].map(c=>Number(c.value));
 if(!template&&['weekdays','fixed-weekday'].includes(kind)&&!days.length){form.elements.repeat.setCustomValidity('Choose at least one weekday.');form.elements.repeat.reportValidity();return}
 if(side)t.type=form.elements.questType.value;
 if(!template&&!side){t.recurrence=kind?(kind==='weekdays'?{kind,days}:kind==='fixed-weekday'?{kind,day:days[0]}:{kind:kind==='daily'?'days':kind==='weekly'?'weeks':kind,every:['daily','weekly'].includes(kind)?1:Number(form.elements.interval.value)}):null;if(!t.recurrence)t.scheduled=false;}
 if(t.recurrence&&!side&&!template){if(form.elements.nextDue.value!==originalDue||!r||!t.nextDue)setNextDue(t,form.elements.nextDue.value);t.importantWhenOverdue=form.elements.importantWhenOverdue.checked;}
 if(autoDoing)t.autoDoingNow=autoDoing.checked;t.effort=form.elements.effort.value||null;t.text=text;t.messImpact=form.elements.impact.value;t.priority=form.elements.important.checked?'high':'mid';t.roomId=rooms.value;t.allowanceDays=!t.recurrence&&form.elements.allowance.value?Number(form.elements.allowance.value):null;t.dueDate=!t.recurrence&&form.elements.dueDate.value?new Date(form.elements.dueDate.value+'T12:00:00').toISOString():null;t.assignedTo=form.elements.assignee.value||null;t.assignedToName=st.householdPeople.find(person=>person.id===t.assignedTo)?.name||null;if(t.allowanceDays&&!t.activeSince)t.activeSince=t.created||new Date().toISOString();const recipient=!template&&st.householdPeople.find(person=>person.id===recipients.value);if(recipient)collaboration.notifyTasks?.([t],recipient);dialog.close();save()};
 dialog.showModal();
}

function renderLibrary(st){
 const list=document.querySelector('#templateList'),completed=document.querySelector('#completedLibrary'),roomFilter=document.querySelector('#templateRoomFilter'),addRoom=document.querySelector('#addReusable').elements.room;list.replaceChildren();completed.replaceChildren();const selected=roomFilter.value;roomFilter.replaceChildren(new Option('All rooms',''));addRoom.replaceChildren();for(const room of st.rooms.filter(r=>!r.archived)){roomFilter.append(new Option(room.name,room.id));addRoom.append(new Option(room.name,room.id))}roomFilter.value=selected;const available=st.templates.filter(t=>!t.parentTemplateId&&st.rooms.some(r=>r.id===t.roomId&&!r.archived));
 const laundryList=document.querySelector('#laundryTemplateList');laundryList.replaceChildren();renderLaundrySchedule(st);
 const savedAdd=button('Add saved tasks',()=>quickAdd(roomFilter.value||null,{mode:'saved'}));savedAdd.className='add-task-main';list.append(savedAdd);
 const notice=el('p',savedTasksNotice);notice.setAttribute('role','status');list.append(notice);
 if(!st.templates.length)list.append(el('p','No saved tasks.'));
 let previousRoom=null;for(const t of ordered(st.templates.filter(t=>!t.parentTemplateId&&(isLaundryItem(t)||!roomFilter.value||t.roomId===roomFilter.value)))){const target=isLaundryItem(t)?laundryList:list;const room=st.rooms.find(r=>r.id===t.roomId);if(!roomFilter.value&&room?.id!==previousRoom){const heading=el('h3',room?.name||t.area||'Other');heading.className='template-room-heading';heading.style.setProperty('--room-hue',room?.hue||((st.rooms.findIndex(r=>r.id===room?.id)*43+160)%360));target.append(heading);previousRoom=room?.id}
  const row=el('article');row.dataset.taskId=t.id;row.dataset.collection=st.templates.some(x=>x.id===t.id)?'templates':'settings';row.className='task task-card reference-task';const body=el('div'),heading=el('div'),meta=el('span',t.area);body.className='body';heading.className='task-heading';meta.className='meta';heading.append(el('strong',t.text));body.append(heading,meta);const tools=el('div');tools.className='tools';
  row.style.setProperty('--task-hue',room?.hue||((st.rooms.findIndex(r=>r.id===room?.id)*43+160)%360));
  const present=activeSavedTasks(st,t).length>0;const add=button(present?'Remove':'Add task',()=>{const state=getState();if(activeSavedTasks(state,t).length){removeSavedTasks(state,t);savedTasksNotice=`Removed ${t.text} from Tasks.`}else{addSavedTasks(state,[t.id]);savedTasksNotice=`Added ${t.text} to Tasks.`}save()});add.className='task-create';const footer=el('div'),options=el('details');footer.className='task-footer';options.className='task-options';tools.append(button('Edit',()=>editTask(t)),button('Delete',()=>{confirmDelete(()=>{deleteReusable(getState(),t);save()},t.groupId?()=>{deleteReusable(getState(),t,true);save()}:null,isLaundryCycleItem(st,t))}));appendCycleStepControls(t,'templates',tools);options.append(el('summary','Edit & options'),tools);footer.append(add);const children=st.templates.filter(child=>child.parentTemplateId===t.id);if(children.length){const details=el('details');details.className='saved-subtasks';details.append(el('summary',`Subtasks (${children.length})`));const addChildren=(id,target)=>{for(const child of st.templates.filter(x=>x.parentTemplateId===id)){const line=el('div');line.append(el('strong',child.text),button('Edit',()=>editTask(child)),button('Delete',()=>{confirmDelete(()=>{deleteReusable(getState(),child);save()},null,isLaundryCycleItem(st,child))}));target.append(line);addChildren(child.id,line)}};addChildren(t.id,details);body.append(details)}body.append(options,footer);row.append(body);if(isLaundryItem(t))bindLaundryCard(row);target.append(row);
 }
 const candidates=[...st.tasks.filter(t=>t.done&&!t.recurrence),...st.wins.filter(w=>!st.tasks.some(t=>'win-'+t.id===w.id)&&!w.recurrence)].filter(item=>{
  const completion=item.completedAt||item.at||st.wins.find(w=>w.taskId===item.id||w.id==='win-'+item.id)?.at;
  return reusableSuggestionEligible(item,Date.now(),completion);
 });
 for(const t of candidates){
  const row=el('article');row.className='task';const body=el('div');body.className='body';body.append(el('strong',t.text),el('span',t.area));const saved=st.templates.some(x=>x.sourceId===t.id);
  const tools=el('div');tools.className='tools';const b=button(saved?'Saved':'Save as reusable',()=>{saveReusable(getState(),t);save()});b.disabled=saved;
  tools.append(b,button('Remove suggestion',()=>{
   const state=getState(),task=state.tasks.find(x=>x.id===t.id),win=state.wins.find(x=>x.id===t.id||x.taskId===t.id||x.id==='win-'+t.id);
   (task||win||t).reusableDismissedAt=new Date().toISOString();save();
  }));row.append(body,tools);completed.append(row);
 }
 if(!candidates.length)completed.append(el('p','No recent completed jobs to save.'));colourTaskPositions(list);colourTaskPositions(completed);document.dispatchEvent(new Event('mc-lists-rendered'));
}

function bindLaundryCard(row){
 const title=row.querySelector('strong');title.tabIndex=0;title.setAttribute('role','button');title.setAttribute('aria-expanded','false');
 const toggle=()=>{const expanded=row.classList.toggle('compact-expanded');title.setAttribute('aria-expanded',String(expanded));const subtasks=row.querySelector(':scope > .body > .saved-subtasks');if(subtasks)subtasks.open=expanded};
 title.onclick=toggle;title.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
}

function renderLaundrySchedule(st){
 const list=document.querySelector('#laundryScheduleList');list.replaceChildren();
 const roots=(st.settings||[]).filter(t=>!t.parentId&&!t.taskTiming&&isLaundryItem(t)&&!t.done);
 const renderItem=(t,target)=>{
  const row=el('article');row.dataset.taskId=t.id;row.dataset.collection=st.templates.some(x=>x.id===t.id)?'templates':'settings';row.className='task task-card reference-task';const body=el('div');body.className='body';body.append(el('strong',t.text));
  const options=el('details');options.className='task-options';options.append(el('summary','Edit & options'));
  options.append(button('Edit',()=>editTask(t)),button('Delete',()=>{
   const warning=isLaundryCycleItem(getState(),t)?'This task is part of a laundry cycle. Deleting it may change that cycle. ':'';
   if(!window.confirm(warning+`Delete “${t.text}” and its subtasks? Completion history will stay.`))return;
   deleteLaundryItem(getState(),t);save();
  }));appendCycleStepControls(t,'settings',options);body.append(options);
  const children=st.settings.filter(child=>child.parentId===t.id&&!child.archived);
  if(children.length){const details=el('details');details.className='saved-subtasks';details.append(el('summary',`Subtasks (${children.length})`));for(const child of children)renderItem(child,details);body.append(details)}
  row.append(body);if(isLaundryItem(t))bindLaundryCard(row);target.append(row);
 };
 for(const t of roots)renderItem(t,list);
 if(!roots.length)list.append(el('p','No saved laundry schedules.'));
}

const guardianSprites={
 'room-cats':{src:'assets/sprites/cats-states.webp',ratio:.707},
 'room-entrance':{src:'assets/sprites/entrance-states.webp',ratio:.75},
 'room-hall':{src:'assets/sprites/hall-states.webp',ratio:.667},
 'room-master':{src:'assets/sprites/master-states.webp',ratio:.686},
 'room-penny':{src:'assets/sprites/penny-states.webp',ratio:.75},
 'room-print':{src:'assets/sprites/print-states.webp',ratio:.75},
 'room-craft':{src:'assets/sprites/craft-states.webp',ratio:.734},
 'room-kitchen':{src:'assets/sprites/kitchen-states.webp',ratio:.75},
 'room-bathroom':{src:'assets/sprites/bathroom-states.webp',ratio:.75},
 'room-living':{src:'assets/sprites/living-states.webp',ratio:.75}
};
const floors=[['Loft rooms',['room-craft','room-cats','room-print']],['Main living floor',['room-master','room-penny','room-bathroom','room-living']],['Entrance floor',['room-hall','room-kitchen']],['Entrance',['room-entrance']]];
const positions={
 'room-craft':[5,13.934,32,19.294], 'room-cats':[38,13.934,25,19.294], 'room-print':[64,13.934,31,19.294],
 'room-master':[4,35.372,21,23.581], 'room-penny':[26,35.372,25,23.581],
 'room-bathroom':[52,35.372,13,23.581], 'room-living':[65,35.372,30,23.581],
 'room-hall':[12,60.025,36,18.222], 'room-kitchen':[50,60.025,44,18.222],
 'room-entrance':[22,79.319,57,16.078]
};
function messLabel(m){return messPhrase(m.percent)}
function renderHouse(st){
 const root=document.querySelector('#houseRooms');root.replaceChildren();
 if(document.body.classList.contains('simple-view')){const list=el('div');list.className='simple-rooms';ordered(st.rooms).filter(r=>!r.archived).forEach((r,i)=>{const b=button('',()=>openRoom(r.id));b.style.setProperty('--room-hue',String(i*137.5%360));b.append(el('strong',r.name),el('span',messPhrase(roomMess(st,r.id).percent)));list.append(b)});root.append(list);return;}
 const scene=el('div');scene.className='house-scene';
 const img=el('img');img.src='assets/house.png';img.alt='Tidy-ish house. Choose a labelled room to open it.';scene.append(img);
 const other=el('div');other.className='other-rooms';
 for(const r of ordered(st.rooms).filter(r=>!r.archived)){
  const m=roomMess(st,r.id),pos=positions[r.id];const b=button('',()=>openRoom(r.id),`Open ${r.name}, ${messLabel(m)}`);b.dataset.state=m.state;b.dataset.barState=barState(m.percent,m.state);b.dataset.room=r.id;
  if(pos){
   b.className='house-hotspot';Object.assign(b.style,{left:pos[0]+'%',top:pos[1]+'%',width:pos[2]+'%',height:pos[3]+'%'});
   const status=el('span',messPhrase(m.percent));status.className='house-status';status.style.setProperty('--room-clean',cleanPercent(m.percent)+'%');if(isSparkling(m.percent))status.dataset.sparkle='true';status.setAttribute('aria-hidden','true');const name=el('span',r.name);name.className='house-room-name';b.append(name,status);scene.append(b)
  }
  else{b.append(el('strong',r.name),el('small',messLabel(m)));other.append(b)}
 }
 const settings=button('',()=>document.querySelector('nav [data-tab=preferences]').click(),'Settings and backups');settings.className='house-map-settings';scene.append(settings);
 root.append(scene);if(other.children.length){root.append(el('p','More rooms & categories'),other)}
}
function openRoom(id){navigate('house',id)}
export function showRoom(id){if(id!==selectedRoom||!id)leaveCompanion();if(!id)removeNavigationDebug();selectedRoom=id;roomBucket='now';roomRecurringView='list';roomRecurringMonth=new Date();roomRecurringSelectedDay=null;if(!id)return;sessionStorage.setItem('mc-open-room',id);document.querySelector('#house').classList.add('hide');document.querySelector('#roomDetail').classList.remove('hide');renderRoom(getState());window.scrollTo({top:0,behavior:'instant'})}
function renderRoom(st){
 const r=st.rooms.find(r=>r.id===selectedRoom&&!r.archived);if(!r){leaveCompanion();return}
 const mess=roomMess(st,r.id);document.querySelector('#detailName').textContent=r.name;document.querySelector('#guardianName').hidden=true;
 document.querySelector('#roomSceneState').textContent=messLabel(mess);
 document.querySelector('#detailState').textContent=messLabel(mess);document.querySelector('#roomMessBar').value=cleanPercent(mess.percent);document.querySelector('#roomMessBar').setAttribute('aria-label','Room cleanliness: '+messPhrase(mess.percent));document.querySelector('#roomMessBar').dataset.state=mess.state;document.querySelector('#roomMessBar').dataset.barState=barState(mess.percent,mess.state);document.querySelector('#roomMessBar').dataset.sparkle=isSparkling(mess.percent)?'true':'false';document.querySelector('#detailState').dataset.sparkle=isSparkling(mess.percent)?'true':'false';
 const level=document.querySelector('#roomMessLevel'),levelOutput=document.querySelector('#roomMessLevelOutput'),levelForm=document.querySelector('#roomMessLevelForm');level.value=Math.round(mess.percent);
 const showLevel=()=>{levelOutput.value=level.value+'% mess';level.setAttribute('aria-valuetext',levelOutput.value)};showLevel();level.oninput=showLevel;
 levelForm.onsubmit=event=>{event.preventDefault();setRoomMessLevel(getState(),r.id,level.value);save()};
 const resetLevel=document.querySelector('#resetRoomMessLevel');resetLevel.hidden=!mess.calibrated;resetLevel.onclick=()=>{delete getState().rooms.find(room=>room.id===r.id).messCalibration;save()};
 document.querySelector('#roomMood').textContent=characterLine(st,r,mess,document.body.dataset.snark||'gentle');
 const scene=document.querySelector('#roomScene');scene.dataset.room=r.id;scene.classList.toggle('living-scene',r.id==='room-living');
 const art=document.querySelector('#guardianArea');art.dataset.state=mess.state;art.dataset.guardian=r.id;
 const asset=guardianSprites[r.id],key=asset?`${r.id}:${asset.src}`:r.id;
 if(art.dataset.visualKey!==key){
  const facing=el('div');facing.className='companion-facing';
  if(asset){const sprite=el('div');sprite.className='guardian-sprite';sprite.style.setProperty('--sprite',`url("${asset.src}")`);sprite.style.setProperty('--sprite-ratio',asset.ratio);sprite.setAttribute('role','img');facing.append(sprite)}
  art.replaceChildren(facing);art.dataset.visualKey=key;
 }
 art.querySelector('.guardian-sprite')?.setAttribute('aria-label',`${r.guardian||r.name}, ${mess.state.toLowerCase()} state`);
 if(r.id==='room-master'){const frames={SPOTLESS:[0,590],CLEAN:[590,428],MESSY:[1018,429],DISASTER:[1447,631]},[x,width]=frames[mess.state],sprite=art.querySelector('.guardian-sprite');if(sprite&&sprite.dataset.animator!=='master'){sprite.style.backgroundSize=(2078/width*100)+'% 100%';sprite.style.backgroundPosition=(x/(2078-width)*100)+'% 50%';sprite.style.aspectRatio=width+'/757';}}
 const background=roomArtworkFor(r.id,mess.state);scene.style.backgroundImage=background?`url("${background}")`:'';scene.classList.toggle('supplied-room-art',!!background);
 const clutter=background?[]:messPieces(r.id,mess.percent);renderRoomMess(scene,r.id,mess.percent,clutter);
 syncNavigationDebug(scene,r.id);
 if(document.body.classList.contains('simple-view')||!document.querySelector('#roomSceneDetails').open)leaveCompanion();else updateCompanion(r.id,mess,clutter);
 document.querySelector('#roomQuickAdd').textContent=roomBucket==='homeless'?'＋ Add homeless item':roomBucket==='side'?'＋ Add sidequest':'＋ Add task';document.querySelector('#roomBottomAdd').textContent=document.querySelector('#roomQuickAdd').textContent;
 const sidequestIds=new Set(st.side.map(task=>task.id));const roomTaskItems=st.tasks.filter(task=>!sidequestIds.has(task.id)&&task.bucket!=='side');
 const groups={homeless:st.homeless.filter(t=>!t.parentId&&!t.done&&t.roomId===r.id),now:roomActiveTasks(st,r.id),side:st.side.filter(t=>!t.parentId&&!t.done&&t.roomId===r.id&&sidequestMatches(t,roomSideFilter)),recurring:[...new Map(roomTaskItems.filter(t=>!t.parentId&&!t.done&&!t.archived&&t.recurrence&&t.roomId===r.id).map(t=>[t.roomId+'|'+(t.recurringGroupId||t.seriesId||t.id),t])).values()]};
 const tabs=document.querySelector('#roomTabs');tabs.replaceChildren();for(const [key,name] of [['now','Tasks'],['side','Side quests'],['recurring','Recurring'],['homeless','Homeless']]){const b=setTabLabel(button(name,()=>{roomBucket=key;renderRoom(getState())}),name,groups[key].length);b.setAttribute('aria-pressed',String(roomBucket===key));tabs.append(b)}
 const sideTabs=document.querySelector('#roomSideTabs');sideTabs.hidden=roomBucket!=='side';if(roomBucket==='side')renderSidequestTabs(sideTabs,st,roomSideFilter,value=>{roomSideFilter=value;renderRoom(getState())},save,getState);
 const list=document.querySelector('#roomTasks'),calendar=document.querySelector('#roomRecurringCalendar'),views=document.querySelector('#roomRecurringViews'),statusTabs=document.querySelector('#roomRecurringStatusTabs');list.replaceChildren();views.hidden=roomBucket!=='recurring';calendar.hidden=roomBucket!=='recurring'||roomRecurringView!=='calendar';list.hidden=roomBucket==='recurring'&&roomRecurringView==='calendar';statusTabs.hidden=roomBucket!=='recurring'||roomRecurringView!=='list';const toggle=document.querySelector('#roomRecurringToggle');toggle.textContent=roomRecurringView==='calendar'?'List view':'Calendar view';toggle.setAttribute('aria-label','Switch to '+toggle.textContent.toLowerCase());toggle.onclick=()=>{roomRecurringView=roomRecurringView==='calendar'?'list':'calendar';if(roomRecurringView==='list')roomRecurringStatus='all';renderRoom(getState())};
 if(roomBucket==='homeless'){renderHomeless(list,st,r.id);document.dispatchEvent(new Event('mc-lists-rendered'));return}
 if(roomBucket==='recurring'&&roomRecurringView==='calendar'){renderRoomRecurringCalendar(calendar,st,r,groups.recurring);document.dispatchEvent(new Event('mc-lists-rendered'));return}
 if(roomBucket==='recurring'){
  statusTabs.replaceChildren();for(const [key,name] of [['all','All'],...recurringSections]){const tasks=groups.recurring.filter(task=>key==='all'||recurringTiming(task).status===key),tab=setTabLabel(button(name,()=>{roomRecurringStatus=key;renderRoom(getState())}),name,tasks.length);tab.setAttribute('aria-pressed',String(key===roomRecurringStatus));statusTabs.append(tab)}
  const tasks=groups.recurring.filter(task=>roomRecurringStatus==='all'||recurringTiming(task).status===roomRecurringStatus);appendTaskGroups(list,priorityOrdered(tasks),task=>appendRecurringTiming(makeTaskCard(task,'task'),task));if(!tasks.length)list.append(el('p','No tasks here.'));
 }else appendTaskGroups(list,priorityOrdered(groups[roomBucket]),t=>makeTaskCard(t,roomBucket==='side'?'side':'task'));
 const history=(roomBucket==='side'?st.side:roomTaskItems).filter(t=>!t.parentId&&completedToday(t,st.wins)&&t.roomId===r.id&&(roomBucket!=='side'||sidequestMatches(t,roomSideFilter))&&(roomBucket==='side'||roomBucket==='recurring'?roomBucket==='side'||!!t.recurrence:true));if(history.length){const box=el('section');box.className='completed-list';box.append(el('h3','Completed today'));for(const t of history)box.append(makeTaskCard(t,roomBucket==='side'?'side':'task'));list.append(box)}if(roomBucket!=='recurring'&&!groups[roomBucket].length&&!history.length){const empty=el('p',roomBucket==='now'?'❧ No tasks right now. Enjoy your calm space.':'Nothing here yet. Add a task whenever you need it.');empty.className='room-empty';list.append(empty)}document.dispatchEvent(new Event('mc-lists-rendered'));
}
function renderRoomRecurringCalendar(root,state,room,tasks){
 const roomState={...state,tasks:state.tasks.filter(task=>task.roomId===room.id&&task.bucket!=='side'&&!state.side.some(side=>side.id===task.id)),appointments:[],errands:[]};
 root.replaceChildren(createSymbolCalendar(roomState,roomRecurringMonth,null,{storageKey:'mc-room-calendar-'+room.id,showRoomFilter:false,taskCountsOnly:false,showSetDay:true,taskActions:true,taskRoomId:room.id,onJump:date=>{roomRecurringMonth=new Date(date);renderRoom(getState())},onComplete:(type,id,done)=>{document.dispatchEvent(new CustomEvent('room-recurring-complete',{detail:{id,done}}))}}));
}
function quickFields(){const f=document.querySelector('#quickTaskForm');document.querySelector('#quickRepeat').hidden=f.elements.bucket.value!=='recurring';f.elements.every.disabled=f.elements.bucket.value!=='recurring';document.querySelector('#quickSide').hidden=f.elements.bucket.value!=='side'}
export function quickAdd(roomId,options={}){
 const dialog=document.querySelector('#quickTask'),f=document.querySelector('#quickTaskForm');f.reset();f.dataset.mode='normal';const side=options.bucket==='side';
 dialog.querySelector('h2').textContent=side?'Add a sidequest':'Add a task';document.querySelector('#quickTaskTabs').hidden=side;document.querySelector('#quickImageLabel').hidden=!side;document.querySelector('#quickTaskStatus').textContent='';document.querySelector('#quickSubmit').disabled=false;f.elements.impact.value=side?'none':'normal';
 const shared=typeof collaboration==='undefined'?{}:collaboration,notify=f.elements.notifyRecipient,state=getState();
 if(notify){notify.replaceChildren(new Option('No notification',''));for(const person of state.householdPeople.filter(person=>person.id!=='local-device'))notify.append(new Option('Notify '+displayPersonName(person),person.id));notify.value=''}
 const rooms=f.elements.room;rooms.replaceChildren(new Option('Choose a room…',''));for(const r of ordered(state.rooms).filter(r=>!r.archived))rooms.append(new Option(r.name,r.id));rooms.value=roomId||'';
 if(f.elements.assignee)fillAssignees(f.elements.assignee,state,options.assignedTo||'');
 const textInput=f.elements.text;f.dataset.taskTextDraft=options.text||'';textInput.value=options.text||'';textInput.autocomplete='off';textInput.removeAttribute?.('list');textInput.oninput=()=>{f.dataset.taskTextDraft=textInput.value};const restoreTaskText=()=>{const draft=f.dataset.taskTextDraft;if(!textInput.value.trim()&&draft?.trim())textInput.value=draft};textInput.onblur=restoreTaskText;textInput.oninvalid=event=>{const draft=f.dataset.taskTextDraft;if(!textInput.value.trim()&&draft?.trim()){event.preventDefault();restoreTaskText();document.querySelector('#quickTaskStatus').textContent='Your task name was restored. Adding it now…';setTimeout(()=>{if(dialog.open)f.requestSubmit()},0)}};f.elements.doingNow.checked=!!options.doingNow;f.elements.bucket.value=options.bucket==='recurring'?'now':options.bucket||'now';fillQuestTabs(f.elements.questType,state,options.type||'organisation');f.elements.important.checked=options.priority==='high';
 const priority=()=>f.elements.important.checked?'high':'mid',alreadyAdded=(state,template,room)=>state.tasks.some(task=>!task.done&&task.roomId===room&&(task.sourceTemplateId===template.id||task.text.trim().toLocaleLowerCase()===template.text.trim().toLocaleLowerCase()));
 const updateRequired=()=>{const saved=f.dataset.mode==='saved';f.elements.text.required=!saved;f.elements.text.disabled=saved;f.elements.template.disabled=saved};
 const refresh=()=>{const state=getState(),items=roomTemplates(state,rooms.value),available=items.filter(t=>!alreadyAdded(state,t,rooms.value)),menu=f.elements.template,suggestions=document.querySelector('#quickSuggestions'),multiple=document.querySelector('#quickSavedMultiple');menu.replaceChildren(new Option('Choose a reusable task…',''));suggestions.replaceChildren();for(const t of available){menu.append(new Option(t.text,t.id));suggestions.append(new Option(t.text,t.text))}if(multiple?.id!=='quickSavedMultiple')return;multiple.hidden=f.dataset.mode!=='saved';const list=multiple.querySelector('.saved-task-options');list.replaceChildren();for(const t of available){const choice=document.createElement('label');choice.className='saved-task-select';const check=document.createElement('input');check.type='checkbox';check.name='savedTemplate';check.value=t.id;const labelText=document.createElement('span');labelText.textContent=t.text;choice.append(check,labelText);list.append(choice)}document.querySelector('#quickSavedEmpty').textContent=!rooms.value?'Choose a room to see its saved tasks.':!available.length?'No saved tasks available in this room. Active saved tasks are already on the list.':'';document.querySelector('#quickSavedAll').hidden=!available.length};
 const apply=t=>{if(!t||side)return;f.elements.text.value=t.text;f.dataset.taskTextDraft=t.text;f.elements.impact.value=t.messImpact||'normal';f.elements.important.checked=t.priority==='high';f.dataset.template=t.id};
 const setMode=mode=>{f.dataset.mode=mode;const recurring=mode==='recurring';f.hidden=recurring;document.querySelector('#quickRecurringBody').hidden=!recurring;for(const field of f.querySelectorAll?.('[data-normal-field]')||[])field.hidden=mode==='saved'||side&&field.hasAttribute('data-task-only');for(const field of f.querySelectorAll?.('[data-task-only]')||[])field.hidden=side||mode==='saved';for(const tab of document.querySelectorAll('[data-quick-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.quickTab===mode));document.querySelector('#quickSavedMultiple').hidden=mode!=='saved';document.querySelector('#quickSubmit').textContent=mode==='saved'?'Add selected tasks':side?'Add sidequest':'Add task';const doing=f.querySelector?.('[data-doing-now]');if(doing)doing.hidden=side;updateRequired();if(recurring)document.dispatchEvent(new CustomEvent('add-recurring',{detail:{roomId:roomId||rooms.value,inline:true}}));};
 for(const tab of document.querySelectorAll('[data-quick-tab]'))tab.onclick=()=>setMode(tab.dataset.quickTab);
 rooms.onchange=()=>{delete f.dataset.template;refresh();updateRequired()};f.elements.template.onchange=()=>apply(roomTemplates(getState(),rooms.value).find(t=>t.id===f.elements.template.value));f.elements.text.onchange=()=>{delete f.dataset.template;apply(roomTemplates(getState(),rooms.value).find(t=>t.text===f.elements.text.value))};
 delete f.dataset.template;refresh();apply(roomTemplates(getState(),rooms.value).find(t=>t.text===f.elements.text.value));
 f.elements.allRooms.onchange=()=>{if(f.elements.allRooms.checked)f.elements.reusable.checked=true};f.elements.reusable.onchange=()=>{if(!f.elements.reusable.checked)f.elements.allRooms.checked=false};f.onchange=updateRequired;
 const addAll=document.querySelector('#quickSavedAll');if(addAll?.id==='quickSavedAll')addAll.onclick=()=>{if(f.dataset.mode!=='saved')return;for(const check of f.querySelectorAll('[name=savedTemplate]'))check.checked=true;f.requestSubmit()};
 f.onsubmit=async e=>{e.preventDefault();const savedMode=f.dataset.mode==='saved',typedText=f.elements.text.value.trim(),draftText=(f.dataset.taskTextDraft||'').trim(),text=savedMode?'':typedText||draftText;if(!savedMode&&!text){document.querySelector('#quickTaskStatus').textContent='Enter a task name before adding.';f.elements.text.focus();return}if(!savedMode&&!typedText&&draftText)f.elements.text.value=draftText;let attachment;const imageFile=f.elements.image.files?.[0];if(side&&imageFile){document.querySelector('#quickSubmit').disabled=true;try{attachment=await readItemImage(imageFile)}catch(error){document.querySelector('#quickTaskStatus').textContent=error.message;document.querySelector('#quickSubmit').disabled=false;return}}const st=getState(),r=st.rooms.find(r=>r.id===rooms.value&&!r.archived);if(!r)return;const bucket=f.elements.bucket.value,collection=bucket==='side'?st.side:st.tasks,selected=savedMode?[...(f.querySelectorAll?.('[name=savedTemplate]:checked')||[])].map(x=>x.value):[],templates=roomTemplates(st,r.id).filter(t=>selected.includes(t.id)&&!alreadyAdded(st,t,r.id)),added=[];if(savedMode&&!templates.length){document.querySelector('#quickSavedEmpty').textContent='Tick at least one saved task.';return}
 const addOne=(template,override={})=>{const assignedTo=f.elements.assignee?.value||null,assignedToName=st.householdPeople?.find(person=>person.id===assignedTo)?.name||null;const t=freshTask({...template,...override,roomId:r.id,area:r.name,messImpact:override.messImpact||template?.messImpact||f.elements.impact.value,priority:override.priority||template?.priority||priority(),assignedTo,assignedToName},crypto.randomUUID(),new Date().toISOString(),Math.max(-1,...collection.map(t=>t.order??0))+1);t.bucket='now';if(bucket==='side'){t.type=f.elements.questType.value;if(attachment)t.image=attachment;}if(f.elements.doingNow.checked&&bucket!=='side'){t.doingNow=true;t.doingNowOrder=Math.max(-1,...st.tasks.map(x=>x.doingNowOrder??-1))+1}collection.push(t);added.push(t);if(template?.id&&st.templates.some(item=>item.id===template.id)){t.sourceTemplateId=template.id;const generated=new Map([[template.id,t.id]]),pending=[...st.templates.filter(child=>child.parentTemplateId===template.id)];while(pending.length){const source=pending.shift();if(generated.has(source.id))continue;const child=freshTask({...source,roomId:r.id,area:r.name,assignedTo,assignedToName,sourceTemplateId:source.id},crypto.randomUUID(),new Date().toISOString(),Math.max(-1,...collection.map(item=>item.order??0))+1);child.parentId=generated.get(source.parentTemplateId)||t.id;generated.set(source.id,child.id);collection.push(child);pending.push(...st.templates.filter(item=>item.parentTemplateId===source.id))}}return t};
 const template=side?null:roomTemplates(st,r.id).find(t=>t.id===f.dataset.template);let first;if(text&&template&&alreadyAdded(st,template,r.id)){document.querySelector('#quickTaskStatus').textContent='This reusable task is already in this room.';return}if(text){first=addOne(template,{text,priority:priority(),messImpact:f.elements.impact.value});for(const childText of (f.elements.subtasks?.value||'').split(/\r?\n/).map(value=>value.trim()).filter(Boolean)){const child=freshTask({text:childText,roomId:r.id,area:r.name,assignedTo:first.assignedTo,assignedToName:first.assignedToName},crypto.randomUUID(),new Date().toISOString(),Math.max(-1,...collection.map(t=>t.order??0))+1);child.parentId=first.id;child.bucket='now';if(side){child.type=first.type;child.messImpact='none'}collection.push(child)}}for(const saved of templates)first?addOne(saved):first=addOne(saved);
 placeNewTasksFirst(collection,added);placeNewTasksFirst(st.tasks,added.filter(task=>task.doingNow),'doingNowOrder');
 if(!side&&!savedMode&&f.elements.reusable.checked&&first)saveReusable(st,first,f.elements.allRooms.checked);const target=st.householdPeople.find(person=>person.id===notify?.value);if(target)shared.notifyTasks?.(added,target);dialog.close();options.onAdded?.();save()};quickFields();dialog.showModal();setMode(options.mode==='saved'?'saved':options.bucket==='recurring'?'recurring':'normal');
}
function installInlineTemplates(textId,roomInputId){
 const input=document.getElementById(textId),room=document.getElementById(roomInputId),suggestions=el('datalist'),menu=el('select');suggestions.id=textId+'Suggestions';input.setAttribute('list',suggestions.id);menu.setAttribute('aria-label','Reusable tasks for selected room');input.after(suggestions,menu);
 const refresh=()=>{const st=getState(),r=st.rooms.find(r=>r.name.toLowerCase()===room.value.trim().toLowerCase()),items=roomTemplates(st,r?.id);suggestions.replaceChildren();menu.replaceChildren(new Option('Reusable tasks…',''));for(const t of items){suggestions.append(new Option(t.text,t.text));menu.append(new Option(t.text,t.id))}};
 menu.onfocus=refresh;input.onfocus=refresh;room.addEventListener('input',refresh);menu.onchange=()=>{const t=getState().templates.find(t=>t.id===menu.value);if(t)input.value=t.text};refresh();
}
function editHomeless(item){
 const dialog=document.querySelector('#homelessEditor'),form=document.querySelector('#homelessForm'),roomId=selectedRoom;form.elements.text.value=item?.text||'';
 form.onsubmit=e=>{e.preventDefault();const text=form.elements.text.value.trim();if(!text)return;const st=getState();if(item){const current=st.homeless.find(x=>x.id===item.id);if(current)current.text=text}else st.homeless.push({id:crypto.randomUUID(),roomId,text,created:new Date().toISOString(),done:false});dialog.close();save()};dialog.showModal();if(item)form.elements.text.focus();else dialog.focus();
}
function renderHomeless(list,st,roomId){

 const items=st.homeless.filter(t=>t.roomId===roomId),history=el('details');history.append(el('summary',`Found a home (${items.filter(t=>t.done).length})`));
 for(const item of items){const row=el('article'),body=el('div'),tools=el('div');row.dataset.taskId=item.id;row.dataset.collection='homeless';row.className='task';body.className='body';tools.className='tools';body.append(el('strong',item.text));
 if(item.done)body.append(el('span','Found a home '+new Date(item.completedAt).toLocaleDateString()));
 else tools.append(button('Found a home',()=>{const t=getState().homeless.find(x=>x.id===item.id);if(t){t.done=true;t.completedAt=new Date().toISOString();save()}}),button('Edit',()=>editHomeless(item)));
 tools.append(button('Delete',()=>{getState().homeless=getState().homeless.filter(x=>x.id!==item.id);save()}));row.append(body,tools);(item.done?history:list).append(row)}
 if(!items.some(t=>!t.done))list.append(el('p','No items waiting for a home.'));list.append(history);
}

function renameRoom(id){
 const dialog=document.querySelector('#roomEditor'),form=document.querySelector('#renameRoomForm'),input=form.elements.name;
 input.value=getState().rooms.find(r=>r.id===id).name;input.setCustomValidity('');input.oninput=()=>input.setCustomValidity('');
 form.onsubmit=e=>{e.preventDefault();const st=getState(),r=st.rooms.find(r=>r.id===id),name=input.value.trim();if(!r||!name)return;if(st.rooms.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase())){input.setCustomValidity('That name is already used by another room.');input.reportValidity();return}r.name=name;dialog.close();save()};dialog.showModal();
}
function confirmDelete(action,allAction=null,laundryCycle=false){const dialog=document.querySelector('#confirmAction');const all=document.querySelector('#confirmAll');all.hidden=!allAction;all.onclick=()=>{dialog.close();allAction?.()};document.querySelector('#confirmYes').textContent=allAction?'Delete from this room':'Delete template';document.querySelector('#confirmMessage').textContent=(laundryCycle?'This task is part of a laundry cycle. Deleting it may change that cycle. ':'')+'Delete this reusable template? Existing tasks and history will stay.';document.querySelector('#confirmYes').onclick=()=>{dialog.close();action()};dialog.showModal()}
