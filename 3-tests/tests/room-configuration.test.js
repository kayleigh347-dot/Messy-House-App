import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoomConfiguration,applyRoomConfigurationChanges,roomConfigurationChanges,validateRoomConfiguration} from '../room-configuration.js';
import {createAdaptiveSync} from '../adaptive-sync.js';
test('personal room edits preserve unrelated records, future fields and another user',async()=>{
 let user='alice';const records=new Map(['alice','bob'].map(id=>[id,{...initialRoomConfiguration(id),future:{keep:true}}]));const calls=[];
 const client={auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},rpc:async(name,args)=>{calls.push(name);if(args.expected_user_id!==user)return {error:{code:'DENIED'}};if(name==='adaptive_room_configuration_read')return {data:records.get(user)};if(name==='adaptive_room_configuration_patch'){if(records.get(user).revision!==args.expected_revision)return {error:{code:'40001'}};const next=applyRoomConfigurationChanges(records.get(user),args.changes);records.set(user,next);return {data:next}}return {error:{code:'PGRST202'}}}};
 const sync=createAdaptiveSync({getClient:()=>client,getProject:()=> 'synthetic'}),initial=await sync.readRoomConfiguration();
 const result=await sync.patchRoomConfiguration(initial.context,[{collection:'areas',id:'a',values:{houseId:'shared-house',roomId:'bathroom',name:'Fish tank',sortIndex:0}}],0);
 assert.equal(result.record.areas[0].name,'Fish tank');assert.deepEqual(result.record.future,{keep:true});assert.equal(records.get('bob').areas.length,0);
 await assert.rejects(sync.patchRoomConfiguration(initial.context,[{collection:'areas',id:'a',values:{name:'Stale'}}],0),error=>error.kind==='conflict');
 user='bob';await assert.rejects(sync.patchRoomConfiguration(initial.context,[{collection:'areas',id:'a',values:{name:'Wrong user'}}],1),error=>error.kind==='account-changed');
 assert.ok(calls.every(name=>name.startsWith('adaptive_room_configuration_')));
});
test('area deletion can atomically unassign its personal mappings and retain task identity',()=>{
 let record=applyRoomConfigurationChanges(initialRoomConfiguration('alice'),[{collection:'areas',id:'a',values:{houseId:'home',roomId:'bathroom',name:'Sink',sortIndex:0}},{collection:'assignments',id:'map',values:{houseId:'home',roomId:'bathroom',taskId:'t',areaId:'a'}}]);
 record=applyRoomConfigurationChanges(record,[{collection:'areas',id:'a',values:{deletedAt:'2026-10-13T12:00:00Z'}},{collection:'assignments',id:'map',values:{areaId:null}}]);assert.equal(record.assignments[0].taskId,'t');assert.equal(record.assignments[0].areaId,null);
 assert.throws(()=>applyRoomConfigurationChanges(record,[{collection:'assignments',id:'cross',values:{houseId:'other-home',roomId:'bathroom',taskId:'t',areaId:'a'}}]));
});
test('private room configuration cannot patch ordinary settings, mode or shared tasks',()=>{
 for(const change of [{collection:'tasks',id:'t',values:{text:'Wrong'}},{collection:'areas',id:'a',values:{mode:'flow'}},{collection:'areas',id:'a',values:{userId:'bob'}}])assert.throws(()=>roomConfigurationChanges([change]));
 assert.throws(()=>validateRoomConfiguration(initialRoomConfiguration('alice'),'bob'));
});
