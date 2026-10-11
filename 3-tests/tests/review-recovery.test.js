import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafeStorage} from '../safe-storage.js';
import {validateBackup,backupPreview} from '../backup-tools.js';
import {merge,empty} from '../sync-state.js';
import {normalize,activateDue} from '../v2-state.js';
import {taskTiming,matchesTask,repeatedTaskGroups,archiveReviewedTask} from '../review-tools.js';
import {activeTask} from '../task-flow.js';
const board=()=>({schemaVersion:7,tasks:[{id:'a',text:'Wash',roomId:'r',recurrence:{kind:'weeks',every:1},nextDue:'2026-10-11T12:00:00Z',notes:'Keep notes'}],side:[],wins:[],rooms:[{id:'r',name:'Custom room'}],templates:[],settings:[],householdPeople:[]});
test('invalid storage preserves exact original through normal writes until explicit recovery',()=>{
 const values=new Map([['board','{broken']]);const storage=createSafeStorage(()=>({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}));
 assert.deepEqual(storage.readJSON('board',board()),board());assert.equal(storage.setItem('board','{}'),false);assert.equal(values.get('board'),'{broken');assert.deepEqual(storage.originals(),{board:'{broken'});
 storage.allowRecovery();assert.equal(storage.setItem('board',JSON.stringify(board())),true);assert.equal(storage.issues().length,0);
});
test('unavailable store and quota failure keep new board exportable and retry saves it',()=>{
 let blocked=true;const values=new Map();const storage=createSafeStorage(()=>{if(blocked)throw Error('Unavailable');return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}});
 assert.equal(storage.getItem('board'),null);assert.equal(storage.setItem('board',JSON.stringify(board())),false);assert.deepEqual(JSON.parse(storage.getItem('board')),board());blocked=false;assert.equal(storage.retry(),true);assert.equal(values.get('board'),JSON.stringify(board()));
 let full=true;const quota=createSafeStorage(()=>({getItem:()=>null,setItem(){if(full)throw Error('Quota exceeded')}}));assert.equal(quota.setItem('board','pending'),false);assert.equal(quota.getItem('board'),'pending');full=false;assert.equal(quota.retry(),true);
});
test('backup validation rejects malformed versions, duplicate IDs, references and recurrence without mutations',()=>{
 const original=board();validateBackup(original);
 for(const change of [b=>b.schemaVersion=99,b=>b.tasks.push({...b.tasks[0]}),b=>b.tasks[0].parentId='missing',b=>b.tasks[0].roomId='missing',b=>b.tasks[0].recurrence={kind:'weeks',every:0},b=>b.tasks.push({id:'b',text:'Child',parentId:'a'})&& (b.tasks[0].parentId='b'),b=>b.rewards=[{id:'bad',prizeIndex:-1}]]){const bad=structuredClone(original);change(bad);assert.throws(()=>validateBackup(bad))}
 assert.deepEqual(original,board());
});
test('preview describes merge precedence, round trip retains IDs, notes and recurrence',()=>{
 const current=board(),incoming=board();current.tasks.push({id:'keep',text:'Keep me',roomId:'r'});incoming.tasks[0].text='Backup version';incoming.tasks.push({id:'new',text:'New',roomId:'r'});
 assert.deepEqual(backupPreview(current,incoming).find(x=>x.key==='tasks'),{key:'tasks',incoming:2,matching:1,retained:1});assert.equal(current.tasks[0].text,'Wash');
 const combined=merge(empty(),structuredClone(incoming),structuredClone(current));assert.equal(combined.tasks.find(t=>t.id==='a').text,'Backup version');assert(combined.tasks.some(t=>t.id==='keep'));assert(combined.tasks.some(t=>t.id==='new'));
 const round=JSON.parse(JSON.stringify(combined));validateBackup(round);assert.deepEqual(round.tasks,combined.tasks);assert.equal(round.tasks[0].notes,'Keep notes');assert.deepEqual(round.tasks[0].recurrence,{kind:'weeks',every:1});
});
test('filters distinguish due days and search reusable subtasks without hiding parent',()=>{
 const now=new Date('2026-10-11T12:00:00Z'),t=board().tasks[0];assert.equal(taskTiming(t,now),'today');assert.equal(taskTiming({...t,nextDue:'2026-10-10T12:00:00Z'},now),'overdue');assert.equal(taskTiming({...t,nextDue:'2026-10-12T12:00:00Z'},now),'upcoming');assert.equal(taskTiming({text:'No date'},now),'unscheduled');
 const template={id:'p',text:'Parent'};assert(matchesTask(template,{query:'step'},[template,{id:'c',text:'Special step',parentTemplateId:'p'}],now));assert(!matchesTask({...t,nextDue:'2026-10-12T12:00:00Z'},{timing:'active'},[],now));
});
test('individual archive preserves recurrence/history and survives activation until restored',()=>{
 const b=board();b.tasks.push({...b.tasks[0],id:'other'},{id:'child',text:'Step',parentId:'a',roomId:'r'});b.wins.push({id:'win',taskId:'a',text:'Wash',at:'2026-10-01T00:00:00Z'});assert.equal(repeatedTaskGroups(b).length,1);
 const recurrence=structuredClone(b.tasks[0].recurrence);archiveReviewedTask(b,'a');activateDue(b);assert.equal(activeTask(b.tasks[0]),false);assert.equal(b.tasks[1].archived,undefined);assert.equal(b.tasks[2].archived,true);assert.deepEqual(b.tasks[0].recurrence,recurrence);assert.equal(b.wins.length,1);archiveReviewedTask(b,'a',false);assert.equal(b.tasks[0].archived,undefined);assert.equal(b.tasks[2].archived,undefined);
});
test('normalisation unifies known room aliases while preserving custom rooms and IDs',()=>{
 const b=board();b.rooms.push({id:'room-entrance',name:'Entrance'},{id:'room-craft',name:'Craft & Storage Room / Small Loft'});b.tasks.push({id:'entrance',text:'Sweep',roomId:'room-entrance',area:'Entrance'});const n=normalize(b);assert.equal(n.rooms.find(r=>r.id==='room-entrance').name,'Downstairs Entrance');assert.equal(n.rooms.find(r=>r.id==='room-craft').name,'Craft & Storage Room');assert.equal(n.tasks.find(t=>t.id==='entrance').area,'Downstairs Entrance');assert.equal(n.rooms.find(r=>r.id==='r').name,'Custom room');
});
