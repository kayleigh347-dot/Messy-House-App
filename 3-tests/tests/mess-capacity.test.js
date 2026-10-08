import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,roomMess,DAY} from '../v2-state.js';
import {merge,empty} from '../sync-state.js';

const fixture=()=>normalize({rooms:[{id:'r',name:'Room'}],tasks:[
 ...Array.from({length:10},(_,i)=>({id:'big-'+i,text:'Big '+i,roomId:'r',bucket:'now',messImpact:'big'})),
 {id:'small',text:'Small',roomId:'r',bucket:'now',messImpact:'small'},
 {id:'normal',text:'Normal',roomId:'r',bucket:'now',messImpact:'normal'},
 {id:'none',text:'Project',roomId:'r',bucket:'now',messImpact:'none'}
]});

test('overloaded rooms visibly decrease according to completed impact and retain their scale on reload and sync',()=>{
 const base=fixture();assert.equal(roomMess(base,'r').percent,100);
 for(const [id,expected] of [['small',97.7],['normal',95.3],['big-0',90.7],['none',100]]){
  let state=structuredClone(base);state.tasks.find(t=>t.id===id).done=true;
  state=normalize(state);
  assert.equal(roomMess(state,'r').percent,expected,id);
  assert.equal(roomMess(normalize(JSON.parse(JSON.stringify(state))),'r').percent,expected,'backup/reload');
  assert.equal(roomMess(merge(base,state,base),'r').percent,expected,'sync');
 }
});

test('clearing a room resets the scale; scheduled future tasks and other rooms do not inflate it',()=>{
 let state=fixture();state.tasks.forEach(t=>t.done=true);state=normalize(state);
 assert.equal(roomMess(state,'r').percent,0);
 state.tasks.push({id:'new',text:'New',roomId:'r',bucket:'now',messImpact:'normal'});
 state.tasks.push({id:'future',text:'Future recurrence',roomId:'r',bucket:'now',scheduled:true,recurrence:{kind:'days',every:1},nextDue:new Date(Date.now()+DAY).toISOString(),messImpact:'big'});
 state.tasks.push({id:'elsewhere',text:'Other room',roomId:'other',messImpact:'big'});
 state=normalize(state);assert.equal(roomMess(state,'r').percent,7.1);
 assert.equal(roomMess(state,'r').capacity,14);
 assert.equal(roomMess(merge(empty(),state,empty()),'r').percent,7.1);
});
