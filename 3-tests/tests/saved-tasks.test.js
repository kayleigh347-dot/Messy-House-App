import test from 'node:test';
import assert from 'node:assert/strict';
import {ordered} from '../v2-state.js';
import {addSavedTasks} from '../task-extras.js';

test('adding several templates creates fresh tasks in their own rooms without changing templates or existing tasks',()=>{
 const templates=[{id:'a',roomId:'room-a',area:'A',text:'Windows',order:2,messImpact:'small',notes:'Frames too',allowanceDays:3},{id:'b',roomId:'room-b',area:'B',text:'Dust',order:1}];
 const originals=structuredClone(templates),existing={id:'old',text:'Keep',order:8};
 const state={templates,rooms:[{id:'room-a'},{id:'room-b'}],tasks:[existing]};let id=0;
 assert.equal(addSavedTasks(state,['a','b','a'],()=>`new-${++id}`,'2026-09-22T12:00:00Z'),2);
 assert.deepEqual(state.tasks.map(t=>t.id),['old','new-1','new-2']);
 assert.equal(existing.order,8);
 assert.deepEqual(ordered(state.tasks).map(t=>t.id),['new-1','new-2','old']);
 assert.deepEqual(state.tasks.slice(1).map(t=>t.roomId),['room-b','room-a']);
 assert.equal(state.tasks[2].notes,'Frames too');assert.equal(state.tasks[2].allowanceDays,3);assert.equal(state.tasks[2].messImpact,'small');
 for(const task of state.tasks.slice(1)){assert.equal(task.bucket,'now');assert.equal(task.done,false);assert.equal(task.created,'2026-09-22T12:00:00Z')}
 assert.deepEqual(templates,originals);assert.equal(state.tasks[0],existing);
});
test('stale selections and archived rooms are skipped; empty selection adds nothing',()=>{
 const state={rooms:[{id:'archived',archived:true}],templates:[{id:'a',roomId:'archived'},{id:'b',roomId:'missing'}],tasks:[]};
 assert.equal(addSavedTasks(state,['a','b','deleted']),0);assert.equal(addSavedTasks(state,[]),0);assert.deepEqual(state.tasks,[]);
});
