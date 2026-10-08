import test from 'node:test';
import assert from 'node:assert/strict';
import {saveReusable,deleteReusable,roomTemplates,nextTaskId,addSavedTasks,reusableSuggestionEligible} from '../task-extras.js';
import {normalize,validateV2,roomMess,DAY} from '../v2-state.js';
import {merge,empty} from '../sync-state.js';
test('all-room templates leave active tasks alone and support scoped deletion',()=>{
 const task={id:'t',text:'Windows',roomId:'a',messImpact:'big'};
 const st={rooms:[{id:'a',name:'A'},{id:'b',name:'B'},{id:'c',name:'C',archived:true}],tasks:[task],templates:[]};let n=0;
 saveReusable(st,task,true,()=>String(++n));assert.equal(st.tasks.length,1);assert.equal(st.templates.length,2);
 assert.equal(roomTemplates(st,'a').length,1);assert.equal(roomTemplates(st,'b').length,1);
 deleteReusable(st,st.templates[0]);assert.equal(roomTemplates(st,'a').length,0);assert.equal(st.templates.length,1);
 deleteReusable(st,st.templates[0],true);assert.equal(st.templates.length,0);assert.deepEqual(st.tasks,[task]);
});
test('homeless history survives normalization, sync and JSON backup without mess or wins',()=>{
 const base=normalize(empty()),local=structuredClone(base),remote=structuredClone(base);
 local.homeless.push({id:'h',roomId:'room-master',text:'Cable',done:true,completedAt:'2026-09-22T10:00:00Z'});
 remote.tasks.push({id:'t',roomId:'room-master',text:'Dust',bucket:'now',scheduled:true,recurrence:{kind:'days',every:1},nextDue:new Date(Date.now()+DAY).toISOString()});
 const combined=merge(base,local,remote);assert.equal(combined.homeless.length,1);assert.equal(combined.tasks.length,1);assert.equal(combined.wins.length,0);
 assert.equal(roomMess(combined,'room-master').percent,0);validateV2(combined);
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(combined))),combined);
 const edited=structuredClone(combined);edited.homeless=[];assert.equal(merge(combined,edited,combined).homeless.length,0);
 assert.throws(()=>validateV2({...combined,homeless:[{id:'bad'}]}));
});
test('next task cycles without changing task order or state',()=>{
 const tasks=[{id:'a'},{id:'b'}],before=structuredClone(tasks);
 assert.equal(nextTaskId(tasks,'a'),'b');assert.equal(nextTaskId(tasks,'b'),'a');assert.equal(nextTaskId([],null),null);assert.deepEqual(tasks,before);
});

test('reusable task families retain nested subtasks when saved and added again',()=>{
 const state={rooms:[{id:'r',name:'Room'}],tasks:[{id:'p',text:'Project',roomId:'r',area:'Room'},{id:'c',text:'Step',roomId:'r',area:'Room',parentId:'p'},{id:'g',text:'Detail',roomId:'r',area:'Room',parentId:'c'}],templates:[]};
 saveReusable(state,state.tasks[0]);assert.equal(roomTemplates(state,'r').length,1);assert.equal(state.templates.length,3);
 const root=roomTemplates(state,'r')[0];assert.equal(addSavedTasks(state,[root.id]),3);const added=state.tasks.slice(3);assert.equal(added[0].text,'Project');assert.equal(added[1].parentId,added[0].id);assert.equal(added[2].parentId,added[1].id);
});

test('completed reusable suggestions expire after 30 days or can be dismissed',()=>{
 const now=Date.parse('2026-10-07T12:00:00Z');
 assert.equal(reusableSuggestionEligible({completedAt:'2026-09-07T12:00:00Z'},now),true);
 assert.equal(reusableSuggestionEligible({completedAt:'2026-09-07T11:59:59Z'},now),false);
 assert.equal(reusableSuggestionEligible({completedAt:'2026-10-01T12:00:00Z',reusableDismissedAt:'2026-10-02T12:00:00Z'},now),false);
 assert.equal(reusableSuggestionEligible({text:'Legacy completion'},now),true);
});
