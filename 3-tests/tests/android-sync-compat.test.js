import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,nextOccurrence,validRecurrence,recurrenceLabel,scheduleNext,activateDue} from '../v2-state.js';
import {localDateKey} from '../calendar.js';
import {buildCalendarPlan} from '../calendar-planner.js';

test('calendar-month repeats clamp short months and recover original day including leap years',()=>{
 const r={kind:'months',every:1,anchor:'2028-01-31'};
 assert.equal(validRecurrence(r),true);assert.equal(validRecurrence({...r,every:0}),false);
 const feb=nextOccurrence(r,new Date('2028-01-31T12:00:00'));
 assert.equal(localDateKey(feb),'2028-02-29');
 assert.equal(localDateKey(nextOccurrence(r,new Date('2028-02-29T12:00:00'))),'2028-03-31');
 assert.equal(localDateKey(nextOccurrence({...r,every:12},new Date('2028-01-31T12:00:00'))),'2029-01-31');
 assert.equal(recurrenceLabel({recurrence:r}),'Every 1 month');
});
test('month skips and calendar projection retain calendar cadence',()=>{
 const recurrence={kind:'months',every:1,anchor:'2026-01-31',skipDates:['2026-02-28']};
 assert.equal(localDateKey(nextOccurrence(recurrence,new Date('2026-01-31T12:00:00'))),'2026-03-31');
 const s={tasks:[{id:'m',text:'Monthly',roomId:'k',nextDue:'2026-01-31T00:00:00Z',recurrence}],rooms:[{id:'k',name:'Kitchen'}],side:[],wins:[],appointments:[],errands:[],calendarPlans:[],calendarSessions:[]};
 const entries=buildCalendarPlan(s,{today:'2026-01-31',end:'2026-04-30',recurringOnly:true}).entries;
 assert.ok(entries.some(e=>e.dueDate==='2026-03-31'));assert.ok(!entries.some(e=>e.dueDate==='2026-02-28'));
});
test('web-created next occurrence preserves native schedule policy and shared task metadata',()=>{
 const task={id:'a',text:'Monthly',roomId:'k',recurrence:{kind:'months',every:1,anchor:'2026-01-31'},scheduleMaker:true,androidScheduleSpec:'{"budget":30}',androidTask:{priority:4,wasParent:true}};
 const next=scheduleNext(task,new Date('2026-01-31T12:00:00'));
 assert.equal(next.scheduleMaker,true);assert.equal(next.androidScheduleSpec,task.androidScheduleSpec);
 assert.deepEqual(next.androidTask,task.androidTask);assert.notEqual(next.id,task.id);
 next.androidTask.priority=1;assert.equal(task.androidTask.priority,4);
});
test('timed pauses resume on their date; indefinite pauses and other tasks stay untouched',()=>{
 const st={tasks:[{id:'timed',pausedAt:'2026-01-01',androidTask:{pauseUntil:'2026-01-05'},scheduled:true,nextDue:'2026-01-01'}, {id:'indefinite',pausedAt:'2026-01-01',androidTask:{pauseUntil:''}}],side:[{id:'side',pausedAt:'2026-01-01',androidTask:{pauseUntil:'2026-01-06'}}]};
 activateDue(st,+new Date('2026-01-05T12:00:00'));
 assert.equal(st.tasks[0].pausedAt,undefined);assert.equal(st.tasks[0].scheduled,false);
 assert.equal(st.tasks[1].pausedAt,'2026-01-01');assert.equal(st.side[0].pausedAt,'2026-01-01');
});
test('updated web client advertises compatibility without removing unknown capability or board fields',()=>{
 const state=normalize({tasks:[],side:[],wins:[],rooms:[],sharedSyncCapabilities:{future:'keep'},unrelated:{keep:true}});
 assert.equal(state.sharedSyncCapabilities.calendarMonths,1);assert.equal(state.sharedSyncCapabilities.future,'keep');assert.deepEqual(state.unrelated,{keep:true});
});
