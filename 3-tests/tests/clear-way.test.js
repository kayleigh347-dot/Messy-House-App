import test from 'node:test';
import assert from 'node:assert/strict';
import {standardPreparationRoutine,previewPreparationTasks,applyPreparationTasks,createPreparationFollowUp,removeUntouchedPreparationFollowUp} from '../clear-way.js';
import {initialRoomConfiguration,applyRoomConfigurationChanges} from '../room-configuration.js';
import {normalize} from '../v2-state.js';
import {merge} from '../sync-state.js';
import {validateBackup} from '../backup-tools.js';
const state=()=>({rooms:[{id:'room-bathroom',name:'Bathroom',order:0}],tasks:[{id:'existing',text:'Keep existing',roomId:'room-bathroom',area:'Bathroom',done:false,order:17,doingNow:true,doingNowOrder:5}],side:[],wins:[],rewards:[],current:null});
const routine=()=>standardPreparationRoutine('room-bathroom');
test('preview is read-only; additions share one task identity in room and Doing Now and preserve old order',()=>{
 const board=state(),before=structuredClone(board),steps=routine().steps.map(step=>({stepId:step.id})),preview=previewPreparationTasks(board,routine(),steps);assert.deepEqual(board,before);
 const result=applyPreparationTasks(board,preview,new Date('2026-10-13T12:00:00Z'));assert.equal(result.added.length,4);assert.deepEqual(board.tasks[0],before.tasks[0]);assert.deepEqual(board.wins,[]);assert.deepEqual(board.rewards,[]);
 assert.ok(result.added.every(task=>task.roomId==='room-bathroom'&&task.doingNow&&!task.recurrence));assert.deepEqual(result.added.map(task=>task.doingNowOrder),[6,7,8,9]);assert.equal(board.tasks.filter(task=>task.text.startsWith('Sort')).length,0);
 const replay=previewPreparationTasks(board,routine(),steps);assert.equal(applyPreparationTasks(board,replay).added.length,0);assert.equal(board.tasks.length,5);
});
test('simultaneous devices merge stable preparation identities without duplicate tasks',()=>{
 const base=normalize(state()),left=structuredClone(base),right=structuredClone(base),selection=[{stepId:'floor'}];applyPreparationTasks(left,previewPreparationTasks(left,routine(),selection));applyPreparationTasks(right,previewPreparationTasks(right,routine(),selection));const result=merge(base,left,right);assert.equal(result.tasks.filter(task=>task.clearWay).length,1);assert.equal(result.tasks[0].order,17);
});
test('a stale concurrent creation cannot erase a completed or edited canonical preparation task',()=>{
 const base=normalize(state()),left=structuredClone(base),right=structuredClone(base),selection=[{stepId:'floor'}];applyPreparationTasks(left,previewPreparationTasks(left,routine(),selection));const source=applyPreparationTasks(right,previewPreparationTasks(right,routine(),selection)).added[0];source.notes='Keep this later edit';source.done=true;source.completedAt='2026-10-13T12:00:00Z';createPreparationFollowUp(right,source);const result=merge(base,left,right),saved=result.tasks.find(task=>task.id===source.id);assert.equal(saved.done,true);assert.equal(saved.notes,'Keep this later edit');assert.equal(result.tasks.filter(task=>task.clearWaySourceTaskId===source.id).length,1);
});
test('pickup completion creates separate area/category follow-ups only once, with existing priority values',()=>{
 const board=state(),selections=[{stepId:'important',area:{key:'alice:area-a',name:'Sink'}},{stepId:'floor',area:{key:'alice:area-b',name:'Floor'}}],result=applyPreparationTasks(board,previewPreparationTasks(board,routine(),selections));
 for(const task of result.added)task.done=true;const important=createPreparationFollowUp(board,result.added[0],'2026-10-13T12:00:00Z'),floor=createPreparationFollowUp(board,result.added[1],'2026-10-13T12:00:00Z');
 assert.equal(important.text,'Sort important items — Sink');assert.equal(important.priority,'high');assert.equal(floor.text,'Sort collected floor items — Floor');assert.equal(floor.priority,'mid');assert.notEqual(important.id,floor.id);assert.equal(important.doingNow,undefined);assert.equal(floor.doingNow,undefined);assert.equal(createPreparationFollowUp(board,result.added[0]),null);assert.deepEqual(board.wins,[]);assert.deepEqual(board.rewards,[]);
});
test('Undo removes only an untouched automatic sorting task and preserves edited/started/completed work',()=>{
 for(const action of ['untouched','edited','reordered','started','completed','doing']){
  const board=state(),source=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];source.done=true;const follow=createPreparationFollowUp(board,source);
  if(action==='edited')follow.text='Changed';if(action==='reordered')follow.order=0;if(action==='started')board.current=follow.id;if(action==='completed')follow.done=true;if(action==='doing')follow.doingNow=true;
  source.done=false;assert.equal(removeUntouchedPreparationFollowUp(board,source),action==='untouched');assert.equal(board.tasks.some(task=>task.id===follow.id),action!=='untouched');
 }
});
test('redo after untouched Undo can restore a follow-up; household deletion is not silently undone',()=>{
 const board=state(),source=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];source.done=true;const follow=createPreparationFollowUp(board,source);source.done=false;removeUntouchedPreparationFollowUp(board,source);source.done=true;assert.ok(createPreparationFollowUp(board,source));board.tasks=board.tasks.filter(task=>task.id!==follow.id);assert.equal(createPreparationFollowUp(board,source),null);
});
test('completed preparation can be deliberately added again without reopening history',()=>{
 const board=state(),source=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];source.done=true;board.wins.push({id:'win-'+source.id,taskId:source.id,at:'2026-10-13T12:00:00Z'});const original=source.id;board.tasks=board.tasks.filter(task=>task.id!==original);const next=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];assert.notEqual(next.id,original);assert.equal(board.wins[0].taskId,original);
});
test('instance identities outlive removed tasks and pruned wins without reusing rewarded IDs',()=>{
 const board=state(),first=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];board.tasks=board.tasks.filter(task=>task.id!==first.id);board.wins=[];const second=applyPreparationTasks(board,previewPreparationTasks(board,routine(),[{stepId:'floor'}])).added[0];assert.notEqual(first.id,second.id);assert.equal(board.preparationInstances[0].generation,1);
});
test('personal variation or deletion cannot change shared definition or another account',()=>{
 const shared=routine(),before=structuredClone(shared),alice=initialRoomConfiguration('alice'),bob=initialRoomConfiguration('bob');
 const hidden=applyRoomConfigurationChanges(bob,[{collection:'routineVisibility',id:'hidden',values:{houseId:'home',roomId:shared.roomId,routineId:shared.id,hidden:true}}]);assert.equal(hidden.routineVisibility[0].hidden,true);assert.deepEqual(alice.routineVisibility,[]);assert.deepEqual(shared,before);
 const edited=applyRoomConfigurationChanges(bob,[{collection:'routineVariations',id:'variation',values:{houseId:'home',roomId:shared.roomId,baseRoutineId:shared.id,name:'My variation',steps:shared.steps.slice().reverse()}}]);assert.equal(edited.routineVariations.length,1);assert.deepEqual(alice.routineVariations,[]);assert.deepEqual(shared,before);
});
test('shared definitions survive board merge/backup and private variations remain outside board',()=>{
 const base=normalize(state()),left=structuredClone(base),right=structuredClone(base);left.preparationRoutines.push(routine());right.tasks[0].notes='Keep remote edit';const result=merge(base,left,right);assert.equal(result.preparationRoutines.length,1);assert.equal(result.tasks[0].notes,'Keep remote edit');validateBackup(result);assert.equal(result.routineVariations,undefined);
});
