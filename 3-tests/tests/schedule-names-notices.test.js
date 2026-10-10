import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePerson,setDisplayName} from '../household.js';
import {displayPersonName} from '../completion-history.js';
import {activateDue,normalize} from '../v2-state.js';
import {taskNoticeForPerson} from '../task-flow.js';
import {merge,reconcileSync} from '../sync-state.js';
import {recurringScheduleTasks,setNextDue,nextDueDate,schedulePlan,unchangedScheduleTasks,scheduleSnapshot} from '../recurring-schedule.js';
const now=Date.parse('2026-10-10T12:00:00Z'),date='2026-10-12',recurrence={kind:'weeks',every:1};
function fixture(){return normalize({rooms:[{id:'r',name:'R'},{id:'s',name:'S'}],householdPeople:[{id:'k',name:'Kayleigh347'},{id:'a',name:'Andy'}],tasks:[{id:'a',text:'Litter',roomId:'r',assignedTo:'a',recurrence,scheduled:true,nextDue:'2026-10-09T00:00:00Z'},{id:'k',text:'Uniform',roomId:'s',assignedTo:'k',recurrence,scheduled:true,nextDue:'2026-10-09T00:00:00Z'},{id:'any',text:'Anyone task',roomId:'s',recurrence,scheduled:true,nextDue:'2026-10-09T00:00:00Z'}]})}
test('due activation alerts the assigned member once and never the device opener',()=>{
 const state=fixture();activateDue(state,now);
 assert.deepEqual(state.notifications.map(n=>[n.taskId,n.recipientId]),[['a','a'],['k','k']]);
 assert.deepEqual(state.notifications.filter(n=>taskNoticeForPerson(n,'k',state.tasks)).map(n=>n.taskId),['k']);
 activateDue(state,now);assert.equal(state.notifications.length,2);
 const old={id:'old',taskId:'a',recipientId:'k',createdBy:'k'};assert.equal(taskNoticeForPerson(old,'k',state.tasks),false);
 // Explicitly notifying another member is still allowed.
 assert.equal(taskNoticeForPerson({...old,createdBy:'a'},'k',state.tasks),true);
 state.tasks[1].done=true;assert.equal(taskNoticeForPerson(state.notifications[1],'k',state.tasks),false);
});
test('shared polling activates the correct notices and concurrent activations deduplicate',()=>{
 const base=fixture(),one=structuredClone(base),two=structuredClone(base);activateDue(one,now);activateDue(two,now);
 assert.equal(merge(base,one,two).notifications.length,2);
 const reconciled=reconcileSync(base,base,base);assert.equal(reconciled.notifications.length,2);assert.equal(reconciled.notifications[0].recipientId,'a');
});
test('chosen names survive email-based refresh, merge and backup round trips without changing points or assignments',()=>{
 const base=fixture();base.wins=[{id:'win',taskId:'old',at:'2026-10-10T10:00:00Z',completedBy:'k',completedByName:'Kayleigh347'}];
 const normalized=normalize(base),edited=structuredClone(normalized),history=structuredClone(normalized.wins),task=structuredClone(normalized.tasks[1]);
 assert.equal(setDisplayName(edited,{id:'k',email:'kayleigh347@example.test'},'  Kayleigh  '),true);
 ensurePerson(edited,{id:'k',email:'kayleigh347@example.test',name:'Kayleigh347'});
 const shared=JSON.parse(JSON.stringify(merge(base,edited,base))),person=shared.householdPeople.find(p=>p.id==='k');
 assert.equal(person.name,'Kayleigh');assert.equal(displayPersonName(person),'Kayleigh');assert.deepEqual(shared.wins,history);assert.deepEqual(shared.tasks[1],task);
 assert.equal(setDisplayName(shared,person,''),false);assert.equal(setDisplayName(shared,person,'x'.repeat(61)),false);assert.equal(setDisplayName(shared,{id:'local-device'},'Name'),false);
});
test('manual date changes preserve repeats, assignments, importance, pause and history; filter selects only recurring parents',()=>{
 const state=fixture();state.tasks.push({id:'child',parentId:'a',roomId:'r',recurrence},{id:'done',done:true,roomId:'r',recurrence},{id:'ordinary',roomId:'r'});
 assert.deepEqual(recurringScheduleTasks(state,'r').map(t=>t.id),['a']);
 const t=state.tasks[0];t.importantWhenOverdue=true;t.lastDone='2026-10-01T10:00:00Z';t.pausedAt='2026-10-08T10:00:00Z';
 const before=scheduleSnapshot(t),others=structuredClone(state.tasks.slice(1));setNextDue(t,date,now);
 assert.equal(nextDueDate(t),date);assert.equal(t.scheduled,true);assert.deepEqual(t.recurrence,recurrence);assert.equal(t.assignedTo,'a');assert.equal(t.lastDone,'2026-10-01T10:00:00Z');assert.equal(t.pausedAt,before.pausedAt);assert.equal(t.importantWhenOverdue,true);assert.deepEqual(state.tasks.slice(1),others);
 setNextDue(t,'2026-10-09',now);assert.equal(t.scheduled,false);assert.throws(()=>setNextDue(t,'2026-02-30',now));
});
test('confirmation keeps tasks changed on another device and date changes can be undone through shared sync',()=>{
 const base=fixture(),edited=structuredClone(base),plan=schedulePlan(edited.tasks);edited.tasks[0].nextDue='2026-10-16T00:00:00Z';edited.tasks[1].done=true;
 assert.deepEqual(unchangedScheduleTasks(edited,plan).map(t=>t.id),['any']);
 const before=scheduleSnapshot(edited.tasks[2]);setNextDue(edited.tasks[2],date,now);
 const synced=merge(base,edited,base);assert.equal(nextDueDate(synced.tasks[2]),date);
 for(const k of Object.keys(scheduleSnapshot(synced.tasks[2])))delete synced.tasks[2][k];Object.assign(synced.tasks[2],before);
 assert.deepEqual(scheduleSnapshot(synced.tasks[2]),before);
});
