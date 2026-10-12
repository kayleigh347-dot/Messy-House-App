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

test('selected backup fills missing uniform step once while preserving completed live steps',()=>{
 const raw=uniformBoard(),old='uniform',id='7db69e67-90f5-4a25-aded-e5cc614f4c2a';raw.tasks[0].id=id;
 for(const task of raw.tasks)if(task.parentId===old)task.parentId=id;
 const state=normalize(raw),children=state.settings.filter(item=>item.parentId===id);
 assert.ok(!children.some(item=>item.text==='Remove dye from tops if possible'&&!item.archived));
 assert.equal(children.find(item=>item.id==='gather').done,true);
 const count=state.settings.length;assert.equal(normalize(state).settings.length,count);
});

import {laundryTaskList,isLaundryCycleItem,deleteLaundryItem,undoLaundryTask} from '../laundry.js';
test('completed extras stay below unfinished tasks and Undo restores their point accounting',()=>{
 const state=board();const first=addLaundryTask(state,'Pair socks','socks',at),second=addLaundryTask(state,'Fold towels','towels',at);
 completeLaundryTask(state,first.id,actor,at);
 assert.deepEqual(laundryTaskList(state).map(t=>t.id),[second.id,first.id]);assert.equal(rewardCounts(state).wins,1);
 assert.equal(completeLaundryTask(state,first.id,actor,at),null);
 assert.ok(undoLaundryTask(state,first.id));assert.equal(rewardCounts(state).wins,0);assert.equal(first.done,false);
 assert.ok(completeLaundryTask(state,first.id,actor,at));assert.equal(rewardCounts(state).wins,1);
});
test('cycle warnings follow nested steps and template sources without labelling unrelated laundry',()=>{
 const state=board();state.settings=[{id:'cycle',text:'Wash uniform.',laundryUniform:true},{id:'step',parentId:'cycle',text:'Wash darks'},{id:'nested',parentId:'step',text:'Step 1'},{id:'extra',text:'Pair socks',laundryTask:true}];
 state.templates=[{id:'saved',sourceId:'step',text:'Wash darks'}];
 for(const id of ['cycle','step','nested'])assert.equal(isLaundryCycleItem(state,state.settings.find(t=>t.id===id)),true);
 assert.equal(isLaundryCycleItem(state,state.templates[0]),true);assert.equal(isLaundryCycleItem(state,state.settings[3]),false);
 deleteLaundryItem(state,state.settings[0]);assert.deepEqual(state.settings.map(t=>t.id),['extra']);
});
test('undo recurring laundry removes only its unused next occurrence and restores the completed family',()=>{
 const state=normalize(uniformBoard());state.settings.find(t=>t.id==='machine').recurrence={kind:'weeks',every:4};
 completeLaundryTask(state,'machine',actor,at);assert.equal(state.settings.filter(t=>t.text==='Clean inside washing machine').length,2);
 undoLaundryTask(state,'machine');assert.equal(state.settings.filter(t=>t.text==='Clean inside washing machine').length,1);
 assert.equal(state.settings.find(t=>t.id==='machine').done,false);assert.equal(rewardCounts(state).wins,0);
});

