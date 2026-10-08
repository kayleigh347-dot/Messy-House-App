import test from 'node:test';
import assert from 'node:assert/strict';
import {addToDoingNow,removeFromDoingNow,moveDoingNow,doingNowTasks,completedToday,captureCompletion,undoCompletion,taskNotification} from '../task-flow.js';

test('Doing Now references the same tasks and keeps a flat independent order',()=>{
 const tasks=[{id:'a',roomId:'one',order:9},{id:'b',roomId:'two',order:0},{id:'c',roomId:'one',order:4}];
 assert.equal(addToDoingNow(tasks[0],tasks),true);assert.equal(addToDoingNow(tasks[1],tasks),true);assert.equal(addToDoingNow(tasks[2],tasks),true);
 assert.deepEqual(doingNowTasks(tasks).map(t=>t.id),['a','b','c']);
 moveDoingNow(tasks,'c','top');assert.deepEqual(doingNowTasks(tasks).map(t=>t.id),['c','a','b']);
 moveDoingNow(tasks,'c','bottom');assert.deepEqual(doingNowTasks(tasks).map(t=>t.id),['a','b','c']);
 assert.equal(removeFromDoingNow(tasks[1]),true);assert.equal(tasks.length,3);assert.equal(tasks[1].doingNow,false);
});

test('today completion remains visible and undo removes its point and recurring occurrence',()=>{
 const now='2026-09-29T12:00:00Z',task={id:'a',done:true,doingNow:true,completedAt:now,nextDue:'2026-10-06T00:00:00Z',lastDone:now},next={id:'next'};
 captureCompletion(task,now,'win-a','next',{hasNextDue:true,nextDue:'2026-09-29T00:00:00Z',hasLastDone:false});
 const state={tasks:[task,next],wins:[{id:'win-a',taskId:'a',at:now},{id:'other',taskId:'other',at:now}]};
 assert.equal(completedToday(task,state.wins,new Date(now)),true);assert.deepEqual(doingNowTasks(state.tasks,state.wins,new Date(now)).map(t=>t.id),['a']);
 assert.equal(undoCompletion(state,task),true);assert.equal(task.done,false);assert.equal(task.doingNow,true);assert.equal(task.nextDue,'2026-09-29T00:00:00Z');assert.equal('lastDone'in task,false);assert.deepEqual(state.tasks.map(t=>t.id),['a']);assert.deepEqual(state.wins.map(w=>w.id),['other']);
});

test('shared task notifications target one household member without duplicating the task',()=>{
 const task={id:'task',text:'Bins',roomId:'k',area:'Kitchen'},notice=taskNotification(task,{id:'andy',name:'Andy'},{id:'kayleigh',name:'Kayleigh'},'2026-09-29T12:00:00Z',()=> 'notice');
 assert.deepEqual(notice,{id:'notice',taskId:'task',recipientId:'andy',recipientName:'Andy',text:'Bins',roomId:'k',area:'Kitchen',createdAt:'2026-09-29T12:00:00Z',createdBy:'kayleigh',createdByName:'Kayleigh',readBy:[]});
});
