import test from 'node:test';
import assert from 'node:assert/strict';
import {recurringRoomCalendarState,upcomingCalendarEntries} from '../house-calendar.js';
import {buildCalendarPlan} from '../calendar-planner.js';
const due='2026-10-12T12:00:00Z';
test('room calendar keeps recurring families and excludes dated one-offs, completed one-offs, sidequests and other rooms without mutating the board',()=>{
 const state={rooms:[{id:'r',name:'Room'}],side:[{id:'side-copy'}],wins:[],tasks:[
  {id:'repeat',roomId:'r',text:'Routine',recurrence:{kind:'weeks',every:1},nextDue:due},
  {id:'child',parentId:'repeat',text:'Child'},{id:'grandchild',parentId:'child',text:'Grandchild'},
  {id:'oneoff',roomId:'r',text:'One off',dueDate:due},{id:'oneoff-child',parentId:'oneoff',text:'One off child'},
  {id:'done-oneoff',roomId:'r',done:true,dueDate:due},{id:'done-repeat',roomId:'r',done:true,recurrence:{kind:'weeks',every:1},nextDue:due},
  {id:'side',roomId:'r',bucket:'side',recurrence:{kind:'weeks',every:1},nextDue:due},
  {id:'side-copy',roomId:'r',recurrence:{kind:'weeks',every:1},nextDue:due},
  {id:'other',roomId:'elsewhere',recurrence:{kind:'weeks',every:1},nextDue:due}
 ],appointments:[{text:'Event',date:'2026-10-12'}],errands:[{id:'errand',text:'Errand',dueDate:due}]};
 const before=structuredClone(state),room=recurringRoomCalendarState(state,'r');
 assert.deepEqual(room.tasks.map(t=>t.id),['repeat','child','grandchild','done-repeat']);
 assert.deepEqual(room.appointments,[]);assert.deepEqual(room.errands,[]);
 const entries=upcomingCalendarEntries(room,{showSetDay:false,start:new Date('2026-10-12'),end:new Date('2026-10-27')});
 assert.deepEqual(entries.map(e=>e.id),['repeat','repeat','repeat']);
 assert.deepEqual(entries.map(e=>e.date),['2026-10-12','2026-10-19','2026-10-26']);
 const main=buildCalendarPlan(state,{today:'2026-10-12',end:'2026-10-27',recurringOnly:true});
 assert.ok([...main.entries,...main.backlog].every(e=>!['oneoff','done-oneoff','oneoff-child'].includes(e.taskId)));
 assert.deepEqual(state,before);
});