import {laundryLoads,laundryLoadProgress,startSecondLaundryLoad,completeLaundryLoadStep} from '../laundry.js';
test('one washing start branches into either drying route and resets after the final step',()=>{
 for(const route of ['rail','dryer']){
  const state=board();assert.equal(laundryLoads(state)[0].text,'Put a load on');
  assert.equal(startSecondLaundryLoad(state),false);
  assert.ok(completeLaundryLoadStep(state,1,0,actor,at));
  assert.equal(completeLaundryLoadStep(state,1,1,actor,at),null);
  assert.ok(completeLaundryLoadStep(state,1,1,actor,at,route));
  assert.equal(laundryLoadProgress(state,1).text,route==='dryer'?'Empty dryer':'Put away clothes on rail');
  assert.ok(completeLaundryLoadStep(state,1,2,actor,at));assert.equal(laundryLoadProgress(state,1).text,'Put a load on');assert.equal(rewardCounts(state).wins,3);
 }
});
test('second load starts while first dries and has independent saved progress and reminders',()=>{
 const state=board();laundryLoads(state);completeLaundryLoadStep(state,1,0,actor,at);completeLaundryLoadStep(state,1,1,actor,at,'dryer');
 assert.ok(startSecondLaundryLoad(state,at));assert.equal(startSecondLaundryLoad(state,at),false);
 completeLaundryLoadStep(state,2,0,actor,at);assert.equal(laundryLoadProgress(state,1).index,2);
 assert.ok(laundryReminder(state,2,Date.parse(at)+7200000).due);assert.equal(laundryReminder(state,1),null);
 completeLaundryLoadStep(state,1,2,actor,at);assert.equal(laundryLoadProgress(state,2).index,1);
 completeLaundryLoadStep(state,2,1,actor,at,'rail');assert.equal(laundryReminder(state,2),null);
 const reopened=normalize(JSON.parse(JSON.stringify(state)));reopened.wins=[];
 assert.equal(laundryLoadProgress(reopened,1).index,0);assert.equal(laundryLoadProgress(reopened,2).text,'Put away clothes on rail');assert.equal(rewardCounts(state).wins,5);
});
test('existing active rail and dryer cycles migrate into two load tabs without extra points',()=>{
 const state=board();completeLaundryStep(state,0,actor,at);completeLaundryStep(state,1,actor,at);completeLaundryStep(state,0,actor,at,'dryer');
 const loads=laundryLoads(state);assert.equal(loads.length,2);assert.equal(loads[0].text,'Put away clothes on rail');assert.equal(loads[1].index,1);assert.ok(laundryReminder(state,2,Date.parse(at)+7200000).due);
 const count=state.settings.length;laundryLoads(state);assert.equal(state.settings.length,count);assert.equal(rewardCounts(state).wins,3);
});
test('same load step completed on two devices earns one point and recovers from stale settings',()=>{
 const base=normalize(board());laundryLoads(base);const local=structuredClone(base),remote=structuredClone(base);
 completeLaundryLoadStep(local,1,0,actor,at);completeLaundryLoadStep(remote,1,0,actor,at);
 const state=merge(base,local,remote);assert.equal(rewardCounts(state).wins,1);assert.equal(laundryLoadProgress(state,1).index,1);
 completeLaundryLoadStep(state,1,1,actor,at,'dryer');state.settings.find(row=>row.id==='laundry-load-1').completedSteps=1;
 assert.equal(laundryLoadProgress(state,1).text,'Empty dryer');assert.equal(completeLaundryLoadStep(state,1,1,actor,at,'rail'),null);
});
test('washing is the only load stage eligible for Doing Now and completing its choice advances the same saved load',()=>{
 const state=board();laundryLoads(state);
 const inDoing=()=>laundryLoads(state).filter(load=>load.index===1);
 assert.equal(inDoing().length,0);completeLaundryLoadStep(state,1,0,actor,at);
 assert.equal(inDoing()[0].slot,1);completeLaundryLoadStep(state,inDoing()[0].slot,inDoing()[0].completed,actor,at,'dryer');
 assert.equal(inDoing().length,0);assert.equal(laundryLoadProgress(state,1).text,'Empty dryer');assert.equal(state.tasks.length,0);
});

import {addToDoingNow,removeFromDoingNow,doingNowTasks} from '../task-flow.js';
test('extra laundry can join and leave Doing Now, and complete and undo from the same saved task',()=>{
 const state=board(),task=addLaundryTask(state,'Wash towels','on-it',at);
 assert.ok(addToDoingNow(task,state.settings));assert.equal(doingNowTasks(state.settings)[0].id,task.id);
 assert.ok(removeFromDoingNow(task));assert.equal(doingNowTasks(state.settings).length,0);
 addToDoingNow(task,state.settings);completeLaundryTask(state,task.id,actor,new Date().toISOString());
 assert.equal(doingNowTasks(state.settings,state.wins)[0].done,true);assert.equal(rewardCounts(state).wins,1);
 undoLaundryTask(state,task.id);assert.equal(doingNowTasks(state.settings)[0].done,false);assert.equal(rewardCounts(state).wins,0);
 assert.equal(state.tasks.length,0);
});

