const textKey=text=>String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function userTaskMinutes(state,task){
 const valid=value=>Number.isFinite(value)&&value>0;
 if(valid(task?.estimatedMinutes))return task.estimatedMinutes;
 const templates=state.templates||[],key=textKey(task?.text);
 const source=templates.find(t=>t.id===task?.sourceTemplateId&&valid(t.estimatedMinutes))||templates.find(t=>textKey(t.text)===key&&t.roomId===task?.roomId&&valid(t.estimatedMinutes));
 return source?.estimatedMinutes||null;
}
export function automaticTaskMinutes(state,task){
 const saved=userTaskMinutes(state,task);if(saved)return saved;
 if(Number.isFinite(task?.presetMinutes)&&task.presetMinutes>0)return task.presetMinutes;
 const key=textKey(task?.text);
 if(/shower|bath\b|ceiling|deep clean/.test(key))return 20;
 if(/mirror|surfaces|bins?\b|light ?switch|hand towel|bath mat/.test(key))return 5;
 if(/toilet|sink|taps?|floor|hoover|vacuum|mop|dust|windows?|wash|laundry|put away/.test(key))return 10;
 return 10;
}
export function setTaskBaseMinutes(state,collection,id,minutes){
 if(!Number.isFinite(minutes)||minutes<1||minutes>1440)throw Error('Choose a base time from 1 to 1440 minutes.');
 const task=state[collection]?.find(t=>t.id===id);if(!task)return 0;
 const targets=new Set([task]);
 if(collection==='tasks'){const series=task.seriesId||task.recurringGroupId||task.id;for(const item of state.tasks||[])if(!item.done&&(item.seriesId||item.recurringGroupId||item.id)===series)targets.add(item);}
 if(collection==='templates')for(const item of state.tasks||[])if(!item.done&&item.sourceTemplateId===id)targets.add(item);
 if(task.sourceTemplateId){const template=state.templates?.find(t=>t.id===task.sourceTemplateId);if(template)targets.add(template);}
 for(const item of targets){item.estimatedMinutes=minutes;item.estimateSource='user';}
 return targets.size;
}
