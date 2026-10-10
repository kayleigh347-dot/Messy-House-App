import {completionRecord} from './task-stats.js';

export const laundrySteps=['Put a load on','Put out washing','Put away clothes on rail'];
export const dryerSteps=['Put washing on','Put in dryer','Empty dryer'];
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
 return record;
}

export const laundryTasks=state=>(state.settings||[]).filter(item=>item.laundryTask&&!item.done);
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
 const record={...completionRecord({...task,area:'Laundry'},at,'task',person),points:1};
 state.wins||=[];state.wins.unshift(record);task.done=true;task.updatedAt=at;return record;
}
