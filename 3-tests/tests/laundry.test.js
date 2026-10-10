import test from 'node:test';
import assert from 'node:assert/strict';
import {laundryProgress,completeLaundryStep,laundrySteps,laundryTasks,addLaundryTask,completeLaundryTask,uniformProgress,completeUniformStep} from '../laundry.js';
import {normalize} from '../v2-state.js';
import {rewardCounts} from '../rewards.js';
import {merge} from '../sync-state.js';
const actor={id:'person-k',name:'Kayleigh'};
const board=()=>({tasks:[],side:[],wins:[],settings:[],rooms:[{id:'room-kitchen',name:'Kitchen'}],householdPeople:[actor]});
const at='2026-10-10T12:00:00Z';
test('laundry shows each step in order, earns one point per step and restarts after step three',()=>{
 let state=normalize(board());
 for(let i=0;i<6;i++){
  assert.equal(laundryProgress(state).text,laundrySteps[i%3]);
  const record=completeLaundryStep(state,i,actor,at);assert.ok(record);assert.equal(record.points,1);assert.equal(record.completedBy,actor.id);
  state=normalize(state);assert.equal(rewardCounts(state).wins,i+1);assert.equal(state.tasks.length,0);
 }
 assert.equal(laundryProgress(state).text,laundrySteps[0]);assert.equal(laundryProgress(state).cycle,3);assert.equal(new Set(state.wins.map(w=>w.id)).size,6);
});
test('saved progress survives reopening and completion history being archived',()=>{
 const state=board();completeLaundryStep(state,0,actor,at);completeLaundryStep(state,1,actor,at);
 const reopened=JSON.parse(JSON.stringify(state));reopened.wins=[];
 assert.equal(laundryProgress(reopened).text,laundrySteps[2]);assert.ok(completeLaundryStep(reopened,2,actor,at));assert.equal(laundryProgress(reopened).index,0);
});
test('a stale or repeated completion cannot award a second point',()=>{
 const state=board();assert.ok(completeLaundryStep(state,0,actor,at));assert.equal(completeLaundryStep(state,0,actor,at),null);assert.equal(state.wins.length,1);assert.equal(laundryProgress(state).completed,1);
});
test('completion requires an existing household person, consistent with other tasks',()=>{
 const state=board();for(const person of [null,{id:'local-device'},{id:'unknown'}])assert.equal(completeLaundryStep(state,0,person,at),null);assert.equal(state.wins.length,0);assert.equal(state.settings.length,0);
});
test('two devices completing the same laundry step merge to one point and one next step',()=>{
 const base=normalize(board()),local=structuredClone(base),remote=structuredClone(base);completeLaundryStep(local,0,actor,at);completeLaundryStep(remote,0,actor,'2026-10-10T12:01:00Z');const state=merge(base,local,remote);assert.equal(rewardCounts(state).wins,1);assert.equal(laundryProgress(state).completed,1);
});
test('completion records recover progress when an older settings row arrives in sync',()=>{
 const state=board();completeLaundryStep(state,0,actor,at);completeLaundryStep(state,1,actor,at);state.settings[0].completedSteps=1;assert.equal(laundryProgress(state).completed,2);
});

test('dryer has an independent three-step cycle and points',()=>{
 const state=board(),steps=['Put a load on','Put in dryer','Empty dryer'];
 completeLaundryStep(state,0,actor,at);
 for(let i=0;i<3;i++){
  assert.equal(laundryProgress(state,'dryer').text,steps[i]);
  assert.ok(completeLaundryStep(state,i,actor,at,'dryer'));
  assert.equal(laundryProgress(state).completed,1);
 }
 assert.equal(laundryProgress(state,'dryer').index,0);
 assert.equal(rewardCounts(state).wins,4);
 assert.equal(new Set(state.wins.map(win=>win.id)).size,4);
 assert.equal(laundryProgress(JSON.parse(JSON.stringify(state)),'dryer').completed,3);
 state.wins=[];assert.equal(laundryProgress(state,'dryer').completed,3);
 assert.equal(laundryProgress(state).completed,1);
});

test('extra laundry tasks stay outside both cycles and ordinary task lists',()=>{
 const state=board();assert.equal(addLaundryTask(state,'   ','blank',at),null);
 const task=addLaundryTask(state,' Wash bedding ','extra',at);assert.equal(task.text,'Wash bedding');
 assert.equal(state.tasks.length,0);assert.equal(laundryTasks(state).length,1);
 assert.equal(completeLaundryTask(state,task.id,null,at),null);
 assert.ok(completeLaundryTask(state,task.id,actor,at));
 assert.equal(completeLaundryTask(state,task.id,actor,at),null);
 assert.equal(laundryTasks(state).length,0);assert.equal(rewardCounts(state).wins,1);
 assert.equal(laundryProgress(state).completed,0);assert.equal(laundryProgress(state,'dryer').completed,0);
});
test('separate extra laundry tasks added by two devices both survive sync',()=>{
 const base=normalize(board()),local=structuredClone(base),remote=structuredClone(base);
 addLaundryTask(local,'Wash towels','towels',at);addLaundryTask(remote,'Wash bedding','bedding',at);
 assert.equal(laundryTasks(merge(base,local,remote)).length,2);
});

