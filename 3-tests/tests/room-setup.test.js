import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomSetupDraft,editRoomSetupTask,resumeRoomSetupDraft,setupRoomSequence,validateSetupFrequency,previewRoomSetupAdditions,applyRoomSetupAdditions} from '../room-setup.js';
import {createRoomArea,renameRoomArea,assignRoomArea,deleteRoomArea,roomAreaMatches} from '../room-areas.js';
const board=()=>({rooms:[{id:'custom',name:'Custom room',category:'custom',order:0},{id:'bathroom',name:'Bathroom',category:'bathroom',order:1},{id:'general',name:'General',category:'general',order:2},{id:'room-laundry',name:'Laundry',order:3}],tasks:[{id:'t',text:'My task',roomId:'bathroom',area:'Bathroom',estimatedMinutes:8,effort:'high',tools:['Cloth'],recurrence:{kind:'weeks',every:2},nextDue:'2026-10-21',order:7,doingNow:true}],side:[],wins:[],calendarSettings:{dailyMax:30}});
test('setup edits and serialised resume never change existing task identities, schedule or board',()=>{
 const state=board(),before=structuredClone(state),draft=createRoomSetupDraft(state,'bathroom');
 assert.equal(draft.tasks[0].taskId,'t');assert.deepEqual(draft.tasks[0].frequency,{kind:'weeks',every:2});
 const edited=editRoomSetupTask(draft,'task:t',{frequency:{kind:'as-needed'},effort:'low',selected:false});
 const resumed=resumeRoomSetupDraft(JSON.parse(JSON.stringify(edited)),state);
 assert.deepEqual(resumed,edited);assert.deepEqual(state,before);assert.equal(draft.tasks[0].selected,true);
 assert.deepEqual(setupRoomSequence(state),['general','bathroom','custom']);
 assert.throws(()=>createRoomSetupDraft(state,'room-laundry'));
});
test('existing weekday frequencies are preserved and stale saved schedules require review',()=>{
 const state=board();state.tasks[0].recurrence={kind:'fixed-weekday',day:3};const draft=createRoomSetupDraft(state,'bathroom');
 assert.deepEqual(resumeRoomSetupDraft(draft,state),draft);state.tasks[0].recurrence.day=5;assert.throws(()=>resumeRoomSetupDraft(draft,state));
});
test('unsupported frequency defaults and unsafe edits are rejected rather than invented',()=>{
 for(const value of [{kind:'months',every:1},{kind:'days',every:0},{kind:'weeks',every:1.5},{kind:'event'},null])assert.throws(()=>validateSetupFrequency(value));
 const draft=createRoomSetupDraft(board(),'bathroom');assert.throws(()=>editRoomSetupTask(draft,'task:t',{points:50}));assert.throws(()=>editRoomSetupTask(draft,'task:t',{estimatedMinutes:-1}));
 const state=board();state.tasks=[];assert.throws(()=>resumeRoomSetupDraft(draft,state));
});
test('area rename preserves stable assignment; deletion unassigns without touching task or room data',()=>{
 const state=board(),before=structuredClone(state);let areas=createRoomArea([],{id:'a',roomId:'bathroom',name:'Sink area'});
 const assignments=assignRoomArea([],areas,{id:'map',taskId:'t',roomId:'bathroom',areaId:'a'});
 areas=renameRoomArea(areas,'a','Bath area');assert.equal(roomAreaMatches(state.tasks[0],assignments,areas,'a'),true);
 const removed=deleteRoomArea(areas,assignments,'a','2026-10-13T12:00:00Z');assert.equal(removed.assignments[0].areaId,null);assert.equal(roomAreaMatches(state.tasks[0],removed.assignments,removed.areas,'unassigned'),true);
 assert.deepEqual(state,before);assert.equal(assignments[0].areaId,'a');assert.equal(areas[0].deletedAt,undefined);
 assert.throws(()=>assignRoomArea([],areas,{id:'map',taskId:'t',roomId:'general',areaId:'a'}));
});
test('only confirmed additions create tasks; existing tasks and calendar settings stay intact',()=>{
 const state=board(),before=structuredClone(state),draft=createRoomSetupDraft(state,'bathroom'),choice=draft.tasks.find(task=>task.referenceKey==='sink');
 const setup={id:'personal-setup',draft},entryIds=['task:t',choice.id];
 assert.throws(()=>previewRoomSetupAdditions(state,setup,entryIds));assert.deepEqual(state,before);
 const preview=previewRoomSetupAdditions(state,setup,entryIds,{[choice.id]:'2026-10-20'});assert.deepEqual(state,before);
 const first=applyRoomSetupAdditions(state,preview,new Date('2026-10-13T12:00:00Z'));
 assert.equal(first.added.filter(task=>!task.parentId).length,1);assert.equal(first.reused.length,1);assert.deepEqual(state.tasks[0],before.tasks[0]);assert.deepEqual(state.calendarSettings,before.calendarSettings);
 assert.equal(first.added[0].nextDue,new Date('2026-10-20T00:00:00').toISOString());assert.equal(first.added[0].doingNow,undefined);assert.ok(first.added[0].order>state.tasks[0].order);
 const second=applyRoomSetupAdditions(state,preview);assert.equal(second.added.length,0);assert.equal(second.reused.length,2);
 const otherSetup={id:'another-member-setup',draft},otherPreview=previewRoomSetupAdditions(state,otherSetup,[choice.id]);assert.equal(otherPreview.entries[0].taskId,first.added[0].id);assert.equal(applyRoomSetupAdditions(state,otherPreview).added.length,0);
});
test('As needed additions have no recurrence or inferred date; invalid preview is atomic',()=>{
 const state=board(),draft=createRoomSetupDraft(state,'bathroom'),choice=draft.tasks.find(task=>task.referenceKey==='sink');choice.frequency={kind:'as-needed'};
 const preview=previewRoomSetupAdditions(state,{id:'setup',draft},[choice.id]);const result=applyRoomSetupAdditions(state,preview);assert.equal(result.added[0].recurrence,undefined);assert.equal(result.added[0].nextDue,undefined);
 const failed=board(),before=structuredClone(failed),plan=previewRoomSetupAdditions(failed,{id:'other',draft},[choice.id]);plan.entries.push({existing:true,taskId:'missing',before:'{}'});assert.throws(()=>applyRoomSetupAdditions(failed,plan));assert.deepEqual(failed,before);
});
