import {localDateKey} from './calendar.js';
import {addDays,validDate,taskMinutes,adjustedTaskMinutes} from './calendar-planner.js';
import {freshTask,nextOccurrence} from './v2-state.js';
import {isLaundryItem} from './laundry.js';
export const roomCategories=[['general','General',true],['bathroom','Bathroom',true],['kitchen','Kitchen',true],['living','Living room',true],['adult','Adult bedroom',true],['child','Child bedroom',false],['guest','Guest bedroom',false],['hall','Hallway / stairs',true],['storage','Storage room',false],['tinkering','Tinkering room',false],['craft','Craft room',false],['office','Home office',false],['utility','Utility room',false],['custom','Custom room',false]];
const spec=(key,text,days=7,minutes=10,selected=true,subtasks=[],tools=[])=>({key,text,days,minutes,selected,subtasks,tools});
const windows=spec('windows','Clean windows',28,20,false,['Wipe down windowsill','Wash windows'],['Microfibre cloth','Glass cleaner']);
const floor=spec('floor','Clean floor',7,20,true,['Vacuum or sweep floor','Mop if needed'],['Vacuum cleaner','Mop']);
const dust=spec('dust','Dust surfaces',7,10,true,[],['Duster','Microfibre cloth']);
const tidy=spec('tidy','Put things away',7,10,true);
const shared=[windows,spec('skirting','Clean skirting boards',28,10,false,[],['Microfibre cloth'])];
const bedroom=[spec('bedding','Change bedding',14,15,true,[],['Laundry detergent']),spec('clothes','Put clothes away',7,10),dust,floor,spec('mirror','Clean mirror',28,5,false,[],['Glass cleaner']),...shared];
export function presetTasks(category){const lists={
 general:[spec('switches','Clean light switches throughout home',28,15,true,[],['Microfibre cloth']),spec('ceilings','Dust ceilings and high corners',84,20,true,[],['Duster']),spec('handles','Wipe door handles throughout home',7,10,false,[],['Microfibre cloth']),spec('bins','Empty household bins',7,10),spec('doors','Clean interior doors',84,20,false)],
 bathroom:[spec('toilet','Clean toilet',7,15,true,['Clean bowl','Wipe seat and outside'],['Toilet brush','Rubber gloves']),spec('sink','Clean sink and taps',7,10,true,[],['Microfibre cloth','All-purpose cleaner']),spec('bath','Clean bath or shower',7,20,true,[],['Scrubbing brush']),spec('mirror','Clean mirror',7,5,true,[],['Glass cleaner']),spec('towels','Change towels',7,5),floor,...shared,spec('showerhead','Descale showerhead',84,15,false),spec('grout','Clean grout',84,20,false),spec('bathmat','Wash bath mat',14,10,false),spec('fan','Clean extractor grille',84,10,false)],
 kitchen:[spec('worktops','Wipe worktops',7,10,true,[],['Microfibre cloth','All-purpose cleaner']),spec('sink','Clean sink',7,10),spec('hob','Clean hob',7,15),spec('bin','Empty and wipe bin',7,10),floor,spec('microwave','Clean microwave',28,10,false),spec('fridge','Clean fridge shelves',28,20,false),spec('oven','Clean oven',84,30,false),spec('kettle','Descale kettle',84,15,false),spec('dishwasher','Clean dishwasher filter',28,10,false),...shared],
 living:[tidy,dust,floor,spec('sofa','Clean sofa',28,15,false,['Vacuum cushions','Clean underneath cushions'],['Vacuum cleaner']),spec('plants','Water plants',7,10,false),spec('petfur','Remove pet fur',7,10,false),...shared],
 adult:bedroom,child:[...bedroom,spec('toys','Tidy toys',7,10),spec('softtoys','Wash soft toys',84,15,false),spec('school','Tidy school desk',7,10,false)],guest:[...bedroom.map(t=>({...t,days:28})),spec('refresh','Refresh guest supplies',28,10,false)],
 hall:[tidy,floor,spec('banister','Wipe banister',28,10,false),spec('mats','Wash doormats',28,10,false),...shared],storage:[tidy,dust,floor,spec('sort','Sort one storage shelf',28,15,false),...shared],
 tinkering:[spec('workbench','Clear workbench',7,10),spec('printer','Clean 3D printer workspace',28,15,false),spec('solder','Tidy soldering area',7,10,false),spec('cables','Sort tools and cables',28,15,false),dust,floor,...shared],
 craft:[spec('worktable','Clear craft table',7,10),spec('scraps','Sort offcuts and scraps',7,10),spec('sewing','Clean sewing machine lint',28,10,false),spec('supplies','Organise craft supplies',28,15,false),dust,floor,...shared],
 office:[spec('desk','Clear desk',7,10),spec('keyboard','Clean keyboard',28,10,false),spec('paperwork','Sort paperwork',28,15,false),dust,floor,...shared],
 utility:[tidy,floor,spec('machine','Clean washing machine drawer and seal',28,15,false),spec('filter','Clean dryer filter',7,5,false),...shared],custom:[tidy,dust,floor,...shared]};return structuredClone(lists[category]||lists.custom)}
