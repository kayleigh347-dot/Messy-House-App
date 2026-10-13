import {localCivilTime,civilDaysBetween,addCivilDays} from './flow-dates.js';
export function learningIdentity(task){return task?.sourceTemplateId||task?.seriesId||task?.flowSourceKey||(task?.recurrence?task.id:null)||null;}
export function eligibleForLearning(task,settings={}){
 if(!learningIdentity(task)||settings.frequency?.kind==='as-needed'||settings.include===false||task.parentId||task.clearWay||task.clearWaySourceTaskId||task.flowEventId)return false;
 const category=settings.category||task.type;
 return ['cleaning','maintenance','pet'].includes(category)||category==='organisation'&&settings.include===true;
}
export function learnedInterval(events,identity,timeZone){
 const known=new Map();
 for(const event of events||[]){if(event.taskKey!==identity||!Number.isFinite(Date.parse(event.completedAt)))continue;const key=event.completionId||event.id;const old=known.get(key);if(!old||String(event.updatedAt||event.completedAt)>=String(old.updatedAt||old.completedAt))known.set(key,event);}
 const dates=[...known.values()].filter(event=>!event.deletedAt).map(event=>localCivilTime(event.completedAt,timeZone).date).sort();if(dates.length<3)return null;
 const gaps=dates.slice(1).map((date,index)=>civilDaysBetween(dates[index],date));return {count:dates.length,gaps,days:gaps.reduce((sum,n)=>sum+n,0)/gaps.length,lastCompletedOn:dates.at(-1)};
}
export function learnedDue(events,task,settings,timeZone,rounding){
 if(!eligibleForLearning(task,settings)||settings.frequency||task.recurrence)return null;
 const interval=learnedInterval(events,learningIdentity(task),timeZone);if(!interval||interval.days<=0)return null;
 if(!['ceil','round','floor'].includes(rounding))throw Error('Choose how to round learned intervals.');
 return {...interval,dueOn:addCivilDays(interval.lastCompletedOn,Math.max(1,Math[rounding](interval.days)))};
}
