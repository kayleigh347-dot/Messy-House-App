import {scheduleNext} from './v2-state.js?v=checklist-20261012-v3';
import {repeatChildren,childrenOf,descendants} from './subtasks.js';
import {completionRecord} from './task-stats.js';

export const laundrySteps=['Put a load on','Put out washing','Put away clothes on rail'];
export const dryerSteps=['Put a load on','Put in dryer','Empty dryer'];
const progressKey=cycle=>cycle==='dryer'?'laundry-dryer-progress':'laundry-progress';
const validCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
export function laundryProgress(state,cycle='rail'){
 const progressId=progressKey(cycle),steps=cycle==='dryer'?dryerSteps:laundrySteps;
 const saved=validCount(state.settings?.find(item=>item.id===progressId)?.completedSteps);
 const completed=(state.wins||[]).reduce((count,win)=>win.laundry&&(win.laundryCycle||'rail')===cycle?Math.max(count,validCount(win.laundrySequence)):count,saved);
 const index=completed%steps.length;
 return {completed,index,text:steps[index],cycle:Math.floor(completed/steps.length)+1};
}
// Each household occurrence has one stable completion ID, including across a sync merge.
export function completeLaundryStep(state,expectedCompleted,actor,at=new Date().toISOString(),cycle='rail'){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device');
 const progress=laundryProgress(state,cycle),progressId=progressKey(cycle);
 if(!person||progress.completed!==expectedCompleted)return null;
 const sequence=progress.completed+1,taskId=(cycle==='dryer'?'laundry-dryer-':'laundry-')+sequence;
 if(state.wins?.some(win=>win.id==='win-'+taskId))return null;
 const room=state.rooms?.find(room=>!room.archived&&/laundry/i.test(room.name))||state.rooms?.find(room=>!room.archived&&/kitchen/i.test(room.name));
 const task={id:taskId,text:progress.text,roomId:room?.id,area:room?.name||'Laundry',seriesId:(cycle==='dryer'?'laundry-dryer-step-':'laundry-step-')+progress.index};
 const record={...completionRecord(task,at,'task',person),laundry:true,laundryCycle:cycle,laundrySequence:sequence,points:1};
 state.wins||=[];state.settings||=[];state.wins.unshift(record);
 let saved=state.settings.find(item=>item.id===progressId);
 if(!saved){saved={id:progressId};state.settings.push(saved)}
 saved.completedSteps=sequence;saved.updatedAt=at;
 if(progress.index===0){saved.reminderStartedAt=at;saved.reminderActorId=person.id}else if(progress.index===1){delete saved.reminderStartedAt;delete saved.reminderActorId}
 return record;
}