export function roomCategory(room){if(room.category)return room.category;const name=room.name.toLowerCase();for(const [pattern,category] of [[/general|whole.house/,'general'],[/bath|toilet/,'bathroom'],[/kitchen/,'kitchen'],[/living|lounge/,'living'],[/child|penny/,'child'],[/guest/,'guest'],[/bed|master/,'adult'],[/craft/,'craft'],[/print|tinker|workshop/,'tinkering'],[/storage/,'storage'],[/office/,'office'],[/utility/,'utility'],[/hall|landing|entrance|stair/,'hall']])if(pattern.test(name))return category;return 'custom'}
export function recurrenceDays(r){return r?.kind==='weeks'?r.every*7:r?.kind==='days'?r.every:r?.kind==='weekdays'?Math.max(1,Math.round(7/r.days.length)):7}
export function roomTaskDraft(state,room){const existing=(state.tasks||[]).filter(t=>t.roomId===room.id&&!t.parentId&&!t.done&&!t.archived&&!t.pausedAt&&!isLaundryItem(t)&&!t.bucket?.includes('side'));
 const keys=new Set(existing.map(t=>t.text.toLocaleLowerCase().replace(/[^a-z0-9]/g,'')));const drafts=existing.map(t=>({key:'existing:'+t.id,id:t.id,text:t.text,days:recurrenceDays(t.recurrence),minutes:taskMinutes(state,t).base,manualTime:!!(t.estimatedMinutes>0||state.templates?.find(x=>x.id===t.sourceTemplateId)?.estimatedMinutes>0),selected:true,subtasks:[],tools:t.tools||[],before:JSON.stringify(t),originalDays:recurrenceDays(t.recurrence)}));
 for(const t of presetTasks(room.category)){if(keys.has(t.text.toLocaleLowerCase().replace(/[^a-z0-9]/g,'')))continue;const old=existing.find(x=>x.scheduleKey===room.id+':'+t.key);if(old)continue;drafts.push(t)}return drafts;
}
// Reserve repeating dates together, so the cap holds for an entire repeating cycle.
export function makeSchedulePreview(state,draft,today=localDateKey(new Date())){
 if(!validDate(draft.start||today))throw Error('Choose a valid start date.');const start=draft.start||today,max=Number(draft.dailyMax),multiplier=Number(draft.multiplier),rest=new Set(draft.restDays||[]);
 if(!Number.isFinite(max)||max<1||max>1440||![1,2,3].includes(multiplier))throw Error('Choose a daily limit from 1 to 1440 minutes and a time setting.');if(rest.size===7)throw Error('Keep at least one cleaning day.');
 const loads=Array(364).fill(0),changes=[],unplaced=[];const chosen=draft.rooms.filter(r=>r.selected),selectedIds=new Set(chosen.flatMap(r=>(r.tasks||[]).filter(t=>t.selected&&t.id).map(t=>t.id)));
 // Existing routines outside this setup retain their dates and reserve capacity.
 for(const t of state.tasks||[]){if(selectedIds.has(t.id)||t.done||t.archived||t.pausedAt||t.parentId||isLaundryItem(t)||t.bucket==='side')continue;const raw=t.nextDue||t.dueDate;if(!raw||!Number.isFinite(Date.parse(raw)))continue;let date=localDateKey(raw),count=0;while(date<=addDays(start,363)&&count++<20000){const offset=Math.round((Date.UTC(...date.split('-').map((x,i)=>i===1?+x-1:+x))-Date.UTC(...start.split('-').map((x,i)=>i===1?+x-1:+x)))/86400000);if(offset>=0)loads[offset]+=adjustedTaskMinutes(state,t,multiplier);if(!t.recurrence)break;const next=nextOccurrence(t.recurrence,new Date(date+'T12:00:00'));if(!next||localDateKey(next)<=date)break;date=localDateKey(next)}}
 for(const room of chosen)for(const task of (room.tasks||[]).filter(t=>t.selected)){
  if(!task.text.trim()||!Number.isInteger(Number(task.days))||task.days<1||task.days>3650)throw Error('Each selected task needs a name and an interval from 1 to 3650 days.');
  const current=task.id?state.tasks.find(t=>t.id===task.id):null,base=current?taskMinutes(state,current).base:task.minutes,minutes=current?adjustedTaskMinutes(state,current,multiplier):Math.ceil(base*(task.manualTime?1:multiplier));
  if(minutes>max){unplaced.push({room:room.name,text:task.text,reason:`${minutes} min exceeds your ${max} min daily limit. Increase the limit or split this task.`});continue}
  let interval=Number(task.days)*(draft.capacityFactor||1),placed=null;
  for(let attempt=0;attempt<52&&!placed;attempt++){
   for(let offset=0;offset<Math.min(interval,364);offset++){
    if(rest.has(new Date(addDays(start,offset)+'T12:00:00').getDay()))continue;
    const dates=[];for(let day=offset;day<364;day+=interval){if(rest.has(new Date(addDays(start,day)+'T12:00:00').getDay()))continue;dates.push(day)}
    if(dates.length&&dates.every(day=>loads[day]+minutes<=max)){placed={offset,dates};break}
   }
   if(!placed)interval=interval<7?7:Math.ceil(interval/7)*7+7;
  }
  if(!placed){unplaced.push({room:room.name,text:task.text,reason:'No capacity in the next year.'});continue}
  for(const day of placed.dates)loads[day]+=minutes;
  changes.push({roomId:room.id,roomName:room.name,category:room.category,roomExisting:room.existing,roomBefore:room.before,task,minutes,base,date:addDays(start,placed.offset),interval,restDays:[...rest],dates:placed.dates.map(d=>addDays(start,d))});
 }
 if(unplaced.some(t=>t.reason==='No capacity in the next year.')&&(draft.capacityFactor||1)<52)return makeSchedulePreview(state,{...draft,capacityFactor:(draft.capacityFactor||1)+1},today);
 return {changes,unplaced,settings:{...state.calendarSettings,dailyMax:max,multiplier,oneRoom:false,wholeHouse:true,restDays:[...rest],preserveUserTimes:true},start,loads};
}
export function applySchedulePreview(state,preview,newId=()=>crypto.randomUUID(),now=new Date()){
 // Check all touched records before mutating anything, including room/laundry edits.
 for(const change of preview.changes){if(change.task.id&&JSON.stringify(state.tasks.find(t=>t.id===change.task.id))!==change.task.before)throw Error('A selected task changed on another device. Preview again.');if(change.roomExisting&&JSON.stringify(state.rooms.find(r=>r.id===change.roomId))!==change.roomBefore)throw Error('A room changed on another device. Preview again.')}
 for(const change of preview.changes){let room=state.rooms.find(r=>r.id===change.roomId);if(!room){room={id:change.roomId,name:change.roomName,category:change.category,order:state.rooms.length,archived:false};state.rooms.push(room)}else{room.name=change.roomName;room.category=change.category}
  let task=state.tasks.find(t=>t.id===change.task.id);if(!task){if(state.tasks.some(t=>!t.done&&!t.archived&&t.scheduleKey===room.id+':'+change.task.key))throw Error('This task was already added. Preview again.');task=freshTask({text:change.task.text,roomId:room.id,area:room.name},newId(),now.toISOString(),state.tasks.length);task.scheduleKey=room.id+':'+change.task.key;task.presetMinutes=change.base;task.tools=change.task.tools;state.tasks.push(task);for(const text of change.task.subtasks||[]){const child=freshTask({text,roomId:room.id,area:room.name},newId(),now.toISOString(),state.tasks.length);child.parentId=task.id;state.tasks.push(child)}}
  task.text=change.task.text.trim();task.area=room.name;task.recurrence={kind:change.interval%7===0?'weeks':'days',every:change.interval%7===0?change.interval/7:change.interval,restDays:change.restDays,anchor:change.date};task.scheduleMaker=true;
  // Missed work remains due. Future planned repeats use the new weekday anchor.
  const oldDue=task.nextDue||task.dueDate;const overdue=oldDue&&localDateKey(oldDue)<localDateKey(now);
  if(!overdue){task.nextDue=new Date(change.date+'T00:00:00').toISOString();task.activeSince=task.nextDue;task.scheduled=Date.parse(task.nextDue)>+now}
  task.allowanceDays=null;task.bucket='now';task.updatedAt=now.toISOString();
 }
 state.calendarSettings=preview.settings;return preview.changes.length;
}
export function catchUpTasks(state,today=localDateKey(new Date())){const seen=new Set(),out=[];for(const task of state.tasks||[]){if(task.parentId||task.done||task.archived||task.pausedAt||!task.recurrence||isLaundryItem(task)||task.bucket==='side')continue;const raw=task.nextDue||task.activeSince||task.created;if(!Number.isFinite(Date.parse(raw)))continue;const due=localDateKey(raw),key=task.seriesId||(task.recurringGroupId?task.recurringGroupId+':'+task.roomId:task.scheduleKey||task.id);if(due>=today)continue;const days=Math.round((Date.UTC(...today.split('-').map((x,i)=>i===1?Number(x)-1:Number(x)))-Date.UTC(...due.split('-').map((x,i)=>i===1?Number(x)-1:Number(x))))/86400000);const found=out.find(x=>x.key===key);if(found&&found.due<=due)continue;if(found)out.splice(out.indexOf(found),1);seen.add(key);out.push({task,key,due,days,label:days<7?`${days} ${days===1?'day':'days'} overdue`:`${Math.floor(days/7)} ${days<14?'week':'weeks'}${days%7?` ${days%7}d`:''} overdue`})}return out.sort((a,b)=>a.due.localeCompare(b.due))}
