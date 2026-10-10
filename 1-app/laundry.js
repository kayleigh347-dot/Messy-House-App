import {completionRecord} from './task-stats.js';

export const laundrySteps=['Put a load on','Put out washing','Put away clothes on rail'];
const progressId='laundry-progress';
const validCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
export function laundryProgress(state){
 const saved=validCount(state.settings?.find(item=>item.id===progressId)?.completedSteps);
 const completed=(state.wins||[]).reduce((count,win)=>win.laundry?Math.max(count,validCount(win.laundrySequence)):count,saved);
 const index=completed%laundrySteps.length;
 return {completed,index,text:laundrySteps[index],cycle:Math.floor(completed/laundrySteps.length)+1};
}
// Each household occurrence has one stable completion ID, including across a sync merge.
export function completeLaundryStep(state,expectedCompleted,actor,at=new Date().toISOString()){
 const person=state.householdPeople?.find(item=>item.id===actor?.id&&item.id!=='local-device');
 const progress=laundryProgress(state);
 if(!person||progress.completed!==expectedCompleted)return null;
 const sequence=progress.completed+1,taskId='laundry-'+sequence;
 if(state.wins?.some(win=>win.id==='win-'+taskId))return null;
 const room=state.rooms?.find(room=>!room.archived&&/laundry/i.test(room.name))||state.rooms?.find(room=>!room.archived&&/kitchen/i.test(room.name));
 const task={id:taskId,text:progress.text,roomId:room?.id,area:room?.name||'Laundry',seriesId:'laundry-step-'+progress.index};
 const record={...completionRecord(task,at,'task',person),laundry:true,laundrySequence:sequence,points:1};
 state.wins||=[];state.settings||=[];state.wins.unshift(record);
 let saved=state.settings.find(item=>item.id===progressId);
 if(!saved){saved={id:progressId};state.settings.push(saved)}
 saved.completedSteps=sequence;saved.updatedAt=at;
 return record;
}