export const laundryDue=(task,now=Date.now())=>!task.done&&!task.archived&&!task.pausedAt&&(!task.nextDue||Date.parse(task.nextDue)<=now);
export const laundryTasks=(state,now=Date.now())=>(state.settings||[]).filter(item=>item.laundryTask&&laundryDue(item,now));
// Completed extras remain visible below the due tasks; completion still uses laundryTasks.
export const laundryTaskList=(state,now=Date.now())=>[...laundryTasks(state,now).filter(t=>!t.parentId),...(state.settings||[]).filter(t=>t.laundryTask&&!t.parentId&&t.done).sort((a,b)=>String(a.completedAt).localeCompare(String(b.completedAt)))];
export const isLaundryItem=t=>!!(t.laundryImported||t.laundryTask||t.laundryUniform||t.laundryCycle||t.roomId==='room-laundry'||t.area==='Laundry');
export function isLaundryCycleItem(state,task){
 const items=[...(state.settings||[]),...(state.templates||[]),...(state.tasks||[])],seen=new Set();
 let current=task;
 while(current&&!seen.has(current.id)){
  seen.add(current.id);
  if(current.laundryUniform||current.laundryCycle||isLaundryItem(current)&&/^(laundry|wash uniform[.!]?|put a load on|put out washing|put away clothes on rail|put in dryer|empty dryer)$/i.test(current.text||''))return true;
  current=items.find(t=>t.id===(current.parentId||current.parentTemplateId||current.sourceId));
 }
 return false;
}
export function deleteLaundryItem(state,task){
 const ids=new Set([task.id]);let changed=true;
 while(changed){changed=false;for(const item of state.settings||[])if(ids.has(item.parentId)&&!ids.has(item.id)){ids.add(item.id);changed=true}}
 state.settings=(state.settings||[]).filter(item=>!ids.has(item.id));
}
export function undoLaundryTask(state,taskId,at=new Date().toISOString()){
 const task=(state.settings||[]).find(t=>t.id===taskId&&t.done&&(t.laundryTask||t.laundryUniform||t.parentId&&isLaundryItem(state.settings.find(parent=>parent.id===t.parentId)||t)));if(!task)return false;
 const parent=state.settings.find(item=>item.id===task.parentId);if(parent?.done){if(!undoLaundryTask(state,parent.id,at))return false;if(!task.done)return true;}
 let uniformRoot=task;const ancestors=new Set();while(uniformRoot.parentId&&!ancestors.has(uniformRoot.id)){ancestors.add(uniformRoot.id);uniformRoot=state.settings.find(row=>row.id===uniformRoot.parentId)||uniformRoot; }const handoff=state.settings.find(row=>row.uniformHandoff&&row.uniformId===uniformRoot.id);if(handoff){const load=state.settings.find(row=>row.id===loadKey(handoff.slot));if(JSON.stringify(load)!==JSON.stringify(handoff.afterLoad))return false;if(handoff.beforeLoad){Object.keys(load).forEach(key=>delete load[key]);Object.assign(load,structuredClone(handoff.beforeLoad));}else state.settings=state.settings.filter(row=>row!==load);state.settings=state.settings.filter(row=>row!==handoff);}
 const completedAt=task.completedAt,ids=new Set([task.id]);let more=true;
 while(more){more=false;for(const item of state.settings)if(ids.has(item.parentId)&&!ids.has(item.id)){ids.add(item.id);more=true}}
 const reopened=state.settings.filter(t=>ids.has(t.id)&&t.completedAt===completedAt),reopenedIds=new Set(reopened.map(t=>t.id));
 if(task.recurrence){const next=scheduleNext(task,new Date(completedAt));const occurrence=next&&state.settings.find(t=>t.id===next.id);if(occurrence&&!occurrence.done)deleteLaundryItem(state,occurrence)}
 state.wins=(state.wins||[]).filter(w=>!reopenedIds.has(w.taskId));
 for(const item of reopened){if(item.laundryScheduleUndo){const previous=item.laundryScheduleUndo;if(previous.hasNextDue)item.nextDue=previous.nextDue;else delete item.nextDue;if(previous.hasLastDone)item.lastDone=previous.lastDone;else delete item.lastDone;delete item.laundryScheduleUndo;}item.done=false;delete item.completedAt;item.updatedAt=at}
 return true;
}
export function uniformProgress(state,now=Date.now()){
 const task=(state.settings||[]).find(item=>item.laundryUniform&&laundryDue(item,now));if(!task)return null;
 const steps=uniformCycleSteps(state,task),step=steps.find(item=>!item.done)||task;
 return {task,step,total:steps.length||1,index:steps.length?steps.indexOf(step):0};
}
export function uniformHomeProgress(state,now=Date.now()){
 const progress=uniformProgress(state,now);if(!progress)return null;
 const colours=uniformCycleSteps(state,progress.task).filter(step=>/\b(darks|whites)\b/i.test(step.text||''));
 return colours.length&&colours.every(step=>step.done)?null:progress;
}
export function addLaundryTask(state,text,taskId,at=new Date().toISOString()){
 text=String(text||'').trim();if(!text)return null;
 state.settings||=[];
 const task={id:'laundry-task-'+taskId,text,laundryTask:true,done:false,createdAt:at};
 if(state.settings.some(item=>item.id===task.id))return null;
 state.settings.push(task);return task;
}
export function completeLaundryTask(state,taskId,actor,at=new Date().toISOString()){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device');
 const task=(state.settings||[]).find(item=>item.id===taskId&&laundryDue(item)&&(item.laundryTask||item.parentId&&isLaundryItem(state.settings.find(parent=>parent.id===item.parentId)||item)));
 if(!person||!task||state.wins?.some(win=>win.id==='win-'+task.id))return null;
 const record=finishLaundryItem(state,task,person,at);settleScheduledLaundry(state);return record;
}
function finishLaundryItem(state,task,person,at){
 if(task.done)return null;
 const children=childrenOf(state.settings,task.id).filter(t=>!t.archived);
 for(const child of children)if(!child.done)finishLaundryItem(state,child,person,at);
 const parent=state.settings.find(item=>item.id===task.parentId);
 const record={...completionRecord({...task,area:'Laundry'},at,'task',person),points:children.length?0:1,aggregate:!!children.length,...(parent?{rootTaskId:parent.id,rootText:parent.text,rootRecurrence:parent.recurrence||null}:{})};
 state.wins||=[];if(!state.wins.some(win=>win.id===record.id))state.wins.unshift(record);
 task.done=true;task.completedAt=at;task.updatedAt=at;
 if(parent){const next=childrenOf(state.settings,parent.id).find(item=>!item.done&&!item.archived);if(next?.autoDoingNow)next.doingNow=true;}
 if(task.laundryUniform)handoffUniformLaundry(state,task,at);
 if(!task.parentId){task.laundryScheduleUndo={hasNextDue:Object.hasOwn(task,'nextDue'),nextDue:task.nextDue,hasLastDone:Object.hasOwn(task,'lastDone'),lastDone:task.lastDone};scheduleLaundry(state,task,at);}
 return record;
}
function scheduleLaundry(state,task,at){
 if(!task.recurrence)return;
 const next=scheduleNext(task,new Date(at));if(!next||state.settings.some(item=>item.id===next.id))return;
 Object.assign(next,{laundryImported:true,...(task.laundryUniform?{laundryUniform:true}:{laundryTask:true})});
 state.settings.push(next,...repeatChildren(state.settings,task,next));
}
export function settleScheduledLaundry(state){
 for(let pass=0;pass<(state.settings||[]).length;pass++){
  let changed=false;
  for(const parent of [...(state.settings||[])].reverse()){
   if((!parent.laundryImported&&!parent.parentId)||parent.done||parent.archived)continue;
   const children=childrenOf(state.settings,parent.id).filter(t=>!t.archived);if(!children.length||!children.every(child=>child.done))continue;
   const last=children.reduce((a,b)=>String(a.completedAt)>String(b.completedAt)?a:b),at=last.completedAt;if(!at)continue;
   const credited=state.wins?.find(win=>win.taskId===last.id),person={id:credited?.completedBy,name:credited?.completedByName};
   if(parent.laundryUniform)handoffUniformLaundry(state,parent,at);
   finishLaundryItem(state,parent,person,at);changed=true;
  }
  if(!changed)break;
 }
}
export function completeUniformStep(state,stepId,actor,at=new Date().toISOString()){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device');
 const progress=uniformProgress(state,Date.parse(at));if(!person||!progress||progress.step.id!==stepId)return null;
 const record=finishLaundryItem(state,progress.step,person,at);handoffUniformLaundry(state,progress.task,at);settleScheduledLaundry(state);return record;
}

