import {createLivingWalkRig,livingWalkRigAtlas} from './living-walk-rig.js';
// Derived art is separate from the approved four-mood strip, which remains the fallback.
const root='assets/sprites/living-v1/';
export const livingAnimationManifest={
 anchor:{x:.5,y:609/724},canvas:{width:543,height:724},fallback:'assets/sprites/living-states.webp',
 stills:Object.fromEntries(['SPOTLESS','CLEAN','MESSY','DISASTER'].map(mood=>[mood,root+'still-'+mood.toLowerCase()+'.png'])),
 frames:Object.fromEntries(['blink','walk-a','walk-b','greet','plant','rug','celebrate'].map(id=>[id,root+id+'.png'])),
 sequences:{
  idle:{loop:true,frames:[['still',1900],['blink',180],['still',1300]]},
  walking:{loop:true,frames:[['walk-a',240],['still',100],['walk-b',240],['still',100]]},
  greeting:{loop:false,frames:[['still',180],['greet',750],['still',300]]},
  plant:{loop:false,frames:[['still',180],['plant',1550],['still',300]]},
  rug:{loop:false,frames:[['still',180],['rug',1950],['still',300]]},
  celebrating:{loop:false,frames:[['still',150],['greet',320],['celebrate',520],['greet',320],['still',250]]}
 }
};
export function livingAnimationSequence({mood,action,objectId,reduced=false}){
 if(reduced||mood==='MESSY'||mood==='DISASTER')return {id:'still',loop:false,frames:[['still',1]]};
 const id=action==='interacting'?(objectId==='left-plant'?'plant':objectId==='rug'?'rug':'idle'):
  action==='walking'?'walking':action==='greeting'?'greeting':action==='celebrating'?'celebrating':'idle';
 return {id,...livingAnimationManifest.sequences[id]};
}
export function livingAnimationFrame(sequence,elapsed){
 const total=sequence.frames.reduce((sum,[,duration])=>sum+duration,0);
 let time=sequence.loop?Math.max(0,elapsed)%total:Math.min(Math.max(0,elapsed),total-1);
 for(const [id,duration] of sequence.frames){if(time<duration)return id;time-=duration}
 return 'still';
}
export function createLivingAnimator({sprite,clock,ImageClass=globalThis.Image}){
 const rig=createLivingWalkRig(sprite);
 const loaded=new Set(),failed=new Set();let key='',start=0,shown=null,lastMood='SPOTLESS';
 function show(id,mood){
  const path=id==='still'?livingAnimationManifest.stills[mood]:livingAnimationManifest.frames[id];
  const visual=loaded.has(path)&&!failed.has(path)?path:'';
  if(visual===shown)return;
  shown=visual;
  if(!visual){
   sprite.style.removeProperty('background-image');sprite.style.removeProperty('background-size');sprite.style.removeProperty('background-position');
  }else{
   sprite.style.backgroundImage=`url("${visual}")`;
   sprite.style.backgroundSize='100% 100%';sprite.style.backgroundPosition='50% 50%';
  }
  sprite.dataset.animationFrame=visual?id:'fallback';
 }
 return {
  preload(){if(!sprite||!ImageClass)return;for(const path of [...Object.values(livingAnimationManifest.stills),...Object.values(livingAnimationManifest.frames),livingWalkRigAtlas]){
   const image=new ImageClass();image.onload=()=>loaded.add(path);image.onerror=()=>failed.add(path);image.src=path;
  }},
  update({mood,action,objectId,reduced=false}){
   if(!sprite)return;
   lastMood=mood;
   const sequence=livingAnimationSequence({mood,action,objectId,reduced});const nextKey=mood+':'+sequence.id;
   if(nextKey!==key){key=nextKey;start=clock()}
   if(sequence.id==='walking'&&loaded.has(livingWalkRigAtlas)&&rig.show(clock()-start)){
    shown=null;sprite.style.backgroundImage='none';sprite.dataset.animationFrame='walk-rig';return;
   }
   rig.hide();
   const frame=sequence.id==='walking'?'still':livingAnimationFrame(sequence,clock()-start);
   show(loaded.has(livingAnimationManifest.frames[frame])?frame:'still',mood);
  },
  stop(){rig.hide();key='';if(sprite)show('still',lastMood)},
  get loaded(){return new Set(loaded)},get failed(){return new Set(failed)}
 };
}
