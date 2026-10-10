import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,DAY,roomMess} from '../v2-state.js';
import {merge} from '../sync-state.js';
import {taskStats} from '../task-stats.js';
import {completionGroups,deleteCompletionGroup,completionPoints} from '../completion-history.js';
import {householdScoreboard} from '../household.js';
import {undoCompletion,activeTask} from '../task-flow.js';
import {sidequestTabs,sidequestMatches} from '../sidequest-tabs.js';
const now=Date.now(),at=days=>new Date(now-days*DAY).toISOString();
function family(){return normalize({rooms:[{id:'r',name:'Room'}],tasks:[{id:'parent',text:'Reset room',roomId:'r',created:at(2),recurrence:{kind:'days',every:7},nextDue:at(0)},{id:'one',text:'Dust',roomId:'r',parentId:'parent',created:at(2)},{id:'two',text:'Vacuum',roomId:'r',parentId:'parent',created:at(2)}],side:[],wins:[],householdPeople:[{id:'k',name:'Kayleigh'},{id:'a',name:'Andy'}]})}
function done(state,id,person){const task=state.tasks.find(task=>task.id===id);task.done=true;task.completedAt=at(0);state.wins.push({id:'win-'+id,taskId:id,text:task.text,roomId:'r',at:task.completedAt,completedBy:person,completedByName:person==='k'?'Kayleigh':'Andy'})}
test('frequency reports actual gaps between completions, and one completion has no invented interval',()=>{
 const state=normalize({tasks:[],side:[],wins:[1,8,18].map((days,index)=>({id:'w'+index,text:'Sweep',roomId:'r',at:at(days),recurrence:{kind:'days',every:7}}))});
 assert.equal(taskStats(state,{now,days:28}).rows[0].averageDaysBetween,8.5);
 assert.equal(taskStats({...state,wins:[state.wins[0]]},{now,days:28}).rows[0].averageDaysBetween,null);
});
test('concurrent subtask completions settle the main task once without giving a parent point',()=>{
 const base=family(),left=structuredClone(base),right=structuredClone(base);done(left,'one','k');done(right,'two','a');
 const state=merge(base,left,right),parent=state.tasks.find(task=>task.id==='parent');assert.equal(parent.done,true);assert.equal(state.wins.length,3);assert.equal(state.wins.filter(completionPoints).length,2);
 assert.deepEqual(householdScoreboard(state).map(person=>[person.name,person.points]).sort(),[['Andy',1],['Kayleigh',1]]);
 const next=state.tasks.find(task=>task.id===parent.completionUndo.nextTaskId),children=state.tasks.filter(task=>task.parentId===next.id);assert.equal(children.length,2);assert.ok(children.every(task=>!activeTask(task,now)));assert.equal(roomMess(state,'r',now).score,0);
 assert.equal(normalize(state).wins.length,3);assert.equal(normalize(state).tasks.length,6);
 const mine=completionGroups(state,{personId:'k'});assert.equal(mine.length,1);assert.equal(mine[0].text,'Reset room');assert.deepEqual(mine[0].children.map(win=>win.text),['Dust']);
 const everyone=completionGroups(state);assert.equal(everyone.length,1);assert.deepEqual(everyone[0].children.map(win=>win.completedBy).sort(),['a','k']);
 assert.equal(taskStats(state,{now:now+1000,days:28}).total,2);
});
test('deleting a grouped completion removes its points and survives sync while keeping the next occurrence',()=>{
 const original=family();done(original,'one','k');done(original,'two','a');const base=normalize(original),edited=structuredClone(base),nextId=edited.tasks.find(task=>task.id==='parent').completionUndo.nextTaskId;
 deleteCompletionGroup(edited,completionGroups(edited,{personId:'k'})[0]);const synced=merge(base,edited,base);
 assert.equal(synced.wins.length,0);assert.equal(synced.tasks.length,3);assert.ok(synced.tasks.some(task=>task.id===nextId));assert.ok(householdScoreboard(synced).every(person=>person.points===0));
});
test('undo reopens the parent and final subtask; a completed next occurrence cannot be erased by undo',()=>{
 const initial=family();done(initial,'one','k');done(initial,'two','a');let state=normalize(initial),parent=state.tasks.find(task=>task.id==='parent');
 // Test child wins use the ordinary default win ID undo path.
 assert.equal(undoCompletion(state,parent),true);state=normalize(state);assert.equal(state.tasks.find(task=>task.id==='parent').done,false);assert.equal(state.tasks.filter(task=>task.parentId==='parent'&&!task.done).length,1);assert.equal(state.wins.filter(completionPoints).length,1);
 const fresh=family();done(fresh,'one','k');done(fresh,'two','a');const completed=normalize(fresh),root=completed.tasks.find(task=>task.id==='parent'),next=completed.tasks.find(task=>task.id===root.completionUndo.nextTaskId);next.done=true;
 assert.equal(undoCompletion(completed,root),false);assert.equal(next.done,true);assert.equal(root.done,true);
});
test('custom sidequest tabs and simultaneous note replies round-trip through backup and shared sync',()=>{
 const base=family();base.notes=[{id:'note',text:'Parcel is here',createdAt:at(0)}];const left=structuredClone(base),right=structuredClone(base);left.sideTabs.push({id:'garden',name:'Garden'});right.sideTabs.push({id:'craft',name:'Craft plans'});left.notes.push({id:'reply-k',parentId:'note',text:'Thanks',createdAt:at(0)});right.notes.push({id:'reply-a',parentId:'note',text:'I will collect it',createdAt:at(0)});
 const synced=normalize(JSON.parse(JSON.stringify(merge(base,left,right))));assert.deepEqual(sidequestTabs(synced).map(tab=>tab.name).sort(),['Craft plans','Garden','Hobby / craft','Organisation']);assert.equal(synced.notes.filter(note=>note.parentId==='note').length,2);assert.equal(sidequestMatches({type:'garden'},'garden'),true);assert.equal(sidequestMatches({type:'garden'},'hobby'),false);
});

