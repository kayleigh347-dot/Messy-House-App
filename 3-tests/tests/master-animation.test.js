import test from 'node:test';
import assert from 'node:assert/strict';
import {createMasterAnimator,masterAnimationSequence} from '../master-animation.js';
import {livingAnimationFrame} from '../living-animation.js';
import {masterFrameArt,masterAnimationManifest} from '../master-animation.js';

test('Bigfoot uses a continuous stride sequence and respects mood and reduced motion',()=>{
 const walk=masterAnimationSequence({mood:'SPOTLESS',action:'walking'});
 assert.equal(livingAnimationFrame(walk,0),'stride-0');assert.equal(livingAnimationFrame(walk,650),'stride-4');assert.equal(livingAnimationFrame(walk,1300),'stride-0');
 assert.equal(walk.frames.length,8);assert.ok(walk.frames.every(([id])=>id.startsWith('stride-')),'walking never jumps back to the front-facing neutral pose');
 assert.equal(livingAnimationFrame(masterAnimationSequence({mood:'CLEAN',action:'greeting'}),500),'greet-b');
 assert.equal(livingAnimationFrame(masterAnimationSequence({mood:'CLEAN',action:'celebrating'}),450),'cheer-b');
 assert.equal(masterAnimationSequence({mood:'MESSY',action:'walking'}).id,'sad-idle');
 assert.equal(masterAnimationSequence({mood:'CLEAN',action:'walking',reduced:true}).id,'still');
 assert.equal(livingAnimationFrame(masterAnimationSequence({mood:'CLEAN',action:'petting'}),550),'pet-1');
 assert.equal(livingAnimationFrame(masterAnimationSequence({mood:'CLEAN',action:'petting'}),2200),'pet-0');
 assert.equal(livingAnimationFrame(masterAnimationSequence({mood:'SPOTLESS',action:'stretching'}),1200),'stretch-2');
});
test('Bigfoot frames are preloaded, mood changes retain the correct crop and failures keep original art',()=>{
 let now=0;const sprite={dataset:{},style:{}};
 class LoadedImage{set src(value){[this.naturalWidth,this.naturalHeight]=value.endsWith('/walk.png')?[2172,724]:[1536,1024];this.onload()}}
 const animator=createMasterAnimator({sprite,clock:()=>now,ImageClass:LoadedImage});animator.preload();animator.update({mood:'SPOTLESS',action:'walking'});
 assert.equal(sprite.dataset.animationFrame,'stride-0');assert.match(sprite.style.backgroundImage,/master-v3\/walk/);assert.equal(sprite.style.transform,'none');
 now=650;animator.update({mood:'SPOTLESS',action:'walking'});assert.equal(sprite.dataset.animationFrame,'stride-4');assert.equal(sprite.style.transform,'scaleX(-1)');assert.equal(sprite.dataset.walkLead,'left');
 animator.update({mood:'CLEAN',action:'walking'});assert.equal(sprite.dataset.animationFrame,'stride-0');
 animator.update({mood:'CLEAN',action:'petting'});assert.equal(sprite.dataset.atlasCell,'0');assert.match(sprite.style.backgroundImage,/master-v3\/actions/);assert.equal(sprite.style.clipPath,'none');
 animator.update({mood:'CLEAN',action:'celebrating'});now+=100;animator.update({mood:'CLEAN',action:'celebrating'});assert.equal(sprite.dataset.atlasCell,'5');
 animator.update({mood:'DISASTER',action:'walking'});assert.equal(sprite.dataset.animationFrame,'sad-0');assert.equal(sprite.dataset.atlasCell,'4');assert.match(sprite.style.backgroundImage,/master-v3\/sad/);
 class FailedImage{set src(value){this.onerror()}}
 const failed=createMasterAnimator({sprite,clock:()=>now,ImageClass:FailedImage});failed.preload();failed.update({mood:'CLEAN',action:'greeting'});
 assert.equal(failed.failed,true);assert.equal(sprite.dataset.animationFrame,'fallback');assert.equal(sprite.style.aspectRatio,'428 / 757');
});
test('messy and disaster moods sigh, blink and show displeasure while reduced motion holds a sad pose',()=>{
 for(const mood of ['MESSY','DISASTER']){
  const idle=masterAnimationSequence({mood,action:'idle'});assert.equal(livingAnimationFrame(idle,2600),'sad-1');assert.ok(idle.frames.some(([frame])=>frame==='sad-3'));
  assert.equal(livingAnimationFrame(masterAnimationSequence({mood,action:'sighing'}),1100),'sad-3');
  const displeasure=masterAnimationSequence({mood,action:'displeased'});assert.equal(livingAnimationFrame(displeasure,700),'sad-5');assert.equal(livingAnimationFrame(displeasure,2300),'sad-6');
  const reduced=masterAnimationSequence({mood,action:'displeased',reduced:true});assert.equal(livingAnimationFrame(reduced,10000),'sad-0');
 }
 assert.equal(masterAnimationSequence({mood:'CLEAN',action:'idle'}).id,'idle','cleaning restores the happy animations');
});
test('missing stride artwork keeps Bigfoot still instead of reverting to the twisting walk',()=>{
 const sprite={dataset:{},style:{}};
 class PartialImage{naturalWidth=1024;naturalHeight=1536;set src(value){if(value.endsWith('/walk.png'))this.onerror();else this.onload()}}
 const animator=createMasterAnimator({sprite,clock:()=>0,ImageClass:PartialImage});animator.preload();animator.update({mood:'SPOTLESS',action:'walking'});
 assert.equal(sprite.dataset.animationFrame,'still');assert.match(sprite.style.backgroundImage,/master-v3\/happy/);
});
test('whole-body walking guarantees a different leading leg in the second half-cycle',()=>{
 const first=masterFrameArt('stride-0','SPOTLESS'),second=masterFrameArt('stride-4','SPOTLESS');
 assert.equal(first.index,second.index,'same complete contact drawing, not independently positioned limbs');
 assert.equal(first.flip,false);assert.equal(second.flip,true);
 const passA=masterFrameArt('stride-2','SPOTLESS'),passB=masterFrameArt('stride-6','SPOTLESS');
 assert.equal(passA.index,1);assert.equal(passB.index,1);assert.notEqual(passA.flip,passB.flip);
 for(const frame of ['still','blink','greet-a','greet-b','cheer-a','cheer-b','pet-0','stretch-3','sad-0'])assert.match(masterFrameArt(frame,'SPOTLESS').path,/master-v3/);
});
test('stopping or reducing motion clears the mirrored walk and sad asset failure keeps sad fallback',()=>{
 const sprite={style:{},dataset:{}};let now=0;
 class Image{set src(value){if(value.endsWith('/sad.png'))this.onerror();else this.onload()}}
 const a=createMasterAnimator({sprite,clock:()=>now,ImageClass:Image});a.preload();
 a.update({mood:'SPOTLESS',action:'walking'});now=650;a.update({mood:'SPOTLESS',action:'walking'});assert.equal(sprite.style.transform,'scaleX(-1)');
 a.stop();assert.equal(sprite.style.transform,'none');assert.equal(sprite.dataset.animationFrame,'still');
 a.update({mood:'SPOTLESS',action:'walking',reduced:true});assert.equal(sprite.dataset.animationFrame,'still');
 a.update({mood:'DISASTER',action:'walking'});assert.equal(sprite.dataset.animationFrame,'fallback');assert.match(sprite.style.backgroundImage,/master-states/);
});
