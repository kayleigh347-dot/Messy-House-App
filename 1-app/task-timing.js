import {laundryLoadSteps,saveLaundryLoadSteps} from './laundry.js?v=tools-20261012-v1';
export function timingChoices(state){
 const choices=[],seen=new Set();
 for(const collection of ['templates','tasks','settings'])for(const task of state[collection]||[]){
  if(task.done||task.archived||collection==='tasks'&&!task.recurrence||collection==='settings'&&!task.laundryTask&&!task.laundryUniform)continue;
  const key=collection==='tasks'?(task.seriesId||task.recurringGroupId||task.id):task.id;if(seen.has(collection+':'+key))continue;seen.add(collection+':'+key);
  choices.push({collection,id:task.id,text:task.text,area:task.area||'Laundry',estimatedMinutes:task.estimatedMinutes});
 }for(const step of laundryLoadSteps(state))choices.push({collection:'laundrySteps',id:step.id,text:step.text,area:'Laundry load cycle',estimatedMinutes:step.estimatedMinutes});return choices.sort((a,b)=>a.text.localeCompare(b.text));
}
export function recordTaskTiming(state,collection,taskId,milliseconds,id,at=new Date().toISOString()){
 const task=(collection==='laundrySteps'?laundryLoadSteps(state):state[collection])?.find(item=>item.id===taskId);if(!task||!Number.isFinite(milliseconds)||milliseconds<1000||milliseconds>86400000)return null;
 const record={id:'task-timing-'+id,taskTiming:true,collection,taskId,text:task.text,roomId:task.roomId,sourceTemplateId:task.sourceTemplateId||null,seriesId:task.seriesId||task.recurringGroupId||task.id,milliseconds,at};state.settings||=[];if(state.settings.some(item=>item.id===record.id))return null;state.settings.push(record);return record;
}
export function useTimingEstimate(state,recordId){
 const record=state.settings?.find(item=>item.id===recordId&&item.taskTiming);if(!record)return 0;
 const minutes=Math.max(1,Math.ceil(record.milliseconds/60000));if(record.collection==='laundrySteps'){const steps=structuredClone(laundryLoadSteps(state)),step=steps.find(item=>item.id===record.taskId);if(!step)return 0;step.estimatedMinutes=minutes;saveLaundryLoadSteps(state,steps);return 1}const items=state[record.collection]||[];
 const targets=items.filter(task=>record.collection==='tasks'?(task.id===record.taskId||(task.seriesId||task.recurringGroupId||task.id)===record.seriesId):task.id===record.taskId);
 if(record.sourceTemplateId){const template=state.templates?.find(task=>task.id===record.sourceTemplateId);if(template)targets.push(template)}
 if(record.collection==='templates')for(const task of state.tasks||[])if(!task.done&&task.sourceTemplateId===record.taskId)targets.push(task);
 for(const task of targets)task.estimatedMinutes=minutes;return targets.length;
}
