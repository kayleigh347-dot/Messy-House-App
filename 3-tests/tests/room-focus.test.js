import test from 'node:test';
import assert from 'node:assert/strict';
import {focusRoomTasks,selectFocusTasks} from '../room-focus.js';
const state=()=>({rooms:[{id:'room-a'},{id:'room-b'}],tasks:[{id:'old',roomId:'room-b',doingNow:true,doingNowOrder:4,order:5},{id:'a',text:'A',roomId:'room-a',order:8},{id:'b',text:'B',roomId:'room-a',order:2},{id:'done',roomId:'room-a',done:true},{id:'future',roomId:'room-a',nextDue:'2099-01-01'},{id:'paused',roomId:'room-a',pausedAt:'2026-01-01'},{id:'child',roomId:'room-a',parentId:'a'},{id:'side',roomId:'room-a',bucket:'side'}],side:[],wins:[],rewards:[]});
test('room projection is read-only and keeps existing order and eligibility',()=>{
 const board=state(),before=structuredClone(board);assert.deepEqual(focusRoomTasks(board,'room-a').map(task=>task.id),['b','a']);assert.deepEqual(board,before);assert.deepEqual(focusRoomTasks(board,'missing'),[]);
});
test('explicit selection uses existing references and appends without touching other work, dates or rewards',()=>{
 const board=state(),before=structuredClone(board),original=board.tasks[1];assert.deepEqual(selectFocusTasks(board,'room-a',['b','a','b']),['b','a']);assert.equal(board.tasks[1],original);assert.equal(original.doingNow,true);assert.equal(board.tasks[2].doingNowOrder,5);assert.equal(original.doingNowOrder,6);assert.deepEqual(board.tasks[0],before.tasks[0]);assert.deepEqual(board.tasks.map(task=>task.order),before.tasks.map(task=>task.order));assert.equal(board.tasks.length,before.tasks.length);assert.deepEqual(board.wins,[]);assert.deepEqual(board.rewards,[]);selectFocusTasks(board,'room-a',['a']);assert.equal(original.doingNowOrder,6);
});
test('stale or cross-room selection fails atomically without partial Doing Now updates',()=>{
 for(const id of ['old','done','future','paused','child','side','deleted']){const board=state(),before=structuredClone(board);assert.throws(()=>selectFocusTasks(board,'room-a',['a',id]),/changed/);assert.deepEqual(board,before);}
});
