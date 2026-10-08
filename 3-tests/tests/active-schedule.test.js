import test from 'node:test';
import assert from 'node:assert/strict';
import {activeTask,doingNowTasks} from '../task-flow.js';
import {normalize,scheduleNext,activateDue} from '../v2-state.js';
const now=new Date('2026-10-02T12:00:00+01:00');
test('future occurrences stay out of active and Doing Now lists until due',()=>{
 const future={id:'future',doingNow:true,recurrence:{kind:'days',every:3},nextDue:'2026-10-03T00:00:00+01:00',scheduled:true,bucket:'now'};
 assert.equal(activeTask(future,now),false);assert.deepEqual(doingNowTasks([future],[],now),[]);
 const due=Date.parse(future.nextDue);assert.equal(activeTask(future,due),true);assert.equal(activateDue({tasks:[future]},due),true);assert.equal(future.scheduled,false);
 assert.equal(activeTask({...future,pausedAt:now.toISOString()},due),false);
});
test('scheduled repeat keeps tomorrow date and repeats three days after completion without an allowance',()=>{
 const backup={tasks:[{id:'sample-repeat',text:'Example task',recurrence:{kind:'days',every:3},nextDue:'2026-10-03T00:00:00+01:00',scheduled:true,allowanceDays:null}]};
 const state=normalize(backup),task=state.tasks.find(t=>t.id==='sample-repeat'&&!t.done);
 assert.equal(state.tasks.length,backup.tasks.length);assert.equal(task.nextDue,'2026-10-03T00:00:00+01:00');assert.equal(task.allowanceDays,null);assert.equal(activeTask(task,now),false);
 const completed=new Date('2026-10-03T15:30:00+01:00'),next=scheduleNext(task,completed),expected=new Date(completed);expected.setHours(0,0,0,0);expected.setDate(expected.getDate()+3);
 assert.equal(next.nextDue,expected.toISOString());assert.equal(next.allowanceDays,null);assert.equal(activeTask(next,completed),false);assert.deepEqual(next.recurrence,{kind:'days',every:3});
});

test('legacy unscheduled Later tasks become active while scheduled occurrences stay deferred',()=>{
 const state=normalize({tasks:[
  {id:'legacy',text:'Old task',bucket:'later',roomId:'r'},
  {id:'scheduled',text:'Future repeat',bucket:'later',roomId:'r',scheduled:true,recurrence:{kind:'days',every:1},nextDue:'2026-10-03T00:00:00+01:00'}
 ]});
 assert.ok(state.tasks.every(task=>task.bucket==='now'));
 assert.equal(activeTask(state.tasks[0],now),true);
 assert.equal(activeTask(state.tasks[1],now),false);
});
