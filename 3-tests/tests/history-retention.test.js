import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveOldCompletions,creditLegacyCompletions} from '../completion-history.js';
import {householdScoreboard} from '../household.js';
import {rewardProgress} from '../rewards.js';
import {taskStats} from '../task-stats.js';
import {periodStart} from '../periods.js';

test('Kayleigh347 receives previously unrecorded completions without changing Andy’s',()=>{
 const state={householdPeople:[{id:'k',name:'Kayleigh347'},{id:'a',name:'Andy'}],wins:[{id:'old',text:'Clean',at:'2026-09-01T12:00:00Z'},{id:'local',text:'Cook',at:'2026-10-05T12:00:00Z',completedBy:'local-device'},{id:'andy',text:'Dishes',at:'2026-10-05T13:00:00Z',completedBy:'a'}]};
 assert.equal(creditLegacyCompletions(state),true);
 assert.deepEqual(state.wins.map(w=>w.completedBy),['k','k','a']);
 assert.equal(creditLegacyCompletions(state),false);
});

test('older individual records shrink to monthly totals while scores remain',()=>{
 const now=Date.parse('2026-10-07T12:00:00Z'),old='2026-06-01T12:00:00Z',recent='2026-10-06T12:00:00Z';
 const state={tasks:[{id:'old',text:'Old',done:true,completedAt:old},{id:'recent',text:'Recent',done:true,completedAt:recent}],side:[],wins:[{id:'win-old',taskId:'old',text:'Old',at:old,roomId:'room-kitchen',completedBy:'k',completedByName:'Kayleigh'},{id:'win-recent',taskId:'recent',text:'Recent',at:recent,roomId:'room-kitchen',completedBy:'k',completedByName:'Kayleigh'}],householdPeople:[{id:'k',name:'Kayleigh'}],rooms:[{id:'room-kitchen',name:'Kitchen'}],settings:[{id:'reward-policy',baselineWins:0,baselineEarned:0}],rewards:[]};
 assert.equal(archiveOldCompletions(state,now),true);
 assert.equal(state.wins.length,1);assert.equal(state.tasks.length,1);
 assert.equal(state.completionArchive[0].count,1);
 assert.equal(rewardProgress(state).wins,2);
 assert.equal(householdScoreboard(state,0)[0].points,2);
 assert.equal(taskStats(state,{now,days:0}).total,2);
 assert.equal(archiveOldCompletions(state,now),false);
 assert.equal(state.completionArchive[0].count,1);
});

test('This month begins at local midnight on the first day',()=>{
 const now=new Date(2026,9,7,12);
 assert.equal(periodStart('month',+now),+new Date(2026,9,1));
});
