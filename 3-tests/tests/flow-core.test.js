import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveFlowDay,addCivilDays,civilDaysBetween,annualDate} from '../flow-dates.js';
import {learnedInterval,learnedDue,eligibleForLearning} from '../flow-learning.js';
import {projectFlowEvents} from '../flow-events.js';
import {activeTask,doingNowTasks} from '../task-flow.js';
import {buildFlowSnapshot,liveFlowEntries,recommendationScore,configurableFlowSources,flowSources} from '../flow-recommendations.js';
test('03:00 follows local calendar time at UK DST boundaries and catches up after closed days',()=>{
 for(const [instant,date] of [['2026-03-29T01:59:00Z','2026-03-28'],['2026-03-29T02:00:00Z','2026-03-29'],['2026-10-25T02:59:00Z','2026-10-24'],['2026-10-25T03:00:00Z','2026-10-25'],['2026-11-01T04:00:00Z','2026-11-01']])assert.equal(effectiveFlowDay(instant,'Europe/London'),date);
 assert.equal(addCivilDays('2028-02-28',1),'2028-02-29');assert.equal(civilDaysBetween('2026-03-28','2026-03-30'),2);
});
test('learning uses all genuine completion gaps after three, retains same-day distinct events and excludes unavailable history',()=>{
 const events=['2026-01-01','2026-01-08','2026-01-17','2026-01-24'].map((date,i)=>({id:String(i),completionId:String(i),taskKey:'saved',completedAt:date+'T12:00:00Z'}));
 assert.equal(learnedInterval(events.slice(0,2),'saved','Europe/London'),null);assert.equal(learnedInterval(events.slice(0,3),'saved','Europe/London').days,8);assert.equal(learnedInterval(events,'saved','Europe/London').days,23/3);assert.equal(learnedInterval([...events,events[0]],'saved','Europe/London').count,4);
 assert.equal(learnedInterval([...events,{id:'extra',taskKey:'saved',completedAt:events.at(-1).completedAt}],'saved','Europe/London').count,5);
 assert.equal(learnedInterval(events.map(event=>event.id==='2'?{...event,deletedAt:'2026-01-25'}:event),'saved','Europe/London').count,3);
});
test('as needed, crafts and organisation without opt-in never learn due dates; explicit frequency wins',()=>{
 const task={sourceTemplateId:'saved',type:'cleaning'},events=['2026-01-01','2026-01-08','2026-01-17'].map((date,i)=>({id:String(i),taskKey:'saved',completedAt:date+'T12:00:00Z'}));
 assert.equal(learnedDue(events,task,{},'Europe/London','ceil').dueOn,'2026-01-25');assert.equal(learnedDue(events,task,{frequency:{kind:'as-needed'}},'Europe/London','ceil'),null);assert.equal(learnedDue(events,{...task,recurrence:{kind:'weeks',every:1}},{},'Europe/London','ceil'),null);
 assert.equal(eligibleForLearning({...task,type:'craft'}),false);assert.equal(eligibleForLearning({...task,type:'organisation'}),false);assert.equal(eligibleForLearning({...task,type:'organisation'},{include:true}),true);
});
test('event units, annual identities and target dates remain anchored without board task creation',()=>{
 const events=[{id:'christmas',name:'Christmas',date:'2026-12-25',annual:true,steps:[{id:'gifts',text:'Gifts',lead:4,unit:'weeks',kind:'target'}]}],before=structuredClone(events);const entries=projectFlowEvents(events,{start:'2026-12-01',end:'2027-12-31'});assert.equal(entries[0].targetOn,'2026-11-27');assert.equal(entries[0].displayOn,'2026-11-27');assert.notEqual(entries[0].id,entries[1].id);assert.deepEqual(events,before);assert.throws(()=>annualDate('2028-02-29',2029));assert.equal(annualDate('2028-02-29',2029,'mar-01'),'2029-03-01');
});
const policy={timeZone:'Europe/London',base:[60,45,30,15,5],dailyCount:2,dailyMinutes:20,rounding:'ceil'};
test('recommendations are isolated, one carried item per source, and soft limits never hide remaining choices',()=>{
 const board={rooms:[{id:'r'}],tasks:Array.from({length:5},(_,i)=>({id:'task'+i,seriesId:'series'+i,text:'Task '+i,roomId:'r',type:'cleaning',recurrence:{kind:'weeks',every:1},nextDue:'2026-10-01T12:00:00Z',estimatedMinutes:10,order:5-i})),templates:[],side:[],wins:[],rewards:[]};
 const house={taskSettings:Object.fromEntries(board.tasks.map(task=>[task.seriesId,{priority:1,include:true}]))},before=structuredClone(board),snapshot=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-13',policy});assert.deepEqual(board,before);assert.equal(snapshot.entries.length,5);assert.equal(snapshot.entries.filter(entry=>entry.primary).length,2);assert.ok(snapshot.entries.every(entry=>entry.displayOn==='2026-10-13'&&entry.originalRecommendedOn==='2026-10-01'));assert.equal(new Set(snapshot.entries.map(entry=>entry.id)).size,5);
 const next=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-14',policy});assert.deepEqual(next.entries.map(entry=>entry.id),snapshot.entries.map(entry=>entry.id));board.tasks[0].done=true;const status=liveFlowEntries(snapshot,board,house);assert.equal(status.find(entry=>entry.taskId==='task0').done,true);assert.deepEqual(status.map(entry=>entry.id),snapshot.entries.map(entry=>entry.id));assert.equal(liveFlowEntries(snapshot,board,{...house,suppressedIds:['series1']}).some(entry=>entry.sourceKey==='series1'),false);assert.equal(board.tasks[1].nextDue,before.tasks[1].nextDue);
});
test('saved room choices can recommend without board tasks or fake creation-date due anchors',()=>{
 const board={rooms:[{id:'r'}],tasks:[],templates:[],side:[]},configuration={setups:[{id:'setup',roomId:'r',draft:{tasks:[{id:'floor',text:'Clean floor',selected:true,frequency:{kind:'weeks',every:1}}]}}]},key='setup:setup:floor',house={taskSettings:{[key]:{priority:2,include:true,firstDate:'2026-10-13'}}};const snapshot=buildFlowSnapshot(board,configuration,house,{day:'2026-10-13',policy});assert.equal(snapshot.entries.length,1);assert.equal(snapshot.entries[0].taskId,null);assert.equal(board.tasks.length,0);assert.equal(buildFlowSnapshot(board,configuration,{}, {day:'2026-10-13',policy}).entries.length,0);
});
test('specified score examples use relative frequency without modifying ordinary priority',()=>{
 assert.equal(recommendationScore(1,14,7,policy),105);assert.ok(Math.abs(recommendationScore(2,10,7,policy)-72.857142857)<.0001);assert.equal(recommendationScore(5,90,30,policy),75);
});
test('deep-clean pairing changes only recommendation coverage and completion advances the routine projection',()=>{
 const board={rooms:[{id:'r'}],tasks:[{id:'routine',seriesId:'routine',text:'Routine',roomId:'r',type:'cleaning',recurrence:{kind:'days',every:7},nextDue:'2026-10-01',estimatedMinutes:10},{id:'deep',seriesId:'deep',text:'Deep clean',roomId:'r',type:'cleaning',recurrence:{kind:'days',every:28},nextDue:'2026-10-01',estimatedMinutes:20}],side:[],templates:[]},house={taskSettings:{routine:{include:true,priority:1},deep:{include:true,priority:1,covers:['routine']}}},before=structuredClone(board);
 const snapshot=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-13',policy});assert.deepEqual(snapshot.entries.map(entry=>entry.sourceKey),['deep']);assert.deepEqual(board,before);const hidden=buildFlowSnapshot(board,{setups:[]},{...house,suppressedIds:['deep']},{day:'2026-10-13',policy});assert.equal(hidden.entries.length,0);
 const completed={...house,learningEvents:[{id:'deep-done',taskKey:'deep',completedAt:'2026-10-13T12:00:00Z'}]};const next=buildFlowSnapshot(board,{setups:[]},completed,{day:'2026-10-14',policy});assert.equal(next.entries.find(entry=>entry.sourceKey==='routine').originalRecommendedOn,'2026-10-20');assert.deepEqual(board,before);
});
test('after three completions learning replaces only the initial projection anchor, and expiry is an explicit event choice',()=>{
 const board={rooms:[{id:'r'}],tasks:[],side:[],templates:[{id:'saved',text:'Saved clean',type:'cleaning',roomId:'r'}]},events=['2026-01-01','2026-01-08','2026-01-17'].map((date,i)=>({id:String(i),taskKey:'saved',completedAt:date+'T12:00:00Z'})),house={taskSettings:{saved:{include:true,category:'cleaning',priority:2,firstDate:'2026-01-01'}},learningEvents:events};assert.equal(buildFlowSnapshot(board,{setups:[]},house,{day:'2026-01-18',policy}).entries[0].originalRecommendedOn,'2026-01-25');
 const event={id:'event',name:'Event',date:'2026-01-01',steps:[{id:'step',text:'Prepare',lead:1,unit:'days',kind:'flexible'}]};assert.equal(projectFlowEvents([event],{start:'2026-01-03',end:'2026-01-10'}).length,1);assert.equal(projectFlowEvents([{...event,afterEvent:'hide'}],{start:'2026-01-03',end:'2026-01-10'}).length,0);
});
test('unconfigured saved tasks are reachable in settings without becoming recommendations or board tasks',()=>{
 const board={rooms:[{id:'room-a'}],tasks:[],side:[],templates:[{id:'saved',text:'Saved clean',type:'cleaning'},{id:'child',parentTemplateId:'saved',text:'Saved step'}]},before=structuredClone(board);
 assert.deepEqual(configurableFlowSources(board,{setups:[]},{}).map(source=>source.sourceKey),['saved']);assert.deepEqual(flowSources(board,{setups:[]},{}),[]);
 const house={taskSettings:{saved:{include:true,category:'cleaning',priority:2,roomId:'room-a',firstDate:'2026-10-13',frequency:{kind:'days',every:7}}}};const snapshot=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-13',policy});assert.equal(snapshot.entries[0].roomId,'room-a');assert.deepEqual(board,before);
});
test('explicit urgent preference has precedence only in the personal projection',()=>{
 const board={rooms:[{id:'r'}],tasks:[{id:'routine',text:'Routine',roomId:'r',type:'cleaning',recurrence:{kind:'weeks',every:1},nextDue:'2026-09-01',priority:'high',order:0},{id:'urgent',text:'Urgent choice',roomId:'r',type:'cleaning',recurrence:{kind:'weeks',every:1},nextDue:'2026-10-13',priority:'mid',order:1}],side:[],templates:[]},before=structuredClone(board),house={taskSettings:{routine:{include:true,priority:1},urgent:{include:true,priority:5,urgent:true}}};const snapshot=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-13',policy});assert.equal(snapshot.entries[0].sourceKey,'urgent');assert.deepEqual(board,before);
});
test('deliberately selected future work can be active without changing due dates; later schedule edits revoke the early selection',()=>{
 const task={id:'future',nextDue:'2099-01-01T12:00:00Z',doingNow:true};assert.equal(activeTask(task),false);assert.equal(doingNowTasks([task]).length,0);task.flowSelectedDue=task.nextDue+'|';assert.equal(activeTask(task),true);assert.equal(doingNowTasks([task]).length,1);assert.equal(task.nextDue,'2099-01-01T12:00:00Z');task.dueDate='2099-01-02T12:00:00Z';assert.equal(activeTask(task),false);task.flowSelectedDue=task.nextDue+'|'+task.dueDate;task.pausedAt='2026-10-13';assert.equal(activeTask(task),false);
});
