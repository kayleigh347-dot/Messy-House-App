import test from 'node:test';
import assert from 'node:assert/strict';
import {createRouteMotion} from '../creature-motion.js';
import {createNavigation,findPath} from '../creature-pathfinding.js';
import {livingRoomMap} from '../room-navigation.js';
import {messPieces,messGeometrySignature,solidMessObstacles} from '../room-mess.js';

test('irregular frame times cannot overshoot a route and replacement starts at the interpolated point',()=>{
 const navigation=createNavigation(livingRoomMap),start=livingRoomMap.spawn,motion=createRouteMotion({start,navigation});
 const first=findPath({navigation,start,target:livingRoomMap.restingSpots[3].point});motion.setRoute(first.points);
 motion.step(5000,.14);const middle=motion.position;assert.ok(middle.x>start.x&&middle.x<first.points.at(-1).x,'large frame is clamped');
 const replacement=findPath({navigation,start:middle,target:livingRoomMap.restingSpots[1].point});motion.setRoute(replacement.points);
 assert.deepEqual(motion.position,middle,'new request does not jump to an old endpoint');
 for(let i=0;i<1000&&motion.moving;i++){const result=motion.step(i%3===0?100:16,.14);assert.ok(navigation.safe(result.position,result.position))}
 assert.equal(motion.moving,false);assert.deepEqual(motion.position,replacement.points.at(-1));
});
test('Living Room clutter has stable IDs and only visible substantial pieces change collision geometry',()=>{
 const faint=messPieces('room-living',9),visible=messPieces('room-living',20),same=messPieces('room-living',21);
 assert.equal(solidMessObstacles(faint).length,0);assert.ok(solidMessObstacles(visible).length>0);
 assert.equal(messGeometrySignature(visible),messGeometrySignature(same));
 assert.ok(visible.every((p,i)=>p.id===same[i].id&&p.imagePoint&&p.footprint));
 const map={...livingRoomMap,spawn:null,refuge:null,restingSpots:[],interactions:[]};
 const navigation=createNavigation(map,{obstacles:[...livingRoomMap.obstacles,...solidMessObstacles(messPieces('room-living',100))]});
 assert.equal(findPath({navigation,start:livingRoomMap.spawn,target:livingRoomMap.refuge}).status,'ok');
 assert.equal(findPath({navigation,start:livingRoomMap.spawn,target:livingRoomMap.restingSpots[3].point}).status,'ok');
});
