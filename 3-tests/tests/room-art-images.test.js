import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {roomArtwork,roomArtworkFor} from '../room-art.js';
import {roomMess,normalize} from '../v2-state.js';
import {reconcileSync} from '../sync-state.js';

test('supplied artwork exists for each mess state and follows live task mess',()=>{
 for(const [id,states] of Object.entries(roomArtwork)){
  for(const path of Object.values(states))assert.ok(existsSync(new URL('../'+path,import.meta.url)));
  for(const [count,state] of [[0,'SPOTLESS'],[1,'CLEAN'],[5,'MESSY'],[14,'DISASTER']]){
   const st={rooms:[{id}],tasks:Array.from({length:count},(_,i)=>({id:String(i),roomId:id,messImpact:'normal'}))};
   const mess=roomMess(st,id);assert.equal(mess.state,state);assert.equal(roomArtworkFor(id,mess.state),states[state]);
  }
 }
 assert.match(roomArtworkFor('room-penny','SPOTLESS'),/spotless.jpg$/);
 assert.match(roomArtworkFor('room-print','CLEAN'),/room-print-clean.png$/);
});
test('item images survive saves, backups and household reconciliation',()=>{
 const base=normalize({tasks:[],side:[{id:'hobby',text:'Painting',type:'hobby'}],errands:[{id:'errand',text:'Frames'}],appointments:[{id:'appointment',text:'Class'}]});
 const local=structuredClone(base),attachment={src:'data:image/jpeg;base64,example',name:'reference.jpg'};
 for(const key of ['side','errands','appointments'])local[key][0].image=attachment;
 const next=reconcileSync(base,local,structuredClone(base));
 const restored=normalize(JSON.parse(JSON.stringify(next)));
 for(const key of ['side','errands','appointments'])assert.deepEqual(restored[key][0].image,attachment);
});
