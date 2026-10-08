import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../v2-state.js';
import {taskStats} from '../task-stats.js';
import {householdScoreboard} from '../household.js';
test('confirmed legacy completions are credited to Kayleigh and totals reconcile',()=>{
 const state=normalize({tasks:[],side:[],householdPeople:[{id:'k',name:'Kayleigh'},{id:'a',name:'Andy'}],wins:[{id:'old',text:'Bins',at:'2026-09-01'},{id:'device',text:'Clean',at:'2026-09-25',completedBy:'local-device'},{id:'new',text:'Dishes',at:'2026-10-01',completedBy:'k'}]});
 assert.equal(taskStats(state).total,3);assert.equal(taskStats(state,{personId:'k'}).total,3);assert.equal(taskStats(state,{personId:'a'}).total,0);
 assert.deepEqual(householdScoreboard(state).map(p=>p.points),[3,0]);assert.deepEqual(normalize(state),state);
});
test('never replaces an existing person or guesses an ambiguous Kayleigh',()=>{
 const state=normalize({tasks:[],side:[],householdPeople:[{id:'k',name:'Kayleigh'}],wins:[{id:'a',text:'Task',completedBy:'a'},{id:'later',text:'Task',at:'2026-10-03',completedBy:'local-device'}]});
 assert.equal(state.wins[0].completedBy,'a');assert.equal(state.wins[1].completedBy,'k');
 const pending=normalize({...state,householdPeople:[],wins:[{id:'old',text:'Task'}]});assert.equal(taskStats(pending).unattributed,1);
});
test('scoreboard and stats both deduplicate the same completion IDs',()=>{
 const win={id:'w',text:'Bins',completedBy:'k'};
 const state=normalize({tasks:[],side:[],householdPeople:[{id:'k',name:'Kayleigh'}],wins:[win,win]});
 assert.equal(taskStats(state).total,1);assert.equal(householdScoreboard(state)[0].points,1);
});
