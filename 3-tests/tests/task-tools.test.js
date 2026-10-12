import test from 'node:test';
import assert from 'node:assert/strict';
import {laundryLoads,laundryLoadProgress,completeLaundryLoadStep,laundryLoadSteps,saveLaundryLoadSteps,addLaundryCycleStep,completeUniformStep,laundryDoingSteps,completeLaundryTask,undoLaundryTask} from '../laundry.js';
import {timingChoices,recordTaskTiming,useTimingEstimate} from '../task-timing.js';
import {upcomingCalendarEntries} from '../house-calendar.js';
import {rewardProgress,rewardUnlockReason} from '../rewards.js';
const actor={id:'person',name:'Person'},at='2026-10-12T12:00:00Z';
const board=()=>({tasks:[],templates:[],settings:[],rooms:[{id:'room-laundry',name:'Laundry'}],wins:[],householdPeople:[actor]});
test('editing load steps preserves active transfer and history and opted-in added step joins Doing Now',()=>{
 const state=board();laundryLoads(state);completeLaundryLoadStep(state,1,0,actor,at);const before=structuredClone(state.wins),steps=structuredClone(laundryLoadSteps(state));steps.splice(2,0,{id:'fold',kind:'custom',text:'Fold towels',autoDoingNow:true});steps[0].text='Start washer';saveLaundryLoadSteps(state,steps,at);
 assert.equal(laundryLoadProgress(state,1).step.id,'transfer');assert.deepEqual(state.wins,before);completeLaundryLoadStep(state,1,1,actor,at,'rail');let progress=laundryLoadProgress(state,1);assert.equal(progress.text,'Fold towels');assert.equal(progress.doingNow,true);completeLaundryLoadStep(state,1,2,actor,at);progress=laundryLoadProgress(state,1);assert.equal(progress.step.kind,'finish');assert.equal(progress.doingNow,false);assert.equal(progress.total,4);assert.equal(state.tasks.length,0);
 completeLaundryLoadStep(state,1,3,actor,at);assert.equal(laundryLoadProgress(state,1).text,'Start washer');assert.equal(state.wins.length,4);
});
test('invalid load edits cannot mutate state or remove the drying choice',()=>{const state=board();laundryLoads(state);const before=structuredClone(state);assert.throws(()=>saveLaundryLoadSteps(state,[{id:'x',text:'Only step'}]));assert.deepEqual(state,before);});
test('added uniform step waits for its predecessor and preserves completed steps',()=>{
 const state=board();state.settings.push({id:'uniform',text:'Wash uniform',laundryUniform:true,laundryImported:true,done:false},{id:'gather',text:'Gather',parentId:'uniform',done:false,order:0});
 const added=addLaundryCycleStep(state,'settings','uniform','Fold uniform','fold',true);assert.equal(added.autoDoingNow,true);assert.equal(laundryDoingSteps(state).length,0);completeUniformStep(state,'gather',actor,at);assert.equal(laundryDoingSteps(state)[0].id,'fold');assert.equal(state.settings.find(step=>step.id==='gather').done,true);assert.equal(state.wins.length,1);
});
test('manual timings preserve estimates until explicit use and update linked reusable tasks',()=>{
 const state=board();state.templates.push({id:'t',text:'Towels',estimatedMinutes:9});state.tasks.push({id:'live',text:'Towels',sourceTemplateId:'t',estimatedMinutes:9},{id:'other',text:'Towels',estimatedMinutes:11});
 const record=recordTaskTiming(state,'templates','t',90000,'sample',at);assert.equal(state.templates[0].estimatedMinutes,9);assert.equal(state.tasks[0].estimatedMinutes,9);assert.equal(useTimingEstimate(state,record.id),2);assert.equal(state.templates[0].estimatedMinutes,2);assert.equal(state.tasks[0].estimatedMinutes,2);assert.equal(state.tasks[1].estimatedMinutes,11);assert.equal(timingChoices(state).filter(choice=>choice.collection==='templates').length,1);assert.equal(recordTaskTiming(state,'templates','t',0,'bad'),null);
});
test('forecast repeats fill the visible range without changing tasks and do not count paused or child records',()=>{
 const state=board();state.tasks=[{id:'daily',text:'Daily',roomId:'room-laundry',recurrence:{kind:'days',every:2},nextDue:at},{id:'normal',text:'One-off',roomId:'room-laundry',dueDate:at},{id:'paused',text:'Paused',recurrence:{kind:'days',every:1},pausedAt:at,nextDue:at},{id:'child',text:'Child',parentId:'daily',recurrence:{kind:'days',every:1},nextDue:at}];const before=structuredClone(state);
 const entries=upcomingCalendarEntries(state,{start:new Date(2026,9,12),end:new Date(2026,9,20)});assert.equal(entries.filter(entry=>entry.id==='daily').length,4);assert.equal(entries.filter(entry=>entry.projected).length,3);assert.equal(entries.filter(entry=>entry.id==='normal').length,1);assert.deepEqual(state,before);
});
test('shelf exposes overall, zero-progress room and task goals and every collected unlock reason',()=>{
 const state=board();state.tasks=[{id:'x',text:'Fold towels'}];state.settings.push({id:'reward-policy',baselineWins:0,baselineEarned:0});const progress=rewardProgress(state);assert.ok(progress.challenges.some(goal=>goal.id==='overall'&&goal.target===5));assert.ok(progress.challenges.some(goal=>goal.kind==='room'&&goal.count===0));assert.ok(progress.challenges.some(goal=>goal.kind==='task'&&goal.label==='fold towels'));assert.equal(rewardUnlockReason(state,{id:'milestone:room:room-laundry:15'}),'15 Laundry tasks completed');
});

test('a measured load-cycle step changes its estimate only when chosen and keeps the current load',()=>{const state=board();laundryLoads(state);completeLaundryLoadStep(state,1,0,actor,at);const record=recordTaskTiming(state,'laundrySteps','transfer',120000,'load-time',at);assert.equal(laundryLoadSteps(state)[1].estimatedMinutes,undefined);assert.equal(useTimingEstimate(state,record.id),1);assert.equal(laundryLoadSteps(state)[1].estimatedMinutes,2);assert.equal(laundryLoadProgress(state,1).step.id,'transfer');});

test('an imported cycle step can complete from Doing Now and undo reopens its parent without duplicating the next cycle',()=>{const state=board();state.settings.push({id:'uniform',text:'Wash uniform',laundryUniform:true,laundryImported:true,recurrence:{kind:'days',every:7},done:false},{id:'step',text:'Fold uniform',parentId:'uniform',roomId:'room-laundry',laundryImported:true,autoDoingNow:true,doingNow:true,done:false});assert.ok(completeLaundryTask(state,'step',actor,at));assert.equal(state.settings.find(item=>item.id==='uniform').done,true);assert.equal(state.wins.filter(win=>win.points>0).length,1);assert.equal(state.settings.filter(item=>!item.parentId).length,2);assert.ok(undoLaundryTask(state,'step',at));assert.equal(state.settings.find(item=>item.id==='uniform').done,false);assert.equal(state.settings.find(item=>item.id==='step').done,false);assert.equal(state.settings.filter(item=>!item.parentId).length,1);assert.equal(state.wins.length,0);});