export function laundryCompletionPhrase(text){
 const phrases={
  'put a load on':'Load is on!',
  'put washing on':'Load is on!',
  'put out washing':'Washing is out!',
  'put away clothes on rail':'Clothes put away!',
  'put in dryer':'In the dryer!',
  'empty dryer':'Dryer emptied!',
  'sort laundry to go in':'Laundry sorted!',
  'gather uniform':'Uniform gathered!',
  'wash darks':'Darks washed!',
  'put out darks':'Darks are out!',
  'wash whites':'Whites washed!',
  'put out whites':'Whites are out!',
  'remove dye from tops if possible':'Dye removal tried!',
  'clean inside washing machine to remove smell':'Machine cleaned!',
  'wipe down washing machine':'Machine wiped!',
  'wipe down dryer':'Dryer wiped!',
  'laundry':'Laundry finished!'
 };
 return phrases[String(text||'').trim().toLowerCase().replace(/[.!]+$/,'')]||'All done!';
}

// Two reusable load slots replace the separate rail/dryer entry points.
const loadKey=slot=>'laundry-load-'+slot;
export function laundryLoads(state){
 state.settings||=[];
 if(!state.settings.some(row=>row.id===loadKey(1))){
  const active=['rail','dryer'].map(route=>({route,progress:laundryProgress(state,route)})).filter(item=>item.progress.index>0);
  for(let slot=1;slot<=Math.max(1,active.length);slot++){
   const previous=active[slot-1],saved=state.settings.find(row=>row.id===progressKey(previous?.route));
   state.settings.push({id:loadKey(slot),completedSteps:previous?.progress.index||0,route:previous?.route||null,
    reminderStartedAt:saved?.reminderStartedAt||state.wins?.find(win=>win.laundry&&(win.laundryCycle||'rail')===previous?.route&&win.laundrySequence===previous?.progress.completed)?.at,
    reminderActorId:saved?.reminderActorId||state.wins?.find(win=>win.laundry&&(win.laundryCycle||'rail')===previous?.route&&win.laundrySequence===previous?.progress.completed)?.completedBy});
  }
 }
 return state.settings.filter(row=>/^laundry-load-\d+$/.test(row.id)).map(row=>Number(row.id.split('-').at(-1))).sort((a,b)=>a-b).map(slot=>laundryLoadProgress(state,slot));
}
export function laundryLoadProgress(state,slot){
 const saved=state.settings?.find(row=>row.id===loadKey(slot));if(!saved)return null;
 const latest=(state.wins||[]).filter(win=>win.laundryLoad===slot).sort((a,b)=>b.laundrySequence-a.laundrySequence)[0];
 const completed=Math.max(validCount(saved.completedSteps),validCount(latest?.laundrySequence)),steps=laundryLoadSteps(state);
 const currentId=latest&&latest.laundrySequence>validCount(saved.completedSteps)?latest.laundryNextStepId:saved.currentStepId;
 const found=steps.findIndex(step=>step.id===currentId),index=found>=0?found:completed%steps.length;
 const route=latest&&latest.laundrySequence>validCount(saved.completedSteps)?latest.laundryRoute:saved.route;
 const step=steps[index];return {...saved,slot,completed,index,route,step,total:steps.length,needsTransfer:step.kind==='route',doingNow:step.kind==='route'&&!state.settings?.some(row=>row.id==='laundry-load-cycle-definition')||!!saved.doingNow,text:step.kind==='finish'?(route==='dryer'?step.dryerText:step.text):step.text};
}
export function startSecondLaundryLoad(state,at=new Date().toISOString()){
 const loads=laundryLoads(state);if(loads.length!==1||loads[0].step.kind!=='finish')return false;
 state.settings.push({id:loadKey(2),completedSteps:0,route:null,updatedAt:at});return true;
}
export function completeLaundryLoadStep(state,slot,expectedCompleted,actor,at=new Date().toISOString(),route=null){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device'),progress=laundryLoadProgress(state,slot);
 if(!person||!progress||progress.completed!==expectedCompleted||progress.needsTransfer&&!['rail','dryer'].includes(route))return null;
 const sequence=progress.completed+1,taskId=`laundry-load-${slot}-${sequence}`;
 if(state.wins?.some(win=>win.id==='win-'+taskId))return null;
 const selected=progress.needsTransfer?route:progress.route,steps=laundryLoadSteps(state),nextIndex=(progress.index+1)%steps.length,nextStep=steps[nextIndex];
 const text=progress.needsTransfer?(selected==='dryer'?progress.step.dryerText:progress.step.text):progress.text;
 const room=state.rooms?.find(room=>!room.archived&&/laundry/i.test(room.name))||state.rooms?.find(room=>!room.archived&&/kitchen/i.test(room.name));
 const record={...completionRecord({id:taskId,text,roomId:room?.id,area:room?.name||'Laundry',seriesId:`laundry-load-step-${progress.index}`},at,'task',person),laundry:true,laundryLoad:slot,laundrySequence:sequence,laundryRoute:nextIndex===0?null:selected,laundryNextStepId:nextStep.id,points:1};
 state.wins||=[];state.wins.unshift(record);
 const saved=state.settings.find(row=>row.id===loadKey(slot));saved.completedSteps=sequence;saved.currentStepId=nextStep.id;saved.doingNow=!!nextStep.autoDoingNow;saved.route=record.laundryRoute;saved.updatedAt=at;
 if(progress.step.kind==='wash'){saved.reminderStartedAt=at;saved.reminderActorId=person.id}else if(progress.needsTransfer||nextIndex===0){delete saved.reminderStartedAt;delete saved.reminderActorId}
 return record;
}

