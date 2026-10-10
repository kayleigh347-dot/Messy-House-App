import test from 'node:test';
import assert from 'node:assert/strict';
import {laundryProgress,completeLaundryStep,laundrySteps,laundryTasks,addLaundryTask,completeLaundryTask} from '../laundry.js';
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
 const state=board(),steps=['Put washing on','Put in dryer','Empty dryer'];
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
