import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../v2-state.js';
import {reconcileSync} from '../sync-state.js';
test('unchanged sync preserves the task objects referenced by on-screen buttons',()=>{
 const current=normalize({tasks:[{id:'a',text:'Bins'}],side:[],wins:[],current:null});
 const buttonTask=current.tasks[0],snapshot=structuredClone(current);
 const next=reconcileSync(snapshot,current,structuredClone(current));
 assert.equal(next,current);assert.equal(next.tasks[0],buttonTask);
 buttonTask.done=true;assert.equal(next.tasks[0].done,true);
});
test('changed sync replaces the state so the UI can redraw with current task references',()=>{
 const current=normalize({tasks:[{id:'a',text:'Bins'}],side:[],wins:[],current:null}),remote=structuredClone(current);
 remote.tasks[0].text='Recycling';
 const next=reconcileSync(structuredClone(current),current,remote);
 assert.notEqual(next,current);assert.equal(next.tasks[0].text,'Recycling');
});
test('local edits during sync survive reconciliation',()=>{
 const current=normalize({tasks:[{id:'a',text:'Bins'}],side:[],wins:[],current:null}),snapshot=structuredClone(current);
 current.tasks[0].done=true;
 const next=reconcileSync(snapshot,current,snapshot);assert.equal(next.tasks[0].done,true);
});
