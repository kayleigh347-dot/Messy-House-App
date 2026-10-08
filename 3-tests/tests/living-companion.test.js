import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanionController} from '../room-companion.js';
import {livingRoomMap} from '../room-navigation.js';
import {messPieces} from '../room-mess.js';

test('mapped Living Room keeps one frame loop, accepts latest route, and rebuilds only for geometry changes',()=>{
 const originals=new Map(['window','document','localStorage','location','setInterval','clearInterval','setTimeout','clearTimeout'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const element=()=>({children:[],dataset:{},style:{removeProperty(){}},classList:{add(){},remove(){}},hidden:false,
  setAttribute(){},removeAttribute(){},append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node)}},
  remove(){this.parentElement.children=this.parentElement.children.filter(node=>node!==this)},
  addEventListener(name,handler){this[name]=handler},removeEventListener(name){delete this[name]},closest(){return null},
  getBoundingClientRect(){return {left:0,top:0,width:1000,height:1000}},querySelector(){return null}});
 const scene=element(),actor=element(),toolbar=element(),frames=new Map(),intervals=new Map(),timeouts=new Map(),sounds=[];let now=0,sequence=0,reduced=false,roll=0;
 const requestFrame=fn=>{const id=++sequence;frames.set(id,fn);return id},cancelFrame=id=>frames.delete(id);
 const advance=ms=>{now+=ms;const [id,fn]=frames.entries().next().value||[];if(fn){frames.delete(id);fn(now)}};
 try{
  globalThis.window={scrollY:0,matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({backgroundSize:'cover',left:'0px',top:'0px'})};
  globalThis.document={hidden:false,createElement:element,querySelector:selector=>({'.room-toolbar':toolbar})[selector],addEventListener(name,fn){this[name]=fn},removeEventListener(name){delete this[name]}};
  globalThis.location={search:''};globalThis.localStorage={getItem:()=>null,setItem(){}};
  globalThis.setInterval=fn=>{const id=++sequence;intervals.set(id,fn);return id};globalThis.clearInterval=id=>intervals.delete(id);
  globalThis.setTimeout=fn=>{const id=++sequence;timeouts.set(id,fn);return id};globalThis.clearTimeout=id=>timeouts.delete(id);
  const controller=createCompanionController({scene,actor,clock:()=>now,random:()=>roll,audio:{play:()=>false,request:event=>sounds.push(event),stop(){}},requestFrame,cancelFrame});
  controller.enter({roomId:'room-living',mess:{state:'SPOTLESS'},clutter:[]});
  assert.equal(actor.dataset.navigation,'map');assert.equal(frames.size,1);assert.deepEqual(controller.position,livingRoomMap.spawn);
  assert.equal(controller.invite(livingRoomMap.restingSpots[3].point),true);advance(16);advance(50);const middle=controller.position;
  assert.ok(middle.x>livingRoomMap.spawn.x);assert.equal(controller.invite(livingRoomMap.restingSpots[1].point),true);
  assert.deepEqual(controller.position,middle);assert.equal(frames.size,1,'a second request does not start another loop');
  const before=controller.navigation,clutter=messPieces('room-living',20);
  controller.updateRoom({mess:{state:'MESSY'},clutter});assert.notEqual(controller.navigation,before);
  const changed=controller.navigation;controller.updateRoom({mess:{state:'DISASTER'},clutter:messPieces('room-living',21)});
  assert.equal(controller.navigation,changed,'opacity change without a new solid does not rebuild');
  assert.equal(controller.invite({x:NaN,y:.95}),false,'invalid request leaves current route intact');
  const route=controller.route;assert.ok(route.length>1);
  const gesture={pointerId:3,clientX:500,clientY:900,target:scene};
  scene.pointerdown(gesture);scene.pointermove({...gesture,clientX:540});scene.pointerup({...gesture,clientX:540});
  assert.deepEqual(controller.route,route,'a drag does not replace the route');
  scene.pointerdown(gesture);window.scrollY=30;scene.pointerup(gesture);window.scrollY=0;
  assert.deepEqual(controller.route,route,'scrolling does not invite the creature');
  scene.pointerdown({...gesture,pointerId:4,clientX:700,clientY:700});scene.pointerup({...gesture,pointerId:4,clientX:700,clientY:700});
  assert.equal(scene.children[0].hidden,true,'furniture taps do not create a text bubble');
  const pause=toolbar.children[0].children[1].children[2],explore=toolbar.children[0].children[1].children[1];
  pause.onclick();const beforeManual=controller.position;explore.onclick();assert.deepEqual(controller.position,beforeManual,'manual Explore starts from the current point while paused');
  const slowStart=controller.position;advance(50);const slowDistance=controller.navigation.metric(slowStart,controller.position);
  assert.ok(slowDistance>0&&slowDistance<.005,'Disaster follows a reachable route at the slower pace');
  controller.invite(livingRoomMap.restingSpots[3].point);const oldRoute=controller.route;
  const box={id:'new-box',kind:'box',opacity:1,navigationRole:'solid',footprint:[{x:.54,y:.959},{x:.56,y:.959},{x:.56,y:.981},{x:.54,y:.981}]};
  controller.updateRoom({mess:{state:'DISASTER'},clutter:[box]});
  assert.ok(oldRoute.some((point,i)=>i&&!controller.navigation.safe(oldRoute[i-1],point)),'new solid intersects the old route');
  assert.ok(controller.route.every((point,i,points)=>!i||controller.navigation.safe(points[i-1],point)),'replanned route avoids the new solid');
  for(let i=0;i<1000&&controller.route.length>1;i++)advance(50);
  assert.ok(controller.navigation.safe(controller.position,controller.position));
  controller.invite(livingRoomMap.restingSpots[1].point);let prevented=false;actor.onkeydown({key:'Enter',preventDefault(){prevented=true}});
  assert.equal(prevented,true);assert.equal(controller.route.length,1,'keyboard greeting interrupts the active route');
  assert.equal(scene.children[0].hidden,true,'greeting remains text-free');
  const overlap=controller.position,overlapBox={id:'overlap-box',kind:'box',opacity:1,navigationRole:'solid',footprint:[
   {x:overlap.x-.007,y:overlap.y-.006},{x:overlap.x+.007,y:overlap.y-.006},
   {x:overlap.x+.007,y:overlap.y+.006},{x:overlap.x-.007,y:overlap.y+.006}
  ]};
  controller.updateRoom({mess:{state:'DISASTER'},clutter:[overlapBox]});
  assert.equal(controller.navigation.safe(overlap,overlap),true,'a new piece under the actor is temporarily suppressed');
  controller.invite(livingRoomMap.refuge);for(let i=0;i<1000&&controller.route.length>1;i++)advance(50);
  assert.equal(controller.navigation.safe(overlap,overlap),false,'solid collision returns after the actor exits');
  reduced=true;assert.equal(controller.invite(livingRoomMap.restingSpots[3].point),true);
  assert.equal(controller.route.length,1,'reduced motion finishes the explicit request immediately');
  assert.ok(controller.navigation.safe(controller.position,controller.position),'reduced motion snaps to a validated point');
  document.hidden=true;document.visibilitychange?.();assert.equal(frames.size,0,'hide cancels the frame loop');
  document.hidden=false;document.visibilitychange?.();assert.equal(frames.size,1,'return starts one fresh loop');
  reduced=false;controller.updateRoom({mess:{state:'CLEAN'},clutter:[]});
  assert.equal(controller.interact('left-plant'),true);assert.equal(controller.action,'walking');
  controller.greet();assert.equal(controller.action,'greeting');assert.equal(controller.route.length,1,'greeting interrupts the object approach');
  assert.equal(controller.interact('left-plant'),true);assert.equal(controller.action,'walking');
  assert.equal(controller.interact('left-plant'),true,'repeated taps keep the same request');
  for(let i=0;i<1000&&controller.action==='walking';i++)advance(50);
  assert.equal(controller.action,'interacting');assert.equal(scene.children.filter(n=>n.className?.includes('companion-effect')).length,1);
  controller.greet();assert.equal(controller.action,'greeting');assert.equal(scene.children.filter(n=>n.className?.includes('companion-effect')).length,0,'greeting clears the active effect');
  assert.equal(controller.interact('rug'),true,'manual object action interrupts greeting');
  for(let i=0;i<1000&&controller.action==='walking';i++)advance(50);
  assert.equal(controller.action,'interacting');advance(3000);assert.equal(controller.action,'idle');
  assert.equal(controller.interact('rug'),false,'completed object is cooling down');
  assert.equal(controller.interact('left-plant'),true);
  for(let i=0;i<1000&&controller.action==='walking';i++)advance(50);
  advance(2400);assert.equal(controller.action,'idle');assert.equal(controller.interact('left-plant'),false);
  assert.equal(controller.interact('rug'),false,'manual cooldown still applies while paused');
  controller.enter({roomId:'room-living',mess:{state:'CLEAN'},clutter:[]});
  assert.equal(toolbar.children[0].children[1].children.filter(n=>n.className==='companion-object-control').length,2,'reentry has only two object controls');
  assert.equal(controller.taskCompleted({id:'wrong',roomId:'room-master',fromMood:'MESSY',toMood:'CLEAN'}),false);
  assert.equal(controller.taskCompleted({id:'done-1',roomId:'room-living',fromMood:'MESSY',toMood:'CLEAN'}),true);
  assert.equal(controller.action,'celebrating');assert.equal(scene.children[0].hidden,true);
  assert.equal(controller.taskCompleted({id:'done-1',roomId:'room-living'}),false,'one local event cannot replay');
  assert.equal(controller.taskCompleted({id:'done-2',roomId:'room-living',fromMood:'CLEAN',toMood:'CLEAN'}),true,'rapid completions coalesce');
  assert.equal(sounds.filter(event=>event.event==='completion').length,1);
  advance(2300);assert.equal(controller.action,'idle');
  advance(15000);assert.equal(controller.action,'idle','pause stops autonomous choices');
  roll=.3;pause.onclick();advance(16);assert.equal(controller.action,'walking','unpaused companion chooses a reachable rest');
  for(let i=0;i<1000&&controller.action==='walking';i++)advance(50);
  assert.equal(controller.action,'resting');advance(3000);assert.equal(controller.action,'idle');
  controller.destroy();assert.equal(frames.size,0);assert.equal(intervals.size,0);assert.equal(scene.pointerdown,undefined);
 }finally{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
});
