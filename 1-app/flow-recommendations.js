import {addCivilDays,civilDaysBetween,validCivilDate,localCivilTime} from './flow-dates.js';
import {learnedDue,learningIdentity} from './flow-learning.js';
import {projectFlowEvents} from './flow-events.js';
import {isLaundryItem} from './laundry.js';
import {automaticTaskMinutes} from './task-estimates.js';
export const defaultFlowPolicy={base:[60,45,30,15,5],dailyCount:5,dailyMinutes:60,rounding:'ceil'};
export const flowTaskKey=task=>task.flowSourceKey||learningIdentity(task)||task.id;
export function validateFlowPolicy(policy){
 if(!policy||!Array.isArray(policy.base)||policy.base.length!==5||policy.base.some(n=>!Number.isFinite(n)||n<0)||!Number.isInteger(policy.dailyCount)||policy.dailyCount<1||!Number.isFinite(policy.dailyMinutes)||policy.dailyMinutes<=0||!['ceil','floor','round'].includes(policy.rounding)||!policy.timeZone)throw Error('Save your recommendation settings first.');
 localCivilTime(Date.now(),policy.timeZone);return structuredClone(policy);
}
export function recommendationScore(priority,elapsed,interval,policy){
 const base=policy.base[priority-1];if(!Number.isFinite(base)||!Number.isFinite(interval)||interval<=0)return null;
 const ratio=Math.max(0,elapsed)/interval,clamp=(value,max)=>Math.max(0,Math.min(max,value));return base+clamp((ratio-.5)*30,60)+clamp((ratio-2)*10,35);
}
function intervalDays(frequency){return frequency?.kind==='days'?frequency.every:frequency?.kind==='weeks'?frequency.every*7:null;}
function knownDate(value,timeZone){return validCivilDate(value)?value:Number.isFinite(Date.parse(value))?localCivilTime(value,timeZone).date:null;}
export function flowSources(state,roomConfiguration={setups:[]},house={}){
 const result=new Map(),sideIds=new Set((state.side||[]).map(task=>task.id));
 for(const task of state.tasks||[]){if(task.parentId||task.archived||task.pausedAt||task.done||task.bucket==='side'||sideIds.has(task.id)||isLaundryItem(task)||task.clearWay||task.clearWaySourceTaskId||task.flowEventId)continue;const key=flowTaskKey(task),previous=result.get(key);if(!previous||(task.nextDue||'')<(previous.nextDue||''))result.set(key,{...task,sourceKey:key,taskId:task.id});}
 for(const setup of roomConfiguration.setups||[]){if(setup.deletedAt)continue;for(const choice of setup.draft?.tasks||[]){if(!choice.selected)continue;const actual=choice.taskId&&(state.tasks||[]).find(task=>task.id===choice.taskId),key=actual?flowTaskKey(actual):'setup:'+setup.id+':'+choice.id;if(actual||result.has(key))continue;result.set(key,{...choice,sourceKey:key,roomId:setup.roomId,text:choice.text,category:'cleaning',definition:{setupId:setup.id,entryId:choice.id}});}}
 for(const template of state.templates||[]){if(template.parentTemplateId||template.archived||!house.taskSettings?.[template.id]?.include||result.has(template.id))continue;result.set(template.id,{...template,sourceKey:template.id,taskId:null,definition:{templateId:template.id}});}
 return [...result.values()];
}
export function configurableFlowSources(state,roomConfiguration,house){
 const sources=new Map(flowSources(state,roomConfiguration,house).map(source=>[source.sourceKey,source]));
 for(const template of state.templates||[]){if(template.parentTemplateId||template.archived||sources.has(template.id))continue;sources.set(template.id,{...template,sourceKey:template.id,taskId:null,definition:{templateId:template.id}});}
 return [...sources.values()];
}
export function buildFlowSnapshot(state,roomConfiguration,house,{day,policy,end=addCivilDays(day,90)}={}){
 validateFlowPolicy(policy);if(!validCivilDate(day)||!validCivilDate(end))throw Error('Invalid snapshot date.');
 const entries=[],events=house.learningEvents||[],suppressed=new Set(house.suppressedIds||[]),sources=flowSources(state,roomConfiguration,house);
 const lastDate=source=>[knownDate(source.lastDone,policy.timeZone),...events.filter(event=>event.taskKey===source.sourceKey&&!event.deletedAt).map(event=>knownDate(event.completedAt,policy.timeZone)),...(state.tasks||[]).filter(task=>task.done&&flowTaskKey(task)===source.sourceKey).map(task=>knownDate(task.completedAt,policy.timeZone))].filter(Boolean).sort().at(-1);
 for(const source of sources){
  const settings=house.taskSettings?.[source.sourceKey]||{},category=settings.category||source.category||source.type;
  if(settings.include===false||['hobby','hobbies','craft','crafts'].includes(category)||category==='organisation'&&settings.include!==true)continue;
  const frequency=settings.frequency||source.frequency||source.recurrence;if(frequency?.kind==='as-needed')continue;
  const covering=sources.filter(deep=>(house.taskSettings?.[deep.sourceKey]?.covers||[]).includes(source.sourceKey));
  const interval=intervalDays(frequency),last=[lastDate(source),...covering.map(lastDate)].filter(Boolean).sort().at(-1),learned=learnedDue(events,{...source,sourceTemplateId:source.definition?source.sourceKey:source.sourceTemplateId},{...settings,category},policy.timeZone,policy.rounding);
  let original=last&&interval?addCivilDays(last,interval):knownDate(source.nextDue,policy.timeZone)||learned?.dueOn||settings.firstDate;
  if(!validCivilDate(original)||original>end)continue;
  const priority=settings.priority;if(!Number.isInteger(priority)||priority<1||priority>5)continue;
  const period=interval||learned?.days,elapsed=last?civilDaysBetween(last,day):period?period+civilDaysBetween(original,day):0;
  const score=recommendationScore(priority,elapsed,period,policy)??policy.base[priority-1];
  const minutes=automaticTaskMinutes(state,source);entries.push({id:source.sourceKey+'@'+original,sourceKey:source.sourceKey,taskId:source.taskId||null,definition:source.definition||null,roomId:source.definition?.templateId?settings.roomId||source.roomId:source.roomId,title:source.text,originalRecommendedOn:original,displayOn:original<day?day:original,targetOn:null,score,urgent:!!settings.urgent,minutes:Number.isFinite(minutes)&&minutes>0?minutes:null,reason:last?`Last completed ${Math.max(0,civilDaysBetween(last,day))} days ago${period?'; about every '+Math.ceil(period)+' days':''}`:learned?'Based on '+learned.count+' recorded completions':period?'Recommended about every '+Math.ceil(period)+' days':'Suggested for '+original});
 }
 const covered=new Set();for(const deep of entries.filter(entry=>entry.originalRecommendedOn<=day))for(const key of house.taskSettings?.[deep.sourceKey]?.covers||[])covered.add(key);
 for(let index=entries.length-1;index>=0;index--)if(covered.has(entries[index].sourceKey))entries.splice(index,1);
 for(const entry of projectFlowEvents(house.events||[],{start:day,end})){if(suppressed.has(entry.id)||house.eventCompletions?.[entry.id])continue;entries.push({...entry,sourceKey:entry.id,taskId:null,score:0,minutes:null,reason:entry.targetOn?'Target '+entry.targetOn:'Preparation for '+entry.eventName});}
 entries.sort((a,b)=>Number(!!b.urgent)-Number(!!a.urgent)||b.score-a.score||a.originalRecommendedOn.localeCompare(b.originalRecommendedOn)||String(a.roomId||'').localeCompare(String(b.roomId||''))||a.id.localeCompare(b.id));
 const daily=new Map();for(const entry of entries){const load=daily.get(entry.displayOn)||{count:0,minutes:0};entry.primary=load.count<policy.dailyCount&&(entry.minutes===null||load.minutes+entry.minutes<=policy.dailyMinutes);if(entry.primary){load.count++;load.minutes+=entry.minutes||0;}daily.set(entry.displayOn,load);}
 return {version:1,day,timeZone:policy.timeZone,entries:entries.filter(entry=>!suppressed.has(entry.sourceKey))};
}
export function liveFlowEntries(snapshot,state,house){
 const suppressed=new Set(house.suppressedIds||[]);
 return (snapshot?.entries||[]).filter(entry=>!suppressed.has(entry.sourceKey)).map(entry=>{
  const task=entry.taskId?state.tasks.find(task=>task.id===entry.taskId):state.tasks.find(task=>task.flowSourceKey===entry.sourceKey&&task.flowOccurrenceId===entry.id);
  const done=!!task?.done||!!house.eventCompletions?.[entry.id];return {...entry,done,roomId:task?.roomId||entry.roomId,taskId:task?.id||entry.taskId,unavailable:!!entry.taskId&&(!task||task.archived||task.pausedAt)};
 });
}
