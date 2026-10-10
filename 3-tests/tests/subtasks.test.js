import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nestTask,detachTask,descendants,repeatChildren,normalizeSubtasks,subtasksForDisplay} from '../subtasks.js';
import {addToDoingNow,doingNowTasks,captureCompletion,undoCompletion} from '../task-flow.js';
import {completionRecord,taskStats} from '../task-stats.js';
import {scheduleNext} from '../v2-state.js';
import {householdScoreboard} from '../household.js';
const make=id=>({id,text:id,roomId:'r',area:'Room',order:0,bucket:'now'});
test('completed subtasks stay below unfinished siblings; Undo restores their original position',()=>{
 const items=[{...make('a'),parentId:'p',order:0,done:true},{...make('b'),parentId:'p',order:1},{...make('c'),parentId:'p',order:2,done:true},{...make('other'),parentId:'q'}];
 assert.deepEqual(subtasksForDisplay(items,'p').map(task=>task.id),['b','a','c']);items[0].done=false;
 assert.deepEqual(subtasksForDisplay(items,'p').map(task=>task.id),['a','b','c']);assert.equal(items[0].order,0);assert.equal(items[0].parentId,'p');
});
test('nest, unnest, prevent cycles, preserve children and main-only Doing Now',()=>{
 const items=['p','c','g'].map(make);items[1].doingNow=true;assert.ok(nestTask(items,'c','p'));assert.ok(nestTask(items,'g','c'));assert.equal(nestTask(items,'p','g'),false);assert.equal(addToDoingNow(items[1],items),false);assert.ok(addToDoingNow(items[0],items));assert.deepEqual(doingNowTasks(items).map(t=>t.id),['p']);assert.equal(descendants(items,'p').length,2);assert.ok(detachTask(items,'c'));assert.equal(items[2].parentId,'c');items.splice(1,1);normalizeSubtasks(items);assert.equal(items[1].parentId,undefined);
});
test('real completion credits only subtasks; parent auto-completes, recurrence and undo preserve points',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),snippet=source.slice(source.indexOf('function win('),source.indexOf('$("#unlockOpen").onclick='));
 const p={...make('p'),recurrence:{kind:'days',every:3}},c={...make('c'),parentId:'p'},state={tasks:[p,c],side:[],wins:[],rewards:[],rooms:[{id:'r',name:'Room'}],householdPeople:[{id:'person',name:'Person'}]},now=new Date().toISOString();let saves=0;
 const finish=new Function('st','iso','completionRecord','rewardProgress','scheduleNext','repeatChildren','descendants','changed','celebrate','roomMess','notifyCompanionTaskCompleted','currentActor','captureCompletion','featureToast','prizes',snippet+';return finish')(state,()=>now,completionRecord,()=>({earned:0,remaining:1}),scheduleNext,repeatChildren,descendants,()=>saves++,()=>{},()=>({state:'CLEAN'}),()=>{},()=>({id:'person',name:'Person'}),captureCompletion,()=>{},[]);
 finish(p,'task');assert.equal(p.done,true);assert.equal(c.done,true);finish(c,'task');finish(c,'task');finish(p,'task');assert.equal(saves,2);assert.equal(state.wins.length,2);assert.equal(taskStats(state).total,1);assert.equal(householdScoreboard(state)[0].points,1);const next=state.tasks.find(t=>t.id===p.completionUndo.nextTaskId);assert.equal(descendants(state.tasks,next.id).length,1);assert.equal(descendants(state.tasks,next.id)[0].done,false);undoCompletion(state,c);assert.equal(p.done,false);assert.equal(c.done,false);assert.equal(state.wins.length,0);assert.equal(state.tasks.length,2);
});
