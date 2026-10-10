import {periodStart} from './periods.js';
import {uniqueWins,completionPeople,hasRecordedPerson,completionPoints,completionGroups} from './completion-history.js';
import {DAY,dueAt} from './v2-state.js?v=purple-subtasks-1';
import {taskDeadline} from './task-extras.js';
const time=value=>{const t=Date.parse(value);return Number.isFinite(t)?t:null};
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
export function completionRecord(task,at=new Date().toISOString(),kind='task',person=null){
 const due=kind==='side'?null:taskDeadline(task);
 return {id:'win-'+task.id,taskId:task.id,text:task.text,roomId:task.roomId,area:task.area||'General',at,kind,recurrence:task.recurrence||null,seriesId:task.seriesId||task.id,parentId:task.parentId||null,sourceTemplateId:task.sourceTemplateId||null,dueAt:due===null?null:new Date(due).toISOString(),overdueMs:due===null?null:Math.max(0,Date.parse(at)-due),...(person?.id?{completedBy:person.id,completedByName:person.name||person.email||'Household member'}:{})};
}
export function taskStats(state,{now=Date.now(),days=28,roomId='',personId=''}={}){
 const tasks=new Map(state.tasks.map(t=>[t.id,t]));
 const unique=uniqueWins(state);
 const prepared=unique.map(w=>{const task=tasks.get(w.taskId||w.id.replace(/^win-/,''));let overdue=w.overdueMs;
  if(!Number.isFinite(overdue)){
   let due=time(w.dueAt);
   // Old recurring records had nextDue advanced at completion; never use that as the completed deadline.
   if(due===null&&task?.allowanceDays)due=dueAt({...task,done:false,bucket:'now'});
   overdue=due!==null&&time(w.at)!==null?Math.max(0,time(w.at)-due):null;
  }
  return {...w,roomId:w.roomId||task?.roomId,overdueMs:overdue};
 }).filter(w=>!roomId||w.roomId===roomId);
 const scored=prepared.filter(completionPoints);
 const wins=scored.filter(w=>!personId||w.completedBy===personId);
 const archived=(state.completionArchive||[]).filter(row=>(!roomId||row.roomId===roomId)&&(!personId||row.completedBy===personId)),archiveCount=archived.reduce((sum,row)=>sum+(row.count||0),0),allTime=String(days)==='0';
 const dated=wins.filter(w=>time(w.at)!==null&&time(w.at)<=now);
 const start=periodStart(days,now,[...dated.map(w=>time(w.at)),...(allTime?archived.map(row=>time(row.month+'-01')):[])]);
 const weeks=Math.max(1,(now-start)/DAY)/7;
 const recent=dated.filter(w=>time(w.at)>=start);
 const groups=new Map();
 const mainGroups=completionGroups({...state,wins:prepared},{roomId,personId,start,end:now});
 for(const main of mainGroups){
  const key=JSON.stringify([main.roomId,main.text.trim().toLowerCase(),main.category]);
  if(!groups.has(key))groups.set(key,{text:main.text,roomId:main.roomId,area:main.area,category:main.category,count:0,recurring:false,lateness:[],dates:[],subtaskCount:0,lastAt:main.at});
  const group=groups.get(key),records=main.records.filter(win=>(win.taskId||win.id.replace(/^win-/,''))===main.id&&!win.parentId);
  group.subtaskCount+=main.children.filter(completionPoints).length;
  for(const record of records)if(time(record.at)>=start&&time(record.at)<=now){group.count++;group.dates.push(time(record.at));if(Number.isFinite(record.overdueMs))group.lateness.push(record.overdueMs)}
  group.recurring ||= !!main.recurrence;if(time(main.at)>time(group.lastAt))group.lastAt=main.at;
 }
 const rows=[...groups.values()].map(g=>{const dates=g.dates.sort((a,b)=>a-b),intervals=dates.slice(1).map((date,index)=>(date-dates[index])/DAY);return {...g,averageDaysBetween:mean(intervals),perWeek:g.count/weeks,averageOverdueDays:mean(g.lateness)===null?null:mean(g.lateness)/DAY,knownDeadlines:g.lateness.length}}).sort((a,b)=>b.count-a.count||a.text.localeCompare(b.text));
 const open=state.tasks.filter(t=>!t.done&&(!roomId||t.roomId===roomId)&&(!personId||t.assignedTo===personId));
 const overdue=open.map(t=>({task:t,due:taskDeadline(t)})).filter(x=>x.due!==null&&x.due<now).map(x=>({...x,days:(now-x.due)/DAY})).sort((a,b)=>b.days-a.days);
 const rooms=state.rooms.filter(r=>!roomId||r.id===roomId).map(r=>({id:r.id,name:r.name,total:wins.filter(w=>w.roomId===r.id).length+archived.filter(row=>row.roomId===r.id).reduce((sum,row)=>sum+(row.count||0),0),recent:recent.filter(w=>w.roomId===r.id).length+(allTime?archived.filter(row=>row.roomId===r.id).reduce((sum,row)=>sum+(row.count||0),0):0)}));
 const people=completionPeople(state).map(person=>{
  const personWins=scored.filter(w=>w.completedBy===person.id),personDated=personWins.filter(w=>time(w.at)!==null&&time(w.at)<=now),personRecent=personDated.filter(w=>time(w.at)>=start),assigned=state.tasks.filter(t=>!t.done&&t.assignedTo===person.id&&(!roomId||t.roomId===roomId)),late=assigned.filter(t=>{const due=taskDeadline(t);return due!==null&&due<now});
  const old=archived.filter(row=>row.completedBy===person.id).reduce((sum,row)=>sum+(row.count||0),0);return {id:person.id,name:person.name,total:personWins.length+old,recent:personRecent.length+(allTime?old:0),assigned:assigned.length,overdue:late.length};
 }).filter(person=>!personId||person.id===personId).sort((a,b)=>b.recent-a.recent||b.total-a.total||a.name.localeCompare(b.name));
 const span=Math.max(1,Math.ceil((now-start)/DAY)),bucketDays=span>100?30:span>31?7:1,timeline=[];
 const first=new Date(start);first.setHours(0,0,0,0);
 for(let cursor=+first;cursor<=now;){const next=new Date(cursor);next.setDate(next.getDate()+bucketDays);timeline.push({label:new Date(cursor).toLocaleDateString([],{day:'numeric',month:'short'}),count:recent.filter(w=>time(w.at)>=cursor&&time(w.at)<+next).length});cursor=+next;}
 const unattributed=wins.filter(w=>!hasRecordedPerson(w));
 return {timeline,unattributed:unattributed.length+archived.filter(row=>!row.completedBy).reduce((sum,row)=>sum+(row.count||0),0),unattributedRecent:recent.filter(w=>!hasRecordedPerson(w)).length,total:wins.length+archiveCount,periodCount:recent.length+(allTime?archiveCount:0),weeks,perWeek:(recent.length+(allTime?archiveCount:0))/weeks,rows,rooms,openCount:open.length,overdue,people,averageOpenOverdueDays:mean(overdue.map(x=>x.days)),unknownDates:wins.length-dated.length};
}