export const defaultLaundryLoadSteps=[
 {id:'wash',kind:'wash',text:'Put a load on',autoDoingNow:false},
 {id:'transfer',kind:'route',text:'Put out washing',dryerText:'Put in dryer',autoDoingNow:true},
 {id:'put-away',kind:'finish',text:'Put away clothes on rail',dryerText:'Empty dryer',autoDoingNow:false}
];
export function laundryLoadSteps(state){return state.settings?.find(row=>row.id==='laundry-load-cycle-definition')?.steps||defaultLaundryLoadSteps;}
export function saveLaundryLoadSteps(state,steps,at=new Date().toISOString()){
 if(!Array.isArray(steps)||!steps.length||steps.some(step=>!step.id||!String(step.text||'').trim())||new Set(steps.map(s=>s.id)).size!==steps.length)throw Error('Every step needs a unique ID and a name.');
 if(steps.filter(step=>step.kind==='wash').length!==1||steps.filter(step=>step.kind==='route').length!==1||steps.filter(step=>step.kind==='finish').length!==1)throw Error('Keep one washing, one transfer and one finish step.');
 if(steps[0].kind!=='wash'||steps.at(-1).kind!=='finish'||steps.some(step=>['route','finish'].includes(step.kind)&&!String(step.dryerText||'').trim()))throw Error('Keep washing first, finishing last, and name both drying routes.');
 const loads=laundryLoads(state);
 for(const load of loads){const saved=state.settings.find(row=>row.id===load.id);saved.currentStepId=steps.some(step=>step.id===load.step.id)?load.step.id:steps[Math.min(load.index,steps.length-1)].id;saved.doingNow=load.completed>0&&!!steps.find(step=>step.id===saved.currentStepId)?.autoDoingNow;}
 let definition=state.settings.find(row=>row.id==='laundry-load-cycle-definition');if(!definition){definition={id:'laundry-load-cycle-definition'};state.settings.push(definition)}
 definition.steps=structuredClone(steps).map(step=>({...step,text:step.text.trim(),...(step.dryerText?{dryerText:step.dryerText.trim()}:{})}));definition.updatedAt=at;return definition;
}
export function laundryDoingSteps(state,now=Date.now()){
 return (state.settings||[]).filter(task=>task.parentId&&task.doingNow&&!task.done&&laundryDue(task,now)&&childrenOf(state.settings,task.parentId).find(step=>!step.done)?.id===task.id);
}
export function addLaundryCycleStep(state,collection,parentId,text,id,autoDoingNow=false){
 const items=state[collection],parent=items?.find(item=>item.id===parentId);text=String(text||'').trim();if(!parent||parent.done||!text||!['settings','templates'].includes(collection))return null;
 const parentKey=collection==='templates'?'parentTemplateId':'parentId',siblings=items.filter(item=>item[parentKey]===parentId),step={id,text,[parentKey]:parentId,roomId:parent.roomId,area:parent.area||'Laundry',order:Math.max(-1,...siblings.map(item=>item.order||0))+1,autoDoingNow:!!autoDoingNow,done:false,...(collection==='settings'?{laundryTask:true,laundryImported:true}:{}),...(parent.nextDue?{nextDue:parent.nextDue}:{}),created:new Date().toISOString()};
 items.push(step);return step;
}

