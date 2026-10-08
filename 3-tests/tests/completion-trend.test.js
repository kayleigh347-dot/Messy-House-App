import test from 'node:test';
import assert from 'node:assert/strict';
import {completionTrend} from '../completion-trend.js';

test('all graph groupings use the selected reporting period and person',()=>{
 const state={householdPeople:[{id:'k',name:'Kayleigh'},{id:'a',name:'Andy'}],wins:[{id:'today',at:'2026-10-08T10:00:00Z',completedBy:'a'},{id:'yesterday',at:'2026-10-07T10:00:00Z',completedBy:'k'},{id:'future',at:'2026-10-09T10:00:00Z',completedBy:'a'}]};
 const now=new Date('2026-10-08T13:00:00Z');
 for(const unit of ['day','week','month']){
  const result=completionTrend(state,unit,now,'',{period:'today',personId:'a'});
  assert.equal(result.rows.length,1);assert.equal(result.rows[0].name,'Andy');
  assert.equal(result.rows[0].counts.reduce((sum,count)=>sum+count,0),1);
  assert.equal(result.buckets.length,1);
 }
});

test('all-time monthly graph includes older archive totals within the chosen room',()=>{
 const state={householdPeople:[{id:'a',name:'Andy'}],wins:[],completionArchive:[{month:'2025-01',roomId:'kitchen',completedBy:'a',count:4},{month:'2025-01',roomId:'bathroom',completedBy:'a',count:2}]};
 const result=completionTrend(state,'month',new Date('2026-10-08T13:00:00Z'),'kitchen',{period:'0',personId:'a'});
 assert.equal(result.rows[0].counts.reduce((sum,count)=>sum+count,0),4);
 assert.equal(result.buckets[0].key,'2025-01');
});

test('daily, weekly and monthly lines separate Kayleigh and Andy and include archived months',()=>{
 const state={householdPeople:[{id:'k',name:'Kayleigh347'},{id:'a',name:'Andrewjameslamb14'}],wins:[{id:'one',at:'2026-10-06T12:00:00Z',completedBy:'k'},{id:'two',at:'2026-10-07T12:00:00Z',completedBy:'a'}],completionArchive:[{id:'old',month:'2026-07',completedBy:'k',count:3}]};
 const now=new Date('2026-10-07T13:00:00Z');
 for(const unit of ['day','week','month']){const result=completionTrend(state,unit,now);assert.equal(result.rows.length,2);assert.equal(result.rows[0].counts.reduce((a,b)=>a+b,0),unit==='month'?4:1);assert.equal(result.rows[1].counts.reduce((a,b)=>a+b,0),1)}
 const month=completionTrend(state,'month',now);assert.equal(month.rows[0].counts[month.buckets.findIndex(bucket=>bucket.key==='2026-07')],3);
 assert.equal(completionTrend(state,'month',now,'room-kitchen').rows[0].counts.reduce((a,b)=>a+b,0),0);
});
