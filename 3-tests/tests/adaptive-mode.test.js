import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptivePatch,adaptiveCacheKey,initialAdaptiveRecord,validateAdaptiveRecord} from '../adaptive-state.js';
import {createAdaptiveSync} from '../adaptive-sync.js';
function service(){
 let user='alice',swap=null,ackCalls=0;
 const rows=new Map(['alice','bob'].map(id=>[id,{...initialAdaptiveRecord(id),futureField:{keep:true}}]));
 const calls=[];
 const client={auth:{getSession:async()=>({data:{session:user?{user:{id:user}}:null}})},rpc:async(name,args)=>{
  if(swap){user=swap;swap=null}
  calls.push({name,args});
  if(args.expected_user_id!==user)return {error:{code:'ACCESS_DENIED'}};
  const row=rows.get(user);
  if(name==='adaptive_preferences_read')return {data:structuredClone(row)};
  if(name==='adaptive_preferences_patch'){
   if(args.expected_revision!==row.revision)return {error:{code:'40001'}};
   Object.assign(row,args.patch);row.revision++;return {data:structuredClone(row)};
  }
  if(name==='adaptive_intro_ack'){ackCalls++;row.introAcknowledgedAt||='2026-10-13T12:00:00Z';row.revision++;return {data:structuredClone(row)}}
  if(name==='adaptive_intro_claim')return {data:row.introAcknowledgedAt?null:{userId:user,token:'lease',expiresAt:new Date(Date.now()+60000).toISOString()}};
  return {error:{code:'PGRST202'}};
 }};
 return {sync:createAdaptiveSync({getClient:()=>client,getProject:()=> 'synthetic-project'}),rows,calls,setUser:value=>user=value,swapOnRpc:value=>swap=value,get ackCalls(){return ackCalls}};
}
test('mode persistence is per-user and does not acknowledge the introduction on save or claim',async()=>{
 const s=service(),first=await s.sync.read(),saved=await s.sync.patch(first.context,{mode:'flow'},0);
 assert.equal(saved.record.mode,'flow');assert.equal(saved.record.introAcknowledgedAt,null);
 assert.deepEqual(saved.record.futureField,{keep:true});
 const lease=await s.sync.claim(first.context);assert.equal(lease.claim.token,'lease');assert.equal(s.ackCalls,0);
 assert.equal(s.rows.get('bob').mode,'routine');
 const ack=await s.sync.acknowledge(first.context);assert.ok(ack.record.introAcknowledgedAt);
 assert.equal((await s.sync.claim(first.context)).claim,null);
 assert.ok(s.calls.every(c=>!c.name.includes('mission_board')));
});
test('stale patches cannot overwrite a newer preference revision',async()=>{
 const s=service(),a=await s.sync.read(),b=await s.sync.read();
 await s.sync.patch(a.context,{mode:'flow'},0);
 await assert.rejects(s.sync.patch(b.context,{mode:'routine'},0),e=>e.kind==='conflict');
 assert.equal(s.rows.get('alice').mode,'flow');
});
test('account switch between session check and RPC cannot write the new account',async()=>{
 const s=service(),a=await s.sync.read();s.swapOnRpc('bob');
 await assert.rejects(s.sync.patch(a.context,{mode:'flow'},0),e=>e.kind==='account-changed');
 assert.equal(s.rows.get('bob').mode,'routine');assert.equal(s.rows.get('alice').mode,'routine');
});
test('account switching before a write rejects old context; signed-out requests never use a household fallback',async()=>{
 const s=service(),a=await s.sync.read();s.setUser('bob');
 await assert.rejects(s.sync.patch(a.context,{mode:'flow'},0),e=>e.kind==='account-changed');
 s.setUser(null);await assert.rejects(s.sync.read(),e=>e.kind==='signed-out');
});
test('adaptive patches reject unrelated settings and acknowledgement writes',()=>{
 for(const patch of [{settings:[]},{introAcknowledgedAt:'2026-10-13'},{mode:'automatic'},{recommendationPreferences:[]},{householdCalendar:[]},{}])assert.throws(()=>adaptivePatch(patch));
 assert.notEqual(adaptiveCacheKey('one','alice'),adaptiveCacheKey('one','bob'));
 assert.notEqual(adaptiveCacheKey('one','alice'),adaptiveCacheKey('two','alice'));
 assert.throws(()=>validateAdaptiveRecord(initialAdaptiveRecord('bob'),'alice'));
});
test('missing backend remains unavailable rather than claiming preferences saved',async()=>{
 const client={auth:{getSession:async()=>({data:{session:{user:{id:'alice'}}}})},rpc:async()=>({error:{code:'PGRST202'}})};
 const sync=createAdaptiveSync({getClient:()=>client,getProject:()=> 'fixture'});
 await assert.rejects(sync.read(),e=>e.kind==='unavailable');
});
