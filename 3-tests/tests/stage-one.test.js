import test from 'node:test';
import assert from 'node:assert/strict';
import {roomMess,scheduleNext,activateDue,DAY} from '../v2-state.js';
test('recurring mess starts when due, stays steady, and resets after completion',()=>{
 const now=new Date('2026-09-19T12:00:00Z');
 const task={id:'t',roomId:'living',area:'Living',text:'Weekly clean',bucket:'now',created:now.toISOString(),activeSince:now.toISOString(),messImpact:'big',recurrence:{kind:'weeks',every:1}};
 const state={tasks:[task]};
 assert.equal(roomMess(state,'living',+now).score,2);
 assert.equal(roomMess(state,'living',+now+DAY*2).score,2);
 const next=scheduleNext(task,now);task.done=true;state.tasks.push(next);
 assert.equal(roomMess(state,'living',+now+DAY*6).percent,0);
 activateDue(state,Date.parse(next.nextDue));
 assert.equal(roomMess(state,'living',Date.parse(next.nextDue)).score,2);
 assert.equal(roomMess(state,'living',Date.parse(next.nextDue)+DAY*2).score,2);
 assert.equal(roomMess(state,'living',Date.parse(next.nextDue)+DAY*999).score,2);
});

 test('future recurring tasks contribute once at due time even if moved to Now early',()=>{
 const due=Date.parse('2026-09-20T12:00:00Z');
 const task={roomId:'r',bucket:'now',nextDue:new Date(due).toISOString(),recurrence:{kind:'days',every:1},messImpact:'big',allowanceDays:2};
 const state={tasks:[task]},before=structuredClone(state);
 for(const offset of [-DAY,-1])assert.equal(roomMess(state,'r',due+offset).score,0);
 for(const offset of [0,1,DAY,DAY*1000])assert.equal(roomMess(state,'r',due+offset).score,2);
 assert.deepEqual(state,before);
 task.done=true;assert.equal(roomMess(state,'r',due+DAY*1000).score,0);
 });
 test('repeated activation and reload never compound a recurring occurrence',()=>{
 const start=new Date('2026-09-19T12:00:00Z');
 const task={id:'repeat',roomId:'r',recurrence:{kind:'days',every:1},messImpact:'small'};
 const next=scheduleNext(task,start),state={tasks:[next]},due=Date.parse(next.nextDue);
 assert.equal(roomMess(state,'r',due-1).score,0);
 assert.equal(activateDue(state,due+DAY*30),true);
 assert.equal(roomMess(state,'r',due+DAY*30).score,0.5);
 assert.equal(activateDue(state,due+DAY*60),false);
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(roomMess(restored,'r',due+DAY*60).score,0.5);
 assert.equal(restored.tasks.length,1);
 });