test('calendar shows each next activation once and scheduling previews retain other tasks',async()=>{
 const {upcomingCalendarEntries,scheduledCalendarState,calendarRoomEntries}=await import('../house-calendar.js');
 const state={rooms:[{id:'r'},{id:'s'}],appointments:[{date:'2026-10-15',text:'Visit'}],errands:[],tasks:[
 {id:'a',roomId:'r',text:'Dust',recurrence:{kind:'days',every:2},nextDue:'2026-10-12T12:00:00Z',scheduled:true},
 {id:'b',roomId:'r',text:'Windows',recurrence:{kind:'days',every:7},nextDue:'2026-10-15T12:00:00Z'},
 {id:'c',roomId:'s',text:'Laundry',recurrence:{kind:'days',every:7},nextDue:'2026-10-15T12:00:00Z'},
 {id:'d',roomId:'r',text:'Child',parentId:'a',nextDue:'2026-10-12T12:00:00Z',recurrence:{kind:'days',every:2}},
 {id:'e',roomId:'r',text:'Done',done:true,recurrence:{kind:'days',every:2},nextDue:'2026-10-12T12:00:00Z'},
 {id:'f',roomId:'r',text:'Paused',pausedAt:'2026-10-09',recurrence:{kind:'days',every:2},nextDue:'2026-10-12T12:00:00Z'}]};
 const before=structuredClone(state),entries=upcomingCalendarEntries(state);
 assert.deepEqual(entries.filter(e=>e.type==='recurring').map(e=>[e.id,e.date]),[['a','2026-10-12'],['b','2026-10-15'],['c','2026-10-15']]);
 assert.equal(calendarRoomEntries(entries,'r').filter(e=>e.date==='2026-10-12').length,1);
 const preview=upcomingCalendarEntries(scheduledCalendarState(state,[{id:'a',date:'2026-10-15T12:00:00Z'}]));
 assert.equal(preview.filter(e=>e.date==='2026-10-15').length,4);assert.deepEqual(state,before);
});

test('reusable additions prevent duplicate active families in one room and keep completed history',async()=>{
 const {addSavedTasks,activeSavedTasks,removeSavedTasks,deleteReusable}=await import('../task-extras.js');
 const state={rooms:[{id:'r',name:'R'},{id:'s',name:'S'}],tasks:[],templates:[{id:'a',roomId:'r',text:'Dust'},{id:'b',roomId:'r',text:' dust '},{id:'child',roomId:'r',text:'Top shelf',parentTemplateId:'a'},{id:'c',roomId:'s',text:'Dust'}]};let id=0;
 assert.equal(addSavedTasks(state,['a','b','c'],()=>`x${++id}`),3);assert.equal(addSavedTasks(state,['a']),0);
 assert.equal(activeSavedTasks(state,state.templates[0]).length,1);assert.equal(removeSavedTasks(state,state.templates[0]),1);assert.equal(state.tasks.length,1);
 assert.equal(addSavedTasks(state,['a'],()=>`x${++id}`),2);state.tasks.filter(t=>t.roomId==='r').forEach(t=>t.done=true);assert.equal(addSavedTasks(state,['a'],()=>`x${++id}`),2);
 deleteReusable(state,state.templates[0]);assert.equal(state.templates.some(t=>t.id==='child'),false);
});

test('importing a cleaned backup removes only named unfinished duplicates and preserves newer completions',async()=>{
 const {applyBackupCleanup}=await import('../task-extras.js');
 const state={tasks:[{id:'keep',text:'Dust',roomId:'r'},{id:'remove',text:'Dust',roomId:'r'},{id:'child',text:'Shelf',roomId:'r',parentId:'remove'},{id:'done',text:'Dust',roomId:'r',done:true},{id:'other',text:'Dust',roomId:'s'}],wins:[{id:'w',text:'Dust',taskId:'done'}],current:'remove'};
 const wins=structuredClone(state.wins);
 assert.equal(applyBackupCleanup(state,{version:1,replacements:{remove:'keep',done:'keep',other:'keep'}}),1);
 assert.equal(state.tasks.find(t=>t.id==='child').parentId,'keep');assert.equal(state.current,'keep');assert.deepEqual(state.wins,wins);
 assert.ok(state.tasks.some(t=>t.id==='done'));assert.ok(state.tasks.some(t=>t.id==='other'));assert.equal(applyBackupCleanup(state,{version:1,replacements:{remove:'keep'}}),0);
});

test('cleaned backup test removal requires exact IDs and test-labelled titles and is repeatable',async()=>{
 const {applyBackupTestCleanup}=await import('../task-extras.js');
 const state={tasks:[{id:'test',text:'Test: wipe counter',done:true},{id:'real',text:'Wipe counter'},{id:'unlisted',text:'Test'}],wins:[{id:'test-win',text:'Test: wipe counter'},{id:'win',text:'Wipe counter'}],notifications:[{id:'test-note',text:'Test'}],current:'test'};
 const cleanup={version:1,testEntries:{tasks:['test','real'],wins:['test-win','win'],notifications:['test-note']}};
 assert.equal(applyBackupTestCleanup(state,cleanup),3);assert.deepEqual(state.tasks.map(t=>t.id),['real','unlisted']);assert.deepEqual(state.wins.map(t=>t.id),['win']);assert.equal(state.current,null);
 assert.equal(applyBackupTestCleanup(state,cleanup),0);
});
