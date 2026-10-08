import test from 'node:test';
import assert from 'node:assert/strict';
import {companionLayouts} from '../companion-layouts.js';
test('companion routes keep the entire 24 by 36 percent actor inside each illustrated room',()=>{
 for(const [room,layout] of Object.entries(companionLayouts)){
  assert.ok(Object.keys(layout.spots).length>=2,room);
  for(const p of Object.values(layout.spots)){
   assert.ok(p.x>=0&&p.x+24<=100,room+' horizontal bounds');
   assert.ok(p.y>=25&&p.y+36<=100,room+' actor avoids title and scene edges');
  }
 }
});

import {nearestCompanionSpot} from '../companion-layouts.js';
test('room taps choose the closest safe destination and reject invalid coordinates',()=>{
 for(const [id,layout] of Object.entries(companionLayouts)){
  for(const [name,p] of Object.entries(layout.spots))assert.equal(nearestCompanionSpot(id,p.x+12,p.y+30),name);
  assert.ok(Object.hasOwn(layout.spots,nearestCompanionSpot(id,-1000,1000)));
 }
 assert.equal(nearestCompanionSpot('missing',50,50),null);
 assert.equal(nearestCompanionSpot('room-living',NaN,50),null);
 assert.equal(nearestCompanionSpot('room-living',50,Infinity),null);
});
