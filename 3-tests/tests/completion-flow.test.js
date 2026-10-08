import {descendants,repeatChildren} from '../subtasks.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {completionRecord} from '../task-stats.js';
import {captureCompletion} from '../task-flow.js';
import {rewardProgress,migrateRewards,prizes} from '../rewards.js';
import {scheduleNext,DAY} from '../v2-state.js';
test('actual completion handler records lateness, schedules once and collects a reward and shows one banner at five completions',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const snippet=source.slice(source.indexOf('function win('),source.indexOf('$("#unlockOpen").onclick='));
 const now=new Date('2026-09-22T12:00:00Z'),task={id:'t',text:'Clean',roomId:'room-master',bucket:'now',nextDue:new Date(+now-DAY).toISOString(),recurrence:{kind:'weeks',every:1}};
 const st={tasks:[task],householdPeople:[{id:'person-1',name:'Kayleigh'}],wins:[{id:'1'},{id:'2'},{id:'3'},{id:'4'}],rewards:[],settings:[{id:'reward-policy',baselineWins:0,baselineEarned:0}]};let popups=0,saves=0;
 const reactions=[];const roomMess=()=>({state:'CLEAN'});
 const finish=new Function('descendants','repeatChildren','st','iso','completionRecord','rewardProgress','scheduleNext','changed','celebrate','$','roomMess','notifyCompanionTaskCompleted','currentActor','captureCompletion','featureToast','prizes',snippet+';return finish')(descendants,repeatChildren,st,()=>now.toISOString(),completionRecord,rewardProgress,scheduleNext,()=>{saves++;migrateRewards(st)},()=>{},()=>({showModal(){popups++}}),roomMess,event=>reactions.push(event),()=>({id:'person-1',name:'Kayleigh'}),captureCompletion,()=>popups++,prizes);
 finish(task,'task');assert.equal(task.done,true);assert.equal(st.wins[0].overdueMs,DAY);assert.equal(st.tasks.length,2);assert.equal(popups,1);assert.equal(saves,1);
 assert.equal(st.wins[0].completedBy,'person-1');
 finish(task,'task');assert.equal(st.tasks.length,2);assert.equal(st.wins.length,5);assert.equal(popups,1);
 assert.deepEqual(reactions,[{id:'t',roomId:'room-master',fromMood:'CLEAN',toMood:'CLEAN',kind:'task'}]);
});
test('unsigned completion stays open and prompts sign-in without choosing another person',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const snippet=source.slice(source.indexOf('function finish('),source.indexOf('$("#unlockOpen").onclick='));
 const task={id:'t',text:'Clean',done:false},st={tasks:[task],side:[],householdPeople:[],wins:[]};let requested=0;
 const finish=new Function('st','currentActor','featureToast',snippet+';return finish')(st,()=>({id:'local-device',name:'This device'}),()=>requested++);
 assert.equal(finish(task,'task'),false);
 assert.equal(requested,1);assert.equal(task.done,false);assert.equal(st.wins.length,0);
});

test('recording another member completion credits that member without the device user reward banner',()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8'),snippet=source.slice(source.indexOf('function win('),source.indexOf('$("#unlockOpen").onclick='));
 const st={tasks:[{id:'t',text:'Clean'}],side:[],wins:[{id:'1'},{id:'2'},{id:'3'},{id:'4'}],householdPeople:[{id:'k',name:'Kayleigh'},{id:'a',name:'Andy'}],settings:[{id:'reward-policy',baselineWins:0,baselineEarned:0}],rewards:[]};let feedback=0;
 const finish=new Function('descendants','repeatChildren','st','iso','completionRecord','rewardProgress','scheduleNext','changed','celebrate','roomMess','notifyCompanionTaskCompleted','currentActor','captureCompletion','featureToast','prizes',snippet+';return finish')(descendants,repeatChildren,st,()=>new Date().toISOString(),completionRecord,rewardProgress,scheduleNext,()=>migrateRewards(st),()=>feedback++,()=>({state:'CLEAN'}),()=>{},()=>st.householdPeople[0],captureCompletion,()=>feedback++,prizes);
 assert.equal(finish(st.tasks[0],'task',st.householdPeople[1]),true);
 assert.equal(st.wins[0].completedBy,'a');assert.equal(feedback,0);
});
