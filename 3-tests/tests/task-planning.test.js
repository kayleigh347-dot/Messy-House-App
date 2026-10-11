import test from 'node:test';import assert from 'node:assert/strict';
import {smallTasks,subtaskCandidates,addExistingSubtasks,snoozeTask,createNamedParent} from '../task-planning.js';
import {freshTask,scheduleNext,normalize} from '../v2-state.js';
import {activeTask} from '../task-flow.js';
import {taskDeadline} from '../task-extras.js';
const now=+new Date('2026-10-11T12:00:00Z'),make=(id,extra={})=>({id,text:id,roomId:'r',area:'Room',done:false,...extra});
test('small task suggestions respect time, effort, schedule, assignment and root status',()=>{
 const tasks=[make('quick',{estimatedMinutes:5,effort:'low'}),make('effort',{effort:'low'}),make('long',{estimatedMinutes:30}),make('high',{estimatedMinutes:5,effort:'high'}),make('future',{estimatedMinutes:5,dueDate:'2026-10-20'}),make('done',{done:true,estimatedMinutes:5}),make('child',{parentId:'quick',estimatedMinutes:5}),make('other',{assignedTo:'other',estimatedMinutes:5}),make('on',{doingNow:true,estimatedMinutes:5}),make('paused',{pausedAt:'2026-10-01',estimatedMinutes:5})];
 assert.deepEqual(smallTasks({tasks},{actorId:'me',now}).map(t=>t.id),['quick','effort']);assert(smallTasks({tasks},{effort:'',actorId:'me',now}).some(t=>t.id==='high'));
});
test('bulk nesting preserves IDs and descendants, moves room and blocks invalid selections atomically',()=>{
 const items=[make('parent'),make('a',{roomId:'other',doingNow:true}),make('child',{parentId:'a',notes:'Keep'}),make('b'),make('done',{done:true})];const original=structuredClone(items);
 assert.equal(addExistingSubtasks(items,'parent',['a','done']),false);assert.deepEqual(items,original);assert.equal(addExistingSubtasks(items,'parent',['a','b']),true);assert.equal(items[1].parentId,'parent');assert.equal(items[2].parentId,'a');assert.equal(items[2].notes,'Keep');assert.equal(items[1].roomId,'r');assert.equal(items[1].doingNow,false);assert.equal(subtaskCandidates(items,'child').some(t=>t.id==='parent'),false);assert.equal(addExistingSubtasks(items,'a',['parent']),false);
});
test('snooze shifts an occurrence and unfinished children without changing recurrence, completion or points',()=>{
 const recurrence={kind:'fixed-weekday',day:1},items=[make('parent',{recurrence,nextDue:'2026-10-11T00:00:00Z'}),make('child',{parentId:'parent'}),make('done',{parentId:'parent',done:true,completedAt:'2026-10-10'})];
 assert(snoozeTask(items,'parent','2026-10-13',now));assert.deepEqual(items[0].recurrence,recurrence);assert.equal(items[0].done,false);assert.equal(activeTask(items[0],now),false);assert.equal(items[1].nextDue,items[0].nextDue);assert.equal(items[2].completedAt,'2026-10-10');assert.throws(()=>snoozeTask(items,'parent','2026-10-11',now));assert.throws(()=>snoozeTask(items,'parent','2026-02-30',now));assert.equal(snoozeTask(items,'child','2026-10-13',now),false);
});
test('one-off snooze becomes active and gains an overdue deadline after the chosen day',()=>{
 const items=[make('one')];snoozeTask(items,'one','2026-10-12',now);assert.equal(activeTask(items[0],now),false);assert.equal(activeTask(items[0],now+2*86400000),true);assert.equal(taskDeadline(items[0]),Date.parse(items[0].dueDate));
});
test('estimates survive template and recurring copies',()=>{
 const task=make('a',{estimatedMinutes:5,effort:'low',recurrence:{kind:'weeks',every:1}});assert.equal(freshTask(task,'b').estimatedMinutes,5);const next=scheduleNext(task,new Date(now));assert.equal(next.effort,'low');assert.equal(next.estimatedMinutes,5);
});

test('first-subtask named parent contains both original records and retains target schedule',()=>{
 const items=[make('onto',{recurrence:{kind:'weeks',every:1},nextDue:'2026-10-15',doingNow:true,notes:'Original notes'}),make('dragged',{notes:'Keep too'})];
 const before=structuredClone(items);assert.equal(createNamedParent(items,'dragged','onto',' ','new'),false);assert.deepEqual(items,before);
 const parent=createNamedParent(items,'dragged','onto','Laundry jobs','new');assert.equal(parent.text,'Laundry jobs');assert.equal(parent.messImpact,'none');assert.equal(parent.doingNow,true);assert.deepEqual(parent.recurrence,before[0].recurrence);assert.equal(parent.nextDue,'2026-10-15');assert.deepEqual(items.slice(0,2).map(t=>t.parentId),['new','new']);assert.equal(items[0].notes,'Original notes');assert.equal(items[1].notes,'Keep too');assert.equal(items[0].doingNow,false);assert.equal(createNamedParent(items,'dragged','new','Again','new2'),false);assert.equal(items.length,3);
});
