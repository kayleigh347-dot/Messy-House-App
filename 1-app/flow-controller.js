import {templateFamilyIds,changeTemplateVisibility,visibleTemplates} from './template-visibility.js';
import {buildFlowSnapshot,liveFlowEntries,flowTaskKey} from './flow-recommendations.js';
import {effectiveFlowDay} from './flow-dates.js';
import {freshTask} from './v2-state.js';
import {addToDoingNow} from './task-flow.js';
import {localStorage} from './safe-storage.js';
import {eligibleForLearning} from './flow-learning.js';
export function initFlow(options){
 let snapshot=null,scope=null,pending=false,flushing=false,notice='',queue=Promise.resolve();
 const mode=()=>options.adaptive.view();
 const houseKey=()=>options.houseKey();
 const contextKey=()=>mode().context?.key+':'+houseKey();
 const house=()=>mode().preferences.flowHouses?.[houseKey()]||{};
 const enabled=()=>!!mode().context&&mode().mode==='flow';
 const pendingKey=()=> 'mc-flow-learning-pending:'+encodeURIComponent(contextKey());
 const readPending=()=>localStorage.readJSON(pendingKey(),[],value=>Array.isArray(value));
 async function flushLearning(){
  if(flushing||!mode().ready)return;const operations=readPending();if(!operations.length)return;
  flushing=true;const expected=contextKey(),key=pendingKey();
  try{await mutate(current=>{
   let events=current.learningEvents||[],completed={...current.eventCompletions};
   for(const operation of operations){if(operation.kind==='completion'){if(operation.recordLearning!==false)events=[...events.filter(event=>event.id!==operation.event.id),operation.event];if(operation.occurrenceId)completed[operation.occurrenceId]={completionId:operation.event.id,taskId:operation.event.taskId};}else{events=events.map(event=>event.taskId===operation.taskId?{...event,deletedAt:operation.at,updatedAt:operation.at}:event);for(const [id,record] of Object.entries(completed))if(record?.taskId===operation.taskId||record==='win-'+operation.taskId||events.some(event=>event.taskId===operation.taskId&&event.id===record))delete completed[id];}}
   return {...current,learningEvents:events,eventCompletions:completed};
  });if(expected===contextKey()){const ids=new Set(operations.map(operation=>operation.id));localStorage.setItem(key,JSON.stringify(readPending().filter(operation=>!ids.has(operation.id))));}}
  finally{flushing=false;}
 }
 const mutate=update=>{const expected=contextKey(),key=houseKey();const action=queue.catch(()=>{}).then(async()=>{if(contextKey()!==expected||!mode().ready)throw Error('The account or household changed. Reopen your settings.');return options.adaptive.updatePreferences(preferences=>{const previous=preferences.flowHouses?.[key]||{};return {...preferences,flowHouses:{...preferences.flowHouses,[key]:update(structuredClone(previous))}}});});queue=action;return action;};
 async function refresh(){
  if(scope!==contextKey()){scope=contextKey();snapshot=null;notice='';document.getElementById('flowAdditionPreview')?.close();}
  if(mode().ready)void flushLearning().catch(()=>{});
  for(const root of document.querySelectorAll('[data-catch-up]')){const wrap=root.closest('details')||root;if(enabled()){wrap.dataset.flowCatchup='true';wrap.hidden=true;}else if(wrap.dataset.flowCatchup){delete wrap.dataset.flowCatchup;wrap.hidden=false;}}
  if(!enabled()){snapshot=null;return;}
  if(!mode().ready){snapshot=house().snapshot||null;notice='Offline — showing your last saved recommendations.';return;}
  if(pending)return;
  const configuration=options.roomSetup.configuration();if(configuration.ready===false||configuration.contextKey&&configuration.contextKey!==mode().context?.key){notice='Waiting for your personal room settings to connect.';return;}
  const preferences=house();if(!preferences.policy){notice='Set your recommendation preferences in Manage home → Schedule.';return;}
  if(preferences.configurationReady===false){notice='Choose your recommendations in Manage home → Schedule, then Finish setup. No tasks are added by setup.';return;}
  const previous=preferences.snapshot,zone=previous?.timeZone||preferences.policy.timeZone,boundaryDay=effectiveFlowDay(Date.now(),zone),newZoneDay=effectiveFlowDay(Date.now(),preferences.policy.timeZone),day=previous&&(boundaryDay<=previous.day||newZoneDay<=previous.day)?previous.day:newZoneDay;
  if(previous?.day===day){snapshot=previous;notice='';return;}
  pending=true;const expected=contextKey();
  try{
   const next=buildFlowSnapshot(options.get(),configuration,preferences,{day,policy:preferences.policy});
   await mutate(current=>current.snapshot?.day===day?current:{...current,snapshot:next});
   if(contextKey()===expected){snapshot=house().snapshot;notice='';options.render();}
  }catch(error){if(contextKey()===expected){notice=error.message||'Recommendations could not be saved. Please try again when connected.';await options.adaptive.refresh();const canonical=house().snapshot;if(canonical?.day===day){snapshot=canonical;notice='';}}}
  finally{pending=false;}
 }
 function view(){const preferences=house();return {enabled:enabled(),ready:mode().ready,scope:contextKey(),notice,house:preferences,snapshot,entries:liveFlowEntries(snapshot,options.get(),preferences)};}
 async function select(entry){
  await options.adaptive.verifyContext();
  if(scope!==contextKey()||!enabled()||!snapshot?.entries.some(item=>item.id===entry.id))throw Error('This recommendation changed. Reopen the view.');
  const live=view().entries.find(item=>item.id===entry.id);if(!live||live.done||live.unavailable)throw Error('This recommendation is no longer available.');
  let state=options.get();let task=live.taskId&&state.tasks.find(task=>task.id===live.taskId);
  if(!task){
   const source=entry.eventId?entry:buildSource(entry);
   const room=state.rooms.find(room=>room.id===entry.roomId&&!room.archived);if(!room)throw Error('Choose a room for this recommendation in settings first.');
   const expected=contextKey();if(!await confirmAddition(entry,room.name))return null;
   if(expected!==contextKey()||scope!==expected||!view().entries.some(item=>item.id===entry.id&&!item.done&&!item.unavailable))throw Error('This recommendation changed. Reopen the view.');
   state=options.get();if(!state.rooms.some(item=>item.id===room.id&&!item.archived&&item.name===room.name))throw Error('This room changed. Review the addition again.');
   const id='flow-task:'+encodeURIComponent(entry.id);task=state.tasks.find(item=>item.id===id);
   if(!task){task=freshTask({...source,text:entry.title,roomId:room.id,area:room.name},id,new Date().toISOString(),Math.max(-1,...state.tasks.map(task=>task.order??0))+1);if(source.sourceTemplateId)task.sourceTemplateId=source.sourceTemplateId;delete task.recurrence;delete task.nextDue;task.scheduled=false;task.flowSourceKey=entry.sourceKey;task.flowOccurrenceId=entry.id;if(entry.eventId)task.flowEventId=entry.eventId;state.tasks.push(task);const children=source.id?visibleTemplates(options.get().templates,house().hiddenTemplateIds).filter(item=>item.parentTemplateId===source.id):[];if(children.length){const parents=new Map([[source.id,task.id]]),pending=[...children];while(pending.length){const template=pending.shift();if(parents.has(template.id))continue;const child=freshTask({...template,roomId:room.id,area:room.name,sourceTemplateId:template.id},id+':'+encodeURIComponent(template.id),task.created,Math.max(-1,...state.tasks.map(task=>task.order??0))+1);child.parentId=parents.get(template.parentTemplateId);parents.set(template.id,child.id);state.tasks.push(child);pending.push(...visibleTemplates(state.templates,house().hiddenTemplateIds).filter(item=>item.parentTemplateId===template.id));}}else for(const [index,text] of (source.steps||[]).entries()){if(typeof text!=='string')continue;const child=freshTask({text,roomId:room.id,area:room.name},id+':step:'+index,task.created,Math.max(-1,...state.tasks.map(task=>task.order??0))+1);child.parentId=task.id;state.tasks.push(child);}}
  }
  if(Date.parse(task.nextDue||task.dueDate)>Date.now())task.flowSelectedDue=(task.nextDue||'')+'|'+(task.dueDate||'');
  addToDoingNow(task,state.tasks);options.save();return task.id;
 }
 function confirmAddition(entry,roomName){return new Promise(resolve=>{const expected=contextKey(),popup=document.createElement('dialog'),title=document.createElement('h2'),description=document.createElement('p'),sharing=document.createElement('p');popup.id='flowAdditionPreview';title.textContent='Add recommended task';description.textContent=entry.title+' → '+roomName;sharing.textContent='This adds one task to the shared room list and Doing Now. Your household can see it.';let confirmed=false;for(const [label,yes] of [['Confirm addition',true],['Cancel',false]]){const action=document.createElement('button');action.type='button';action.textContent=label;action.onclick=()=>{confirmed=yes;popup.close()};popup.append(action);}popup.prepend(title,description,sharing);document.body.append(popup);popup.addEventListener('close',()=>{popup.remove();resolve(confirmed&&expected===contextKey())},{once:true});popup.showModal();});}
 function buildSource(entry){
  if(entry.definition?.templateId){const template=options.get().templates.find(item=>item.id===entry.definition.templateId);if(!template)throw Error('This saved task changed.');return {...template,sourceTemplateId:template.id};}
  const setup=options.roomSetup.configuration().setups.find(item=>item.id===entry.definition?.setupId),choice=setup?.draft.tasks.find(item=>item.id===entry.definition?.entryId);if(!choice)throw Error('This room setup changed.');return choice;
 }
 async function suppress(key,hidden){await mutate(current=>({...current,suppressedIds:hidden?[...new Set([...(current.suppressedIds||[]),key])]:(current.suppressedIds||[]).filter(id=>id!==key)}));options.render();}
 async function capture(task,record){
  // This is an independent date event, never another win or reward transaction.
  if(record?.completedBy!==mode().context?.userId||(!house().learningEnabled&&!task.flowOccurrenceId)||!record||task.parentId||task.clearWay||task.clearWaySourceTaskId)return;
  const taskKey=flowTaskKey(task),settings=house().taskSettings?.[taskKey]||{},recordLearning=!!house().learningEnabled&&eligibleForLearning(task,settings);if(!recordLearning&&!task.flowOccurrenceId)return;
  const event={id:record.id,completionId:record.id,taskId:task.id,taskKey,completedAt:record.at,updatedAt:record.at,deletedAt:null};const operation={id:crypto.randomUUID(),kind:'completion',event,recordLearning,occurrenceId:task.flowOccurrenceId||null};localStorage.setItem(pendingKey(),JSON.stringify([...readPending(),operation]));await flushLearning();
 }
 async function undo(taskId){if(!mode().context||!house().learningEnabled&&!house().eventCompletions)return;localStorage.setItem(pendingKey(),JSON.stringify([...readPending(),{id:crypto.randomUUID(),kind:'undo',taskId,at:new Date().toISOString()}]));await flushLearning();}
 document.addEventListener('adaptive-mode-changed',()=>{void refresh();options.render();});document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});window.addEventListener('online',()=>void refresh());setInterval(()=>{if(!document.hidden)void refresh();},60000);
 async function deleteLearning(){await mutate(current=>({...current,learningEvents:[]}));localStorage.setItem(pendingKey(),'[]');}
 async function setTemplateHidden(template,hidden=true,allRooms=false){
  const expected=contextKey();await options.adaptive.verifyContext();if(expected!==contextKey())throw Error('The account or household changed. Reopen Reusable.');
  const current=options.get().templates.find(item=>item.id===template.id);if(!current||current.groupId!==template.groupId||current.roomId!==template.roomId)throw Error('This saved task changed. Reopen Reusable.');
  const ids=templateFamilyIds(options.get().templates,current,allRooms);await mutate(house=>changeTemplateVisibility(house,ids,hidden));options.render();
 }
 return {view,refresh,select,suppress,mutate,capture,undo,deleteLearning,setTemplateHidden};
}
