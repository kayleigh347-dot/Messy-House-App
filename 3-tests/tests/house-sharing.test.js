import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../v2-state.js';
import {openHouseState} from '../sync-state.js';
const board=(id,text)=>normalize({rooms:[{id:'room',name:'Room'}],tasks:[{id,text,roomId:'room',bucket:'now'}]});

test('opening a different house never imports the current house or another account cache',()=>{
 const remote=board('shared','Shared task'),personal=board('private','Private task');
 assert.deepEqual(openHouseState(remote,null,'account','shared'),remote);
 assert.deepEqual(openHouseState(remote,{state:personal,meta:{owner:'account',houseId:'personal'}},'account','shared'),remote);
 assert.deepEqual(openHouseState(remote,{state:personal,meta:{owner:'someone-else',houseId:'shared'}},'account','shared'),remote);
});

test('returning to a shared house merges its offline changes and new remote tasks',()=>{
 const base=board('shared','Shared task'),local=structuredClone(base),remote=structuredClone(base);
 local.tasks[0].done=true;
 remote.tasks.push({id:'new',text:'Added by housemate',roomId:'room',bucket:'now'});
 const restored=openHouseState(remote,{state:local,meta:{owner:'account',houseId:'shared',base}},'account','shared');
 assert.equal(restored.tasks.find(t=>t.id==='shared').done,true);
 assert.equal(restored.tasks.find(t=>t.id==='new').text,'Added by housemate');
 assert.equal(base.tasks[0].done,undefined);
});
