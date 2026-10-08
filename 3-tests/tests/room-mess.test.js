import test from 'node:test';
import assert from 'node:assert/strict';
import {messPieces,renderRoomMess} from '../room-mess.js';
import {roomMess,scheduleNext} from '../v2-state.js';

test('all rooms progressively clear clutter as their tasks complete',()=>{
 for(const id of ['master','penny','bathroom','kitchen','living','craft','print','cats','hall','entrance','custom']){
  const roomId='room-'+id;
  const state={tasks:Array.from({length:7},(_,i)=>({id:String(i),roomId,bucket:'now',messImpact:'big'}))};
  let previous=Infinity;
  for(let done=0;done<=7;done++){
   const pieces=messPieces(roomId,roomMess(state,roomId).percent);
   const visible=pieces.reduce((sum,p)=>sum+p.opacity,0);
   assert.ok(visible<previous);previous=visible;
   if(done<7)state.tasks[done].done=true;else assert.equal(pieces.length,0);
  }
 }
});

test('Paused tasks, side quests and future recurrence do not leave clutter after completion',()=>{
 const now=new Date('2026-09-21T12:00:00Z');
 const task={id:'repeat',roomId:'room-kitchen',bucket:'now',messImpact:'big',created:now.toISOString(),recurrence:{kind:'days',every:1}};
 const state={tasks:[task,{roomId:task.roomId,bucket:'now',pausedAt:now.toISOString(),messImpact:'big'}],side:[{roomId:task.roomId,messImpact:'big'}]};
 assert.ok(messPieces(task.roomId,roomMess(state,task.roomId,+now).percent).length>0);
 state.tasks.push(scheduleNext(task,now));task.done=true;
 assert.deepEqual(messPieces(task.roomId,roomMess(state,task.roomId,+now).percent),[]);
});

test('clutter stays in place when reduced, varies by room, and caps at full mess',()=>{
 const full=messPieces('room-kitchen',100),less=messPieces('room-kitchen',40);
 for(let i=0;i<less.length;i++)assert.deepEqual({...less[i],opacity:1},full[i]);
 assert.notEqual(full[0].kind,messPieces('room-master',100)[0].kind);
 assert.deepEqual(messPieces('room-kitchen',200),full);
 assert.deepEqual(messPieces('room-kitchen',0),[]);
});

test('rerender replaces clutter and clears it without accumulating layers',()=>{
 const make=()=>({children:[],style:{},setAttribute(k,v){this[k]=v},append(x){this.children.push(x)},replaceChildren(){this.children=[]},querySelector(){return this.children.find(x=>x.className==='room-mess')}});
 const previous=globalThis.document;globalThis.document={createElement:make};
 try{
  const scene=make();renderRoomMess(scene,'room-kitchen',100);
  assert.equal(scene.children.length,1);assert.equal(scene.children[0].children.length,16);
  assert.equal(scene.children[0]['aria-hidden'],'true');
  renderRoomMess(scene,'room-master',20);assert.equal(scene.children.length,1);assert.equal(scene.children[0].children[0].className,'mess-piece mess-cloth');
  renderRoomMess(scene,'room-master',0);assert.equal(scene.children[0].children.length,0);
 }finally{globalThis.document=previous}
});
