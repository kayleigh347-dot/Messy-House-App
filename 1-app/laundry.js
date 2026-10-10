import {scheduleNext} from './v2-state.js?v=laundry-uniform-20261010-v2';
import {repeatChildren,childrenOf} from './subtasks.js';
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

export const laundryDue=(task,now=Date.now())=>!task.done&&!task.pausedAt&&(!task.nextDue||Date.parse(task.nextDue)<=now);
export const laundryTasks=(state,now=Date.now())=>(state.settings||[]).filter(item=>item.laundryTask&&laundryDue(item,now));
export function uniformProgress(state,now=Date.now()){
 const task=(state.settings||[]).find(item=>item.laundryUniform&&laundryDue(item,now));if(!task)return null;
 const steps=childrenOf(state.settings,task.id).sort((a,b)=>(a.order||0)-(b.order||0)),step=steps.find(item=>!item.done)||task;
 return {task,step,total:steps.length||1,index:steps.length?steps.indexOf(step):0};
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
 const task=laundryTasks(state).find(item=>item.id===taskId);
 if(!person||!task||state.wins?.some(win=>win.id==='win-'+task.id))return null;
 return finishLaundryItem(state,task,person,at);
}
function finishLaundryItem(state,task,person,at){
 if(task.done)return null;
 const children=childrenOf(state.settings,task.id);
 for(const child of children)if(!child.done)finishLaundryItem(state,child,person,at);
 const parent=state.settings.find(item=>item.id===task.parentId);
 const record={...completionRecord({...task,area:'Laundry'},at,'task',person),points:children.length?0:1,aggregate:!!children.length,...(parent?{rootTaskId:parent.id,rootText:parent.text,rootRecurrence:parent.recurrence||null}:{})};
 state.wins||=[];if(!state.wins.some(win=>win.id===record.id))state.wins.unshift(record);
 task.done=true;task.completedAt=at;task.updatedAt=at;
 if(!task.parentId)scheduleLaundry(state,task,at);
 return record;
}
function scheduleLaundry(state,task,at){
 if(!task.recurrence)return;
 const next=scheduleNext(task,new Date(at));if(!next||state.settings.some(item=>item.id===next.id))return;
 Object.assign(next,{laundryImported:true,...(task.laundryUniform?{laundryUniform:true}:{laundryTask:true})});
 state.settings.push(next,...repeatChildren(state.settings,task,next));
}
export function settleScheduledLaundry(state){
 for(const parent of [...(state.settings||[])]){
  if(!parent.laundryImported||parent.parentId||parent.done)continue;
  const children=childrenOf(state.settings,parent.id);if(!children.length||!children.every(child=>child.done))continue;
  const last=children.reduce((a,b)=>String(a.completedAt)>String(b.completedAt)?a:b),at=last.completedAt;
  if(!at)continue;
  const credited=state.wins?.find(win=>win.taskId===last.id),person={id:credited?.completedBy,name:credited?.completedByName};
  finishLaundryItem(state,parent,person,at);
 }
}
export function completeUniformStep(state,stepId,actor,at=new Date().toISOString()){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device');
 const progress=uniformProgress(state,Date.parse(at));if(!person||!progress||progress.step.id!==stepId)return null;
 const record=finishLaundryItem(state,progress.step,person,at);settleScheduledLaundry(state);return record;
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