// Retire only the requested uniform steps; keep records and completion history intact.
export function updateUniformCycles(state){
 for(const parent of state.settings||[]){
  if(!parent.laundryUniform)continue;
  for(const step of descendants(state.settings,parent.id))if(/remove dye|dye removal|put away/i.test(step.text||'')){step.archived=true;step.uniformRetiredStep=true;step.doingNow=false;}
 }
}
export function uniformCycleSteps(state,parent){return descendants(state.settings,parent.id).filter(step=>!step.archived&&!childrenOf(state.settings,step.id).some(child=>!child.archived));}
export const uniformHangingReminder=step=>/put out|hang.*dry|hang.*rail/i.test(step?.text||'')?'Remember to stretch out on the rail.':'';
export function handoffUniformLaundry(state,parent,at=new Date().toISOString()){
 const steps=uniformCycleSteps(state,parent),hanging=steps.filter(step=>/put out|hang.*dry|hang.*rail/i.test(step.text||''));
 if(!hanging.some(step=>uniformStepColour(state,step)==='darks'&&step.done)||!hanging.some(step=>uniformStepColour(state,step)==='whites'&&step.done))return false;
 const markerId='uniform-handoff-'+parent.id;if(state.settings.some(row=>row.id===markerId))return false;
 const loads=laundryLoads(state),available=loads.find(load=>load.step.kind==='finish'&&load.route==='rail')||loads.find(load=>load.index===0);
 const slot=available?.slot||Math.max(0,...loads.map(load=>load.slot))+1;
 let saved=state.settings.find(row=>row.id===loadKey(slot)),beforeLoad=saved?structuredClone(saved):null;
 if(!saved){saved={id:loadKey(slot),completedSteps:0};state.settings.push(saved);}
 const finish=laundryLoadSteps(state).find(step=>step.kind==='finish');
 Object.assign(saved,{currentStepId:finish.id,route:'rail',doingNow:!!finish.autoDoingNow,uniformSourceIds:[...new Set([...(saved.uniformSourceIds||[]),parent.id])],updatedAt:at});delete saved.reminderStartedAt;delete saved.reminderActorId;
 state.settings.push({id:markerId,uniformHandoff:true,uniformId:parent.id,slot,beforeLoad,afterLoad:structuredClone(saved),createdAt:at});return true;
}

export function uniformStepColour(state,step){const seen=new Set();let current=step;while(current&&!seen.has(current.id)){seen.add(current.id);if(/darks/i.test(current.text||''))return 'darks';if(/whites/i.test(current.text||''))return 'whites';current=state.settings.find(t=>t.id===current.parentId);}return '';}
