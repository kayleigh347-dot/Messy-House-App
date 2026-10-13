import {freshTask} from './v2-state.js';
import {addToDoingNow,activeTask} from './task-flow.js';
import {validatePreparationRoutine} from './room-configuration.js';
export function standardPreparationRoutine(roomId){
 return {id:'clear-way-standard:'+roomId,roomId,name:'Clear the Way',steps:[
  {id:'other-rooms',label:'Collect items belonging to other rooms',instructions:'Put them in a box beside the door. Do not leave the room.',pickup:true,important:false,optional:false,followUpText:'Sort items for other rooms'},
  {id:'important',label:'Protect important items',instructions:'Keep keys, important papers, medication, valuables and fragile items in a known safe place.',pickup:true,important:true,optional:false,followUpText:'Sort important items'},
  {id:'rubbish',label:'Collect obvious rubbish',instructions:'Use a bin bag. Do not carefully sort ambiguous items.',pickup:false,important:false,optional:false,followUpText:null},
  {id:'floor',label:'Clear loose floor clutter',instructions:'Use a box or bag. Do not sort it yet.',pickup:true,important:false,optional:false,followUpText:'Sort collected floor items'}
 ]};
}
const originKey=(routine,step,area)=>[routine.id,step.id,area?.key||'whole-room'].map(encodeURIComponent).join(':');
export function previewPreparationTasks(state,routine,selections){
 validatePreparationRoutine(routine);
 const room=state.rooms.find(item=>item.id===routine.roomId&&!item.archived);if(!room)throw Error('Choose an active room.');
 if(!Array.isArray(selections)||!selections.length)throw Error('Choose at least one step.');
 const keys=new Set(),taskIds=new Set(),entries=[];
 for(const selection of selections){
  const step=routine.steps.find(item=>item.id===selection.stepId);if(!step)throw Error('A selected step changed. Review the routine.');
  const area=selection.area||null;if(area&&(typeof area.key!=='string'||!area.key||typeof area.name!=='string'||!area.name.trim()))throw Error('Choose a valid area.');
  const key=originKey(routine,step,area);if(keys.has(key))throw Error('Choose each step and area once.');keys.add(key);
  const active=state.tasks.find(task=>!task.done&&!task.archived&&task.roomId===room.id&&task.clearWay?.originKey===key),chosen=selection.reuseTaskId?state.tasks.find(task=>task.id===selection.reuseTaskId&&!task.done&&!task.archived&&task.roomId===room.id&&!task.parentId):null;
  if(selection.reuseTaskId&&!chosen)throw Error('The selected existing task is no longer available.');
  const existing=active||chosen;
  if(existing&&!activeTask(existing))throw Error('An existing preparation task is paused or scheduled for later. Edit it in the ordinary task controls before adding it to Doing Now.');
  const prefix='clear-way:'+key+':',priorIds=[...state.tasks.map(task=>task.id),...(state.wins||[]).map(win=>win.taskId)].filter(id=>typeof id==='string'&&id.startsWith(prefix)),prior=priorIds.map(id=>Number(id.slice(prefix.length))).filter(Number.isSafeInteger),last=(state.preparationInstances||[]).find(item=>item.id==='clear-way-instance:'+key),generation=existing?.clearWay?.generation??Math.max(last?.generation??-1,...prior)+1;
  const taskId=existing?.id||'clear-way:'+key+':'+generation,label=step.label+(area?' — '+area.name:'');
  if(taskIds.has(taskId))throw Error('Each selected area needs its own pickup task. Do not reuse one task for multiple areas.');taskIds.add(taskId);
  entries.push({key,step:structuredClone(step),area:area?structuredClone(area):null,taskId,label,generation,existing:!!existing,before:existing?JSON.stringify(existing):null});
 }
 return {roomId:room.id,roomName:room.name,roomBefore:JSON.stringify(room),routineId:routine.id,entries};
}
export function applyPreparationTasks(state,preview,now=new Date()){
 const room=state.rooms.find(item=>item.id===preview.roomId&&!item.archived);if(!room||JSON.stringify(room)!==preview.roomBefore)throw Error('The room changed. Review the routine again.');
 const added=[],reused=[];
 for(const entry of preview.entries){
  const old=state.tasks.find(task=>task.id===entry.taskId);
  const latest=(state.preparationInstances||[]).find(item=>item.id==='clear-way-instance:'+entry.key);if(!old&&latest&&latest.generation>=entry.generation)throw Error('The preparation changed. Review it again.');
  if(entry.existing){if(!old||JSON.stringify(old)!==entry.before)throw Error('An existing task changed. Review the routine again.');reused.push(old);continue;}
  if(old){if(old.done||old.archived||old.roomId!==room.id||old.clearWay?.originKey!==entry.key)throw Error('A preparation task changed. Review the routine again.');reused.push(old);continue;}
  const task=freshTask({text:entry.label,notes:entry.step.instructions||'',roomId:room.id,area:room.name},entry.taskId,now.toISOString());
  task.clearWay=preparationMetadata(preview,entry);added.push(task);
 }
 const start=Math.max(-1,...state.tasks.map(task=>task.order??0))+1;added.forEach((task,index)=>task.order=start+index);state.tasks.push(...added);
 state.preparationInstances||=[];for(const entry of preview.entries){const id='clear-way-instance:'+entry.key,latest=state.preparationInstances.find(item=>item.id===id);if(!latest)state.preparationInstances.push({id,roomId:room.id,generation:entry.generation,taskId:entry.taskId});else if(entry.generation>latest.generation)Object.assign(latest,{generation:entry.generation,taskId:entry.taskId});}
 // New/reused steps enter Doing Now through its existing append operation.
 for(const entry of preview.entries){const task=state.tasks.find(task=>task.id===entry.taskId);if(!task.clearWay)task.clearWay=preparationMetadata(preview,entry);addToDoingNow(task,state.tasks);}
 return {added,reused};
}
function preparationMetadata(preview,entry){return {originKey:entry.key,routineId:preview.routineId,stepId:entry.step.id,generation:entry.generation,pickup:entry.step.pickup,followUpText:entry.step.followUpText,important:entry.step.important,areaName:entry.area?.name||null}}
export function createPreparationFollowUp(state,source,at=new Date().toISOString()){
 if(!source?.done||!source.clearWay?.pickup||!source.clearWay.followUpText)return null;
 const id='clear-way-follow-up:'+source.id,old=state.tasks.find(task=>task.id===id);if(old)return null;
 if(source.clearWayGeneratedFollowUp||(state.wins||[]).some(win=>win.taskId===id))return null;
 const room=state.rooms.find(item=>item.id===source.roomId);if(!room)return null;
 const text=source.clearWay.followUpText+(source.clearWay.areaName?' — '+source.clearWay.areaName:'');
 const task=freshTask({text,roomId:room.id,area:room.name,priority:source.clearWay.important?'high':'mid'},id,at,Math.max(-1,...state.tasks.map(task=>task.order??0))+1);
 task.clearWaySourceTaskId=source.id;const signature=JSON.stringify(task);task.clearWayInitialSignature=signature;state.tasks.push(task);source.clearWayGeneratedFollowUp={id,signature};return task;
}
export function removeUntouchedPreparationFollowUp(state,source){
 const marker=source?.clearWayGeneratedFollowUp;if(!marker||source.done)return false;
 const task=state.tasks.find(item=>item.id===marker.id);
 if(!task||task.done||state.current===task.id||task.doingNow)return false;
 const snapshot=structuredClone(task);delete snapshot.clearWayInitialSignature;if(JSON.stringify(snapshot)!==(task.clearWayInitialSignature||marker.signature))return false;
 state.tasks=state.tasks.filter(item=>item.id!==task.id);delete source.clearWayGeneratedFollowUp;return true;
}