const uniformBoard=()=>({...board(),tasks:[
 {id:'uniform',text:'Wash uniform.',roomId:'room-kitchen',area:'Kitchen',done:false,nextDue:'2026-10-10T00:00:00Z',recurrence:{kind:'fixed-weekday',day:6}},
 {id:'gather',text:'Gather uniform',parentId:'uniform',roomId:'room-kitchen',area:'Kitchen',done:true,completedAt:'2026-10-10T01:00:00Z',order:1},
 {id:'wash',text:'Wash whites',parentId:'uniform',roomId:'room-kitchen',area:'Kitchen',done:false,order:2},
 {id:'hang',text:'Put out whites',parentId:'uniform',roomId:'room-kitchen',area:'Kitchen',done:false,order:3},
 {id:'machine',text:'Clean inside washing machine',roomId:'room-kitchen',area:'Kitchen',done:false},
 {id:'dishes',text:'Do dishes',roomId:'room-kitchen',area:'Kitchen',done:false},
 {id:'dish-wash',text:'Wash',parentId:'dishes',roomId:'room-kitchen',area:'Kitchen',done:false}
]});
test('Kitchen laundry moves with its children, preserving progress and other Kitchen chores',()=>{
 const state=normalize(uniformBoard());assert.deepEqual(state.tasks.map(item=>item.id),['dishes','dish-wash']);
 assert.equal(uniformProgress(state,Date.parse('2026-10-10T12:00:00Z')).step.id,'wash');
 assert.equal(uniformProgress(state,Date.parse('2026-10-09T12:00:00Z')),null);
 assert.ok(laundryTasks(state).some(task=>task.id==='machine'));assert.equal(state.settings.find(item=>item.id==='gather').done,true);
 assert.deepEqual(normalize(state).settings,state.settings);
});
test('uniform completes one next step, awards a point, then hides until next Saturday',()=>{
 const state=normalize(uniformBoard()),at='2026-10-10T12:00:00Z';
 assert.equal(completeUniformStep(state,'hang',actor,at),null);
 assert.ok(completeUniformStep(state,'wash',actor,at));assert.equal(completeUniformStep(state,'wash',actor,at),null);
 assert.equal(uniformProgress(state,Date.parse(at)).step.id,'hang');assert.ok(completeUniformStep(state,'hang',actor,at));
 assert.equal(uniformProgress(state,Date.parse(at)),null);
 const next=uniformProgress(state,Date.parse('2026-10-17T12:00:00Z'));assert.ok(next);assert.equal(next.step.text,'Gather uniform');assert.equal(next.total,3);
 assert.equal(state.wins.find(win=>win.taskId==='uniform').points,0);
 assert.equal(state.wins.filter(win=>win.taskId==='wash'||win.taskId==='hang').reduce((sum,win)=>sum+win.points,0),2);
});
test('moved recurring maintenance keeps its schedule after completion',()=>{
 const raw=uniformBoard();raw.tasks.find(item=>item.id==='machine').recurrence={kind:'weeks',every:4};
 const state=normalize(raw);assert.ok(completeLaundryTask(state,'machine',actor,'2026-10-10T12:00:00Z'));
 assert.equal(laundryTasks(state,Date.parse('2026-10-11T12:00:00Z')).some(item=>item.text==='Clean inside washing machine'),false);
 assert.equal(laundryTasks(state,Date.parse('2026-11-07T12:00:00Z')).some(item=>item.text==='Clean inside washing machine'),true);
});

import {laundryReminder} from '../laundry-reminders.js';
test('both load reminders wait two hours, repeat every thirty minutes and stop at step two',()=>{
 for(const cycle of ['rail','dryer']){
  const state=board(),start=Date.parse('2026-10-10T10:00:00Z');
  assert.equal(laundryReminder(state,cycle,start),null);
  completeLaundryStep(state,0,actor,new Date(start).toISOString(),cycle);
  assert.equal(laundryReminder(state,cycle,start+7199999).due,false);
  assert.equal(laundryReminder(state,cycle,start+7200000).slot,0);
  assert.equal(laundryReminder(state,cycle,start+9000000).slot,1);
  const reopened=JSON.parse(JSON.stringify(state));reopened.wins=[];
  assert.equal(laundryReminder(reopened,cycle,start+10800000).slot,2);
  completeLaundryStep(state,1,actor,new Date(start+9000000).toISOString(),cycle);
  assert.equal(laundryReminder(state,cycle,start+10800000),null);
 }
});
