import test from 'node:test';
import assert from 'node:assert/strict';
import {completionRecord,taskStats} from '../task-stats.js';
import {taskDeadline} from '../task-extras.js';
import {DAY,normalize} from '../v2-state.js';
const now=Date.parse('2026-09-22T12:00:00Z');
const at=days=>new Date(now-days*DAY).toISOString();
const state=wins=>normalize({tasks:[],wins,side:[]});
test('frequency uses selected period and counts duplicate win IDs once',()=>{
 const wins=[0,7,14,30].map((d,i)=>({id:'w'+i,text:'Clean toilet',roomId:'room-bathroom',at:at(d),recurrence:{kind:'weeks',every:1}}));
 const data=taskStats(state([...wins,wins[0]]),{now,days:21});
 assert.equal(data.total,4);assert.equal(data.periodCount,3);assert.equal(data.rows[0].perWeek,1);assert.equal(data.rows[0].recurring,true);
 assert.equal(data.rows[0].averageOverdueDays,null);
});
test('completion records deadline before done/schedule mutation and averages include on-time zero',()=>{
 const task={id:'t',text:'Toilet',roomId:'room-bathroom',recurrence:{kind:'weeks',every:1},nextDue:at(2),bucket:'now'};
 const win=completionRecord(task,at(0));task.done=true;task.nextDue=at(-7);
 assert.equal(win.overdueMs,2*DAY);assert.equal(win.dueAt,at(2));
 const data=taskStats(state([win,{...win,id:'win-t2',overdueMs:0}]),{now});assert.equal(data.rows[0].averageOverdueDays,1);assert.equal(data.rows[0].knownDeadlines,2);
});
test('older recurring wins do not use the next scheduled date as a historical deadline',()=>{
 const st=state([{id:'win-old',text:'Clean',at:at(0),recurrence:{kind:'weeks',every:1}}]);
 st.tasks.push({id:'old',text:'Clean',done:true,nextDue:at(-7),recurrence:{kind:'weeks',every:1}});
 assert.equal(taskStats(st,{now}).rows[0].averageOverdueDays,null);
});
test('historical allowance deadlines can be recovered; room filtering remains separate',()=>{
 const st=state([{id:'win-old',text:'Clean',at:at(0),roomId:'room-master'},{id:'win-other',text:'Clean',at:at(0),roomId:'room-bathroom'}]);
 st.tasks.push({id:'old',text:'Clean',done:true,created:at(5),allowanceDays:2});
 const data=taskStats(st,{now,roomId:'room-master'});assert.equal(data.total,1);assert.equal(data.rows[0].averageOverdueDays,3);
});
test('open overdue averages ignore scheduled, completed and undated tasks',()=>{
 const st=state([]);st.tasks=[{id:'a',text:'A',created:at(5),allowanceDays:1},{id:'b',text:'B',created:at(3),allowanceDays:1},{id:'c',text:'C',bucket:'now',scheduled:true,created:at(9),allowanceDays:1},{id:'d',text:'D',done:true,created:at(9),allowanceDays:1},{id:'e',text:'E'}];
 const data=taskStats(st,{now});assert.equal(data.overdue.length,2);assert.equal(data.averageOpenOverdueDays,3);assert.equal(taskDeadline(st.tasks[2]),null);
});
test('empty, malformed-date and all-time data never invent frequencies',()=>{
 const empty=taskStats(state([]),{now,days:0});assert.equal(empty.total,0);assert.equal(empty.perWeek,0);
 const data=taskStats(state([{id:'bad',text:'Old',at:'unknown'}]),{now});assert.equal(data.total,1);assert.equal(data.periodCount,0);assert.equal(data.unknownDates,1);
});
test('person data separates the assignee from the person who completed the job',()=>{
 const st=state([
  {id:'one',text:'Bins',at:at(0),completedBy:'alex',completedByName:'Alex'},
  {id:'two',text:'Kitchen',at:at(0),completedBy:'kayleigh',completedByName:'Kayleigh'}
 ]);
 st.householdPeople=[{id:'alex',name:'Alex'},{id:'kayleigh',name:'Kayleigh'}];
 st.tasks=[{id:'open',text:'Bathroom',assignedTo:'alex',created:at(5),allowanceDays:1,bucket:'now'}];
 const alex=taskStats(st,{now,personId:'alex'});
 assert.equal(alex.total,1);assert.equal(alex.openCount,1);assert.equal(alex.overdue.length,1);
 assert.deepEqual(alex.people.map(person=>[person.name,person.total,person.assigned]),[['Alex',1,1]]);
});
