import test from 'node:test';
import assert from 'node:assert/strict';
import {recurringTiming,taskOrderGroups} from '../task-ui.js';
import {calendarRoomEntries} from '../house-calendar.js';
test('visible task groups preserve order and leave stored priorities unchanged',()=>{
 const tasks=[{id:'normal',order:0},{id:'important',priority:'high',order:1},{id:'late',recurrence:{kind:'days',every:7},nextDue:'2020-01-01',order:2},{id:'next',order:3}];
 assert.deepEqual(taskOrderGroups(tasks).map(group=>[group.id,group.tasks.map(task=>task.id)]),[['high',['important','late']],['mid',['normal','next']]]);assert.equal(tasks[2].priority,undefined);
});
test('whole-calendar room filters keep only the chosen room or household events',()=>{
 const entries=[{id:'a',roomId:'kitchen',date:'2026-10-08'},{id:'b',roomId:'bedroom',date:'2026-10-09'},{id:'c',type:'appointment',date:'2026-10-08'}];
 assert.equal(calendarRoomEntries(entries).length,3);assert.deepEqual(calendarRoomEntries(entries,'kitchen').map(entry=>entry.id),['a']);assert.deepEqual(calendarRoomEntries(entries,'household').map(entry=>entry.id),['c']);assert.equal(entries.length,3);
});
test('room and management lists use the same recurring status and small day counter',()=>{
 const now=new Date('2026-10-08T12:00:00');
 assert.deepEqual(['2026-10-06','2026-10-08','2026-10-12'].map(day=>recurringTiming({nextDue:day+'T12:00:00'},now).status),['needs','ready','later']);
 assert.equal(recurringTiming({nextDue:'2026-10-12T12:00:00'},now).label,'4d');
 assert.equal(recurringTiming({nextDue:'2026-10-06T12:00:00',pausedAt:'2026-10-07'},now).status,'later');
 assert.equal(recurringTiming({nextDue:'2026-10-06T12:00:00',pausedAt:'2026-10-07'},now).label,'Paused');
});
