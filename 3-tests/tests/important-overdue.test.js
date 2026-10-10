import test from 'node:test';
import assert from 'node:assert/strict';
import {overdueTaskGroups} from '../task-extras.js';
import {scheduleNext} from '../v2-state.js';

test('important recurring tasks move to a separate group once overdue',()=>{
 const now=Date.parse('2026-10-10T12:00:00Z');
 const tasks=[
  {id:'water',text:'Water plants',order:2,recurrence:{kind:'days',every:7},nextDue:'2026-10-09T12:00:00Z',importantWhenOverdue:true},
  {id:'litter',text:'Clean litter trays',order:1,recurrence:{kind:'days',every:2},nextDue:'2026-10-08T12:00:00Z',importantWhenOverdue:true},
  {id:'ordinary',text:'Dust',order:0,recurrence:{kind:'weeks',every:1},nextDue:'2026-10-09T12:00:00Z'},
  {id:'future',text:'Uniforms',order:3,recurrence:{kind:'weeks',every:1},nextDue:'2026-10-11T12:00:00Z',importantWhenOverdue:true},
  {id:'paused',text:'Paused task',order:4,recurrence:{kind:'days',every:1},nextDue:'2026-10-08T12:00:00Z',pausedAt:'2026-10-08T12:00:00Z',importantWhenOverdue:true},
  {id:'done',text:'Done task',order:5,recurrence:{kind:'days',every:1},nextDue:'2026-10-08T12:00:00Z',done:true,importantWhenOverdue:true},
  {id:'child',text:'Subtask',order:6,parentId:'ordinary',recurrence:{kind:'days',every:1},nextDue:'2026-10-08T12:00:00Z',importantWhenOverdue:true}
 ];
 const groups=overdueTaskGroups(tasks,now);
 assert.deepEqual(groups.important.map(task=>task.id),['litter','water']);
 assert.deepEqual(groups.other.map(task=>task.id),['ordinary']);
});

test('important-when-overdue follows a recurring task into its next occurrence',()=>{
 const next=scheduleNext({id:'uniforms',text:'Wash school uniforms',roomId:'laundry',recurrence:{kind:'days',every:7},importantWhenOverdue:true},new Date('2026-10-10T12:00:00Z'));
 assert.equal(next.importantWhenOverdue,true);
 assert.equal(new Date(next.nextDue).getDay(),6);
});