test('Laundry sidequest category moves to dedicated Laundry with children and progress intact',()=>{
 const state=normalize({...board(),sideTabs:[{id:'old-laundry-tab',name:'Laundry'},{id:'garden',name:'Garden'}],side:[{id:'sheets',text:'Wash sheets',type:'old-laundry-tab',done:false,doingNow:true},{id:'sheet-step',text:'Gather sheets',parentId:'sheets',done:true,completedAt:at},{id:'plant',text:'Plant seeds',type:'garden',done:false}]});
 assert.deepEqual(state.side.map(task=>task.id),['plant']);assert.equal(state.settings.find(task=>task.id==='sheets').laundryTask,true);assert.equal(state.settings.find(task=>task.id==='sheets').doingNow,true);assert.equal(state.settings.find(task=>task.id==='sheet-step').done,true);assert.deepEqual(state.sideTabs.map(tab=>tab.id),['garden']);assert.deepEqual(normalize(state).settings,state.settings);
});

test('Saturday uniform stays active until both darks and whites washing and hanging are completed',()=>{
 const state=normalize({...board(),settings:[{id:'weekly-uniform',text:'Wash uniform',laundryUniform:true,laundryImported:true,nextDue:'2026-10-10T00:00:00Z',recurrence:{kind:'fixed-weekday',day:6},done:false},...['Wash darks','Put out darks','Wash whites','Put out whites'].map((text,index)=>({id:'uniform-colour-'+index,parentId:'weekly-uniform',text,order:index,done:false}))]});
 assert.equal(uniformProgress(state,Date.parse('2026-10-09T12:00:00Z')),null);
 assert.equal(uniformProgress(state,Date.parse(at)).step.text,'Wash darks');
 const sunday='2026-10-11T12:00:00Z';
 for(let index=0;index<4;index++){
  assert.equal(uniformProgress(state,Date.parse(sunday)).step.id,'uniform-colour-'+index);
  assert.ok(completeUniformStep(state,'uniform-colour-'+index,actor,sunday));
 }
 assert.equal(uniformProgress(state,Date.parse(sunday)),null);
 assert.equal(uniformProgress(state,Date.parse('2026-10-16T12:00:00Z')),null);
 assert.equal(uniformProgress(state,Date.parse('2026-10-17T12:00:00Z')).step.text,'Wash darks');
 assert.equal(rewardCounts(state).wins,4);
});

import {uniformHomeProgress} from '../laundry.js';
test('homepage uniform hides after both colour cycles, retiring dye removal and handing put-away to regular Laundry',()=>{
 const state=normalize({...board(),settings:[{id:'uniform-colours',text:'Wash uniform',laundryUniform:true,laundryImported:true,nextDue:'2026-10-10T00:00:00Z',recurrence:{kind:'fixed-weekday',day:6},done:false},...['Wash darks','Put out darks','Wash whites','Put out whites','Remove dye from tops if possible'].map((text,index)=>({id:'colour-step-'+index,parentId:'uniform-colours',text,order:index,done:false}))]});
 assert.equal(uniformHomeProgress(state,Date.parse('2026-10-09T12:00:00Z')),null);
 for(let index=0;index<4;index++){assert.ok(uniformHomeProgress(state,Date.parse(at)));completeUniformStep(state,'colour-step-'+index,actor,at)}
 assert.equal(uniformHomeProgress(state,Date.parse(at)),null);assert.equal(uniformProgress(state,Date.parse(at)),null);assert.equal(laundryLoadProgress(state,1).text,'Put away clothes on rail');
});
