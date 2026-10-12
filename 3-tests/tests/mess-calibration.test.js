import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,roomMess,roomMessTasks,setRoomMessLevel,DAY} from '../v2-state.js';
import {roomActiveTasks} from '../task-flow.js';
import {merge,empty} from '../sync-state.js';
import {householdScoreboard} from '../household.js';
const now=new Date('2026-10-12T12:00:00Z').getTime();
const task=(id,extra={})=>({id,text:id,roomId:'r',bucket:'now',created:new Date(now).toISOString(),...extra});
const board=tasks=>({rooms:[{id:'r',name:'Room'}],tasks,side:[],wins:[],settings:[],householdPeople:[]});

test('only actionable leaves count: parents, future families, paused tasks and sidequests contribute no mess',()=>{
 const state=board([task('parent',{messImpact:'big'}),task('child-a',{parentId:'parent'}),task('child-b',{parentId:'parent'}),task('normal'),task('future-parent',{nextDue:new Date(now+DAY).toISOString()}),task('future-child',{parentId:'future-parent'}),task('paused',{pausedAt:new Date(now).toISOString()}),task('side',{bucket:'side'}),task('duplicate-side')]);
 state.side=[{id:'duplicate-side'}];
 assert.deepEqual(roomMessTasks(state,'r',now).map(task=>task.id),['child-a','child-b','normal']);
 assert.equal(roomMess(state,'r',now).score,3);
 state.tasks[0].messImpact='none';assert.equal(roomMess(state,'r',now).score,3);
 state.tasks.find(task=>task.id==='child-a').done=true;assert.equal(roomMess(state,'r',now).score,2);
});

test('room Tasks includes due and Doing Now tasks, while future tasks stay in their recurring/calendar views',()=>{
 const future=new Date(now+DAY).toISOString(),state=board([task('due'),task('doing',{doingNow:true}),task('future',{nextDue:future}),task('future-normal',{dueDate:future}),task('paused',{pausedAt:new Date(now).toISOString()}),task('child',{parentId:'due'}),task('side',{bucket:'side'})]);
 const before=JSON.stringify(state);
 assert.deepEqual(roomActiveTasks(state,'r',now).map(task=>task.id),['due','doing']);
 assert.equal(JSON.stringify(state),before);
});

test('slider distributes the chosen mess across regular tasks and subtasks by their impact, with no parent contribution',()=>{
 const state=board([task('parent',{messImpact:'big'}),task('child-a',{parentId:'parent'}),task('child-b',{parentId:'parent'}),task('regular'),task('big',{messImpact:'big'}),task('none',{messImpact:'none'})]);
 const untouched=JSON.stringify(state.tasks);
 setRoomMessLevel(state,'r',20,now);
 assert.equal(JSON.stringify(state.tasks),untouched);
 assert.equal(roomMess(state,'r',now).percent,20);
 state.tasks.find(task=>task.id==='child-a').done=true;assert.equal(roomMess(state,'r',now).percent,16);
 state.tasks.find(task=>task.id==='big').done=true;assert.equal(roomMess(state,'r',now).percent,8);
 state.tasks.find(task=>task.id==='none').done=true;assert.equal(roomMess(state,'r',now).percent,8);
 state.tasks.forEach(task=>task.done=true);assert.equal(roomMess(state,'r',now).percent,0);
 state.tasks.find(task=>task.id==='regular').done=false;assert.equal(roomMess(state,'r',now).percent,4);
});

test('calibration survives reload and household merge and does not gain overdue weight overnight',()=>{
 const state=board([task('a',{dueDate:'2026-10-01T00:00:00Z'}),task('b')]);setRoomMessLevel(state,'r',30,now);
 state.tasks[0].done=true;state.tasks[0].completedAt=new Date(now).toISOString();
 assert.equal(roomMess(normalize(JSON.parse(JSON.stringify(state))),'r',now).percent,15);
 assert.equal(roomMess(merge(empty(),state,empty()),'r',now).percent,15);
 assert.equal(roomMess(state,'r',now+DAY).percent,15);
});

test('future/new tasks increase calibrated mess only when due; a zero calibration does not permanently hide new work',()=>{
 const state=board([task('a'),task('b')]);setRoomMessLevel(state,'r',20,now);
 state.tasks.push(task('later',{nextDue:new Date(now+DAY).toISOString()}));
 assert.equal(roomMess(state,'r',now).percent,20);assert.equal(roomMess(state,'r',now+DAY).percent,30);
 setRoomMessLevel(state,'r',0,now);assert.equal(roomMess(state,'r',now).percent,0);
 assert.equal(roomMess(state,'r',now+DAY).percent,7.1);
 delete state.rooms[0].messCalibration;assert.equal(roomMess(state,'r',now).calibrated,false);
 assert.throws(()=>setRoomMessLevel(state,'r',101,now));assert.throws(()=>setRoomMessLevel(state,'missing',20,now));
});

test('a parent auto-completes after its last subtask without additional mess or points',()=>{
 const state=board([task('parent',{messImpact:'big'}),task('a',{parentId:'parent',done:true,completedAt:new Date(now).toISOString()}),task('b',{parentId:'parent',done:true,completedAt:new Date(now).toISOString()})]);
 state.householdPeople=[{id:'person',name:'Person'}];state.wins=['a','b'].map(id=>({id:'win-'+id,taskId:id,text:id,at:new Date(now).toISOString(),completedBy:'person',points:1}));
 const next=normalize(state),parent=next.tasks.find(task=>task.id==='parent'),record=next.wins.find(win=>win.taskId==='parent');
 assert.equal(parent.done,true);assert.equal(record.points,0);assert.equal(record.aggregate,true);
 assert.equal(roomMess(next,'r',now).percent,0);assert.equal(householdScoreboard(next)[0].points,2);
});
