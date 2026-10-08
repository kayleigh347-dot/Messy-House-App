import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation,findPath} from '../creature-pathfinding.js';
import {livingRoomMap,imageToScene,sceneToImage} from '../room-navigation.js';

const p=(x,y)=>({x,y});
const box=(x1,y1,x2,y2)=>[p(x1,y1),p(x2,y1),p(x2,y2),p(x1,y2)];
const map=(obstacles=[],footprintPx=0)=>({image:{width:1000,height:1000},grid:{cols:40,rows:40},footprintPx,walkable:[box(0,0,1,1)],obstacles});
const obstacle=(id,x1,y1,x2,y2)=>({id,polygon:box(x1,y1,x2,y2)});
const path=(navigation,start,target)=>findPath({navigation,start,target});

test('clear routes and furniture detours use only swept-clear segments',()=>{
 const clear=createNavigation(map());assert.equal(path(clear,p(.1,.1),p(.9,.9)).status,'ok');
 const wall=createNavigation(map([obstacle('furniture',.4,0,.6,.7)]));const result=path(wall,p(.2,.3),p(.8,.3));
 assert.equal(result.status,'ok');assert.ok(result.points.some(point=>point.y>.7));
 for(let i=1;i<result.points.length;i++)assert.ok(wall.safe(result.points[i-1],result.points[i]));
});
test('sealed targets are unreachable and report a reachable alternative',()=>{
 const enclosure=createNavigation(map([obstacle('top',.35,.35,.65,.4),obstacle('bottom',.35,.6,.65,.65),obstacle('left',.35,.4,.4,.6),obstacle('right',.6,.4,.65,.6)]));
 const result=path(enclosure,p(.1,.1),p(.5,.5));assert.equal(result.status,'unreachable');assert.ok(result.nearest);assert.ok(result.points.length);
 assert.ok(enclosure.safe(result.points.at(-1),result.points.at(-1)));
});
test('thin barriers and diagonal corners cannot be crossed',()=>{
 const thin=createNavigation(map([obstacle('thin',.499,0,.501,1)]));
 assert.equal(path(thin,p(.2,.5),p(.8,.5)).status,'unreachable');
 const corner=createNavigation(map([obstacle('a',.45,.2,.5,.5),obstacle('b',.5,.45,.8,.5)]));
 assert.equal(corner.safe(p(.4,.4),p(.6,.6)),false);
});
test('ground footprint closes gaps that a point actor could use',()=>{
 const shape=[obstacle('upper',.4,0,.6,.475),obstacle('lower',.4,.525,.6,1)];
 assert.equal(path(createNavigation(map(shape,0)),p(.2,.5),p(.8,.5)).status,'ok');
 assert.equal(path(createNavigation(map(shape,30)),p(.2,.5),p(.8,.5)).status,'unreachable');
});
test('invalid input and malformed maps fail without a route',()=>{
 const nav=createNavigation(map());assert.equal(path(nav,p(-.1,.2),p(.5,.5)).status,'invalid');assert.equal(path(nav,p(.2,.2),p(NaN,.5)).status,'invalid');
 assert.equal(path(createNavigation({...map(),walkable:[]}),p(.2,.2),p(.5,.5)).status,'invalid');
 assert.match(createNavigation({...map(),spawn:p(.5,1.1)}).reason,/authored point/);
});
test('a solid obstacle invalidates a route and clearing it reopens access',()=>{
 const start=p(.2,.5),target=p(.8,.5),open=createNavigation(map()),blocked=createNavigation(map([obstacle('crate',.499,0,.501,1)]));
 assert.equal(path(open,start,target).status,'ok');assert.equal(path(blocked,start,target).status,'unreachable');assert.equal(path(createNavigation(map()),start,target).status,'ok');
});
test('Living Room points and crop conversion remain valid at desktop and phone aspect ratios',()=>{
 const nav=createNavigation(livingRoomMap);assert.ok(nav.valid);assert.ok(nav.safe(livingRoomMap.spawn,livingRoomMap.spawn));
 for(const spot of [{id:'refuge',point:livingRoomMap.refuge},...livingRoomMap.restingSpots,...livingRoomMap.interactions])assert.equal(path(nav,livingRoomMap.spawn,spot.point).status,'ok',spot.id);
 const detour=path(nav,p(.33,.81),p(.78,.974));assert.equal(detour.status,'ok');assert.ok(detour.points.length>2);for(let i=1;i<detour.points.length;i++)assert.ok(nav.safe(detour.points[i-1],detour.points[i]));
 for(const [scene,fit] of [[{width:460,height:460},'cover'],[{width:390,height:306},'contain']]){
  const image=p(.33,.81),rendered=imageToScene(image,livingRoomMap.image,scene,{fit}),roundTrip=sceneToImage(rendered,livingRoomMap.image,scene,{fit});
  assert.ok(Math.abs(roundTrip.x-image.x)<1e-10&&Math.abs(roundTrip.y-image.y)<1e-10);
 }
});
