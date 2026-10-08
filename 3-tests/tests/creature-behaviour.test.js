import test from 'node:test';
import assert from 'node:assert/strict';
import {createBehaviour} from '../creature-behaviour.js';
import {hitInteraction,livingRoomMap} from '../room-navigation.js';

test('action priorities, hold, cooldown and unavailable choices are deterministic',()=>{
 let time=0,roll=0;const b=createBehaviour({now:()=>time,random:()=>roll});
 assert.equal(b.canAuto({paused:false,hidden:false,reduced:false,attentionUntil:0}),false);
 time=14000;assert.equal(b.canAuto({paused:true,hidden:false,reduced:false,attentionUntil:0}),false);
 assert.equal(b.canAuto({paused:false,hidden:false,reduced:false,attentionUntil:0}),true);
 const [plant,rug]=livingRoomMap.interactions;
 assert.deepEqual(b.choose([plant,rug],[]),{kind:'object',value:plant});
 b.set('walking');assert.equal(b.canAuto({paused:false,hidden:false,reduced:false,attentionUntil:0}),false);
 b.set('greeting',4500);assert.equal(b.action,'greeting');
 b.finishObject(plant);assert.equal(b.ready(plant),false);
 assert.deepEqual(b.choose([plant,rug],[]),{kind:'object',value:rug});
 assert.equal(b.choose([],[]),null);assert.equal(b.action,'idle');
 time+=40000;assert.equal(b.ready(plant),true);
 b.hold();assert.equal(b.canAuto({paused:false,hidden:false,reduced:false,attentionUntil:0}),false);
 b.reset();assert.equal(b.action,'idle');assert.equal(b.ready(plant),true);
 assert.equal(hitInteraction({x:.25,y:.6},plant),true);
 assert.equal(hitInteraction({x:.55,y:.96},rug),true);
});
