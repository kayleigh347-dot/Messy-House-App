// Whole-body drawings preserve connected anatomy in every frame.
import {livingAnimationFrame} from './living-animation.js';
export const masterAnimationManifest={
 atlas:'assets/sprites/master-v3/happy.png',columns:4,rows:2,
 walkingAtlas:'assets/sprites/master-v3/walk.png',
 actionsAtlas:'assets/sprites/master-v3/actions.png',
 sadAtlas:'assets/sprites/master-v3/sad.png',
 fallback:'assets/sprites/master-states.webp',
 sequences:{
  idle:{loop:true,frames:[['still',1900],['blink',160],['still',1600]]},
  walking:{loop:true,frames:[['stride-0',210],['stride-1',140],['stride-2',160],['stride-3',140],['stride-4',210],['stride-5',140],['stride-6',160],['stride-7',140]]},
  petting:{loop:true,frames:[['pet-0',550],['pet-1',550],['pet-2',550],['pet-3',550]]},
  stretching:{loop:false,frames:[['stretch-0',450],['stretch-1',650],['stretch-2',700],['stretch-3',550]]},
  greeting:{loop:false,frames:[['still',120],['greet-a',280],['greet-b',280],['greet-a',280],['greet-b',280],['still',200]]},
  celebrating:{loop:false,frames:[['still',100],['cheer-a',240],['cheer-b',240],['cheer-a',240],['cheer-b',240],['still',340]]}
 }
};
const sadSequences={
 idle:{loop:true,frames:[['sad-0',2600],['sad-1',240],['sad-0',1800],['sad-2',600],['sad-3',900],['sad-0',1200],['sad-4',650],['sad-5',650],['sad-4',650],['sad-6',950],['sad-7',650],['sad-0',1800]]},
 sighing:{loop:false,frames:[['sad-0',200],['sad-2',800],['sad-3',1300],['sad-0',900]]},
 displeased:{loop:false,frames:[['sad-4',650],['sad-5',650],['sad-4',650],['sad-6',900],['sad-7',900],['sad-0',600]]},
 acknowledging:{loop:false,frames:[['sad-0',300],['sad-1',200],['sad-0',600]]}
};
export function masterAnimationSequence({mood,action,reduced=false}){
 const sad=['MESSY','DISASTER'].includes(mood);
 if(reduced)return {id:'still',loop:false,frames:[[sad?'sad-0':'still',1]]};
 if(sad){const id=action==='greeting'||action==='sighing'?'sighing':action==='displeased'?'displeased':action==='celebrating'?'acknowledging':'idle';return {id:'sad-'+id,...sadSequences[id]}}
 const id=Object.hasOwn(masterAnimationManifest.sequences,action)?action:'idle';
 return {id,...masterAnimationManifest.sequences[id]};
}
const happyCells={still:0,blink:1,'greet-a':2,'greet-b':3,'cheer-a':5,'cheer-b':6};
const fallbackCrops={SPOTLESS:[0,590],CLEAN:[590,428],MESSY:[1018,429],DISASTER:[1447,631]};
// Measure generated art rather than assuming all poses stay in equal cells.
const actionCrops=[
 [0,0,416,490],[416,0,368,490],[784,0,383,490],[1167,0,369,490],
 [0,500,386,504],[386,500,373,504],[752,484,386,520],[1100,500,436,504]
];
export function masterFrameArt(frame,mood){
 if(frame.startsWith('stride-')){
  const step=Math.floor(Number(frame.slice(7))/2);
  // The front-facing second step mirrors the COMPLETE drawing, never separate limbs.
  return {path:masterAnimationManifest.walkingAtlas,index:step%2,columns:4,rows:1,flip:step>=2};
 }
 if(frame.startsWith('pet-')||frame.startsWith('stretch-')){
  const index=(frame.startsWith('stretch-')?4:0)+Number(frame.split('-')[1]);
  return {path:masterAnimationManifest.actionsAtlas,index,crop:actionCrops[index],flip:frame.startsWith('pet-')};
 }
 if(frame.startsWith('sad-')||(['MESSY','DISASTER'].includes(mood)&&frame==='still')){
  const n=Number(frame.split('-')[1])||0;
  return {path:masterAnimationManifest.sadAtlas,index:mood==='DISASTER'?[4,5,4,5,6,7,6,7][n]:[0,1,2,3,0,2,3,0][n],columns:4,rows:2};
 }
 return {path:masterAnimationManifest.atlas,index:happyCells[frame]??0,columns:4,rows:2};
}
export function masterAtlasPosition(frame,mood){const {index}=masterFrameArt(frame,mood);return {index,column:index%4,row:Math.floor(index/4)}}
export function createMasterAnimator({sprite,clock,ImageClass=globalThis.Image}){
 const ready=new Map();let failed=false,key='',start=0,lastMood='SPOTLESS';
 function show(frame,mood){
  let art=masterFrameArt(frame,mood);
  if(!ready.has(art.path)){frame='still';art=masterFrameArt(frame,mood)}
  sprite.style.transform='none';sprite.style.clipPath='none';
  if(!ready.has(art.path)){
   const [x,width]=fallbackCrops[mood]??fallbackCrops.SPOTLESS;
   sprite.style.backgroundImage=`url("${masterAnimationManifest.fallback}")`;sprite.style.backgroundSize=`${2078/width*100}% 100%`;sprite.style.backgroundPosition=`${x/(2078-width)*100}% 50%`;sprite.style.aspectRatio=`${width} / 757`;sprite.style.setProperty?.('--master-frame-scale','1');sprite.dataset.animationFrame='fallback';delete sprite.dataset.atlasCell;delete sprite.dataset.walkLead;return;
  }
  const {width,height}=ready.get(art.path);
  let [x,y,w,h]=art.crop??[(art.index%art.columns)*width/art.columns,Math.floor(art.index/art.columns)*height/art.rows,width/art.columns,height/art.rows];
  // Custom action crop coordinates use the measured 1536 x 1024 source.
  if(art.crop){x*=width/1536;w*=width/1536;y*=height/1024;h*=height/1024}
  const ratio=w/h;
  sprite.style.backgroundImage=`url("${art.path}")`;sprite.style.backgroundSize=`${width/w*100}% ${height/h*100}%`;sprite.style.backgroundPosition=`${width===w?50:x/(width-w)*100}% ${height===h?50:y/(height-h)*100}%`;sprite.style.aspectRatio=String(ratio);sprite.style.setProperty?.('--master-frame-scale',String(ratio/(2/3)));sprite.style.transform=art.flip?'scaleX(-1)':'none';
  // The two outstretched arms overlap the neighboring stretch cells only at their edges.
  if(art.path===masterAnimationManifest.actionsAtlas&&art.index===6)sprite.style.clipPath='polygon(0 0,100% 0,100% 100%,0 100%,0 54%,5% 40%,0 30%)';
  if(art.path===masterAnimationManifest.actionsAtlas&&art.index===7)sprite.style.clipPath='polygon(14% 0,100% 0,100% 100%,0 100%,0 47%,14% 34%)';
  sprite.dataset.animationFrame=frame;sprite.dataset.atlasCell=String(art.index);
  if(frame.startsWith('stride-'))sprite.dataset.walkLead=art.flip?'left':'right';else delete sprite.dataset.walkLead;
 }
 return {
  preload(){if(!sprite||!ImageClass)return;for(const path of [masterAnimationManifest.atlas,masterAnimationManifest.walkingAtlas,masterAnimationManifest.actionsAtlas,masterAnimationManifest.sadAtlas]){
   const image=new ImageClass();image.onload=()=>ready.set(path,{width:image.naturalWidth||(path===masterAnimationManifest.walkingAtlas?2172:1536),height:image.naturalHeight||(path===masterAnimationManifest.walkingAtlas?724:1024)});image.onerror=()=>{if(path===masterAnimationManifest.atlas)failed=true};image.src=path;
  }},
  update(options){if(!sprite)return;lastMood=options.mood;const sequence=masterAnimationSequence(options),nextKey=lastMood+':'+sequence.id;if(key!==nextKey){key=nextKey;start=clock()}show(livingAnimationFrame(sequence,clock()-start),lastMood)},
  stop(){key='';if(sprite)show('still',lastMood)},
  get loaded(){return ready.has(masterAnimationManifest.atlas)},get failed(){return failed}
 };
}
