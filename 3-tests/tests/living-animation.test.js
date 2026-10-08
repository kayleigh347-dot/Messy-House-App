import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLivingAnimator,livingAnimationFrame,livingAnimationManifest,livingAnimationSequence} from '../living-animation.js';

test('accepted sprite frames share the approved canvas and transparent PNG format',()=>{
 for(const path of [...Object.values(livingAnimationManifest.stills),...Object.values(livingAnimationManifest.frames)]){
  const png=readFileSync(new URL('../'+path,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),543,path);assert.equal(png.readUInt32BE(20),724,path);
  assert.equal(png[25],6,'RGBA retains transparent edges');
 }
 assert.equal(livingAnimationManifest.anchor.y,609/724);
});

test('one-shot and looping sequences are timed; incompatible and reduced moods use approved stills',()=>{
 const walk=livingAnimationSequence({mood:'SPOTLESS',action:'walking'});
 assert.equal(livingAnimationFrame(walk,0),'walk-a');assert.equal(livingAnimationFrame(walk,340),'walk-b');
 assert.equal(livingAnimationFrame(walk,680),'walk-a');
 const plant=livingAnimationSequence({mood:'CLEAN',action:'interacting',objectId:'left-plant'});
 assert.equal(livingAnimationFrame(plant,400),'plant');assert.equal(livingAnimationFrame(plant,9000),'still');
 assert.equal(livingAnimationSequence({mood:'MESSY',action:'walking'}).id,'still');
 assert.equal(livingAnimationSequence({mood:'SPOTLESS',action:'greeting',reduced:true}).id,'still');
});

test('preloaded frames switch without rebuilding the actor and failed frames retain approved strip',()=>{
 let now=0;const removed=[],sprite={dataset:{},style:{removeProperty(name){removed.push(name)}}};
 class LoadedImage{set src(value){this.onload?.()}}
 const animation=createLivingAnimator({sprite,clock:()=>now,ImageClass:LoadedImage});animation.preload();
 animation.update({mood:'SPOTLESS',action:'walking'});
 assert.equal(sprite.dataset.animationFrame,'still');assert.match(sprite.style.backgroundImage,/still-spotless\.png/);
 now=340;animation.update({mood:'SPOTLESS',action:'walking'});assert.equal(sprite.dataset.animationFrame,'still');
 animation.update({mood:'DISASTER',action:'walking'});assert.equal(sprite.dataset.animationFrame,'still');
 assert.match(sprite.style.backgroundImage,/still-disaster\.png/);
 class FailedImage{set src(value){this.onerror?.()}}
 const failed=createLivingAnimator({sprite,clock:()=>now,ImageClass:FailedImage});failed.preload();
 failed.update({mood:'CLEAN',action:'greeting'});now+=300;failed.update({mood:'CLEAN',action:'greeting'});
 assert.equal(sprite.dataset.animationFrame,'fallback');assert.equal(failed.failed.size,12);
 assert.ok(removed.includes('background-image'));
});

test('continuous living walk alternates and hides on mood changes or stop',async()=>{
 const {livingStridePose}=await import('../living-walk-rig.js');
 assert.ok(livingStridePose(300).left.swing>.99);assert.ok(livingStridePose(900).right.swing>.99);
 const old=globalThis.document;
 const element=()=>({style:{removeProperty(){}},dataset:{},children:[],append(n){this.children.push(n)},setAttribute(){}});
 globalThis.document={createElement:element};
 try{
  const sprite=element();let now=0;
  class LoadedImage{set src(value){this.onload()}}
  const animator=createLivingAnimator({sprite,clock:()=>now,ImageClass:LoadedImage});animator.preload();
  animator.update({mood:'CLEAN',action:'walking'});assert.equal(sprite.dataset.animationFrame,'walk-rig');
  now=600;animator.update({mood:'CLEAN',action:'walking'});assert.equal(sprite.children.length,1);
  animator.update({mood:'MESSY',action:'walking'});assert.equal(sprite.children[0].hidden,true);assert.match(sprite.style.backgroundImage,/still-messy/);
  animator.update({mood:'CLEAN',action:'walking'});animator.stop();assert.equal(sprite.children[0].hidden,true);assert.match(sprite.style.backgroundImage,/still-clean/);
 }finally{globalThis.document=old}
});
