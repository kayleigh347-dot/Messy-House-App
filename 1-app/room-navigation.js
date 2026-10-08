// Coordinates refer to the original 1415 × 1111 Living Room painting.
// The overlay and eventual actor renderer apply the same cover/contain conversion.
const p=(x,y)=>({x,y});
export const livingRoomMap={
 id:'room-living',version:1,image:{width:1415,height:1111},grid:{cols:56,rows:44},footprintPx:12,
 walkable:[[
  p(.105,.988),p(.115,.955),p(.18,.908),p(.258,.84),p(.34,.775),
  p(.47,.735),p(.96,.735),p(.99,.78),p(.99,.99)
 ]],
 obstacles:[
  {id:'tv-cabinet',polygon:[p(0,.66),p(.262,.64),p(.264,.838),p(.13,.929),p(0,.955)]},
  {id:'cat-tree-base',polygon:[p(.291,.691),p(.371,.691),p(.374,.781),p(.305,.787)]},
  {id:'sofa',polygon:[p(.35,.622),p(.94,.615),p(.978,.676),p(.978,.944),p(.865,.949),p(.745,.91),p(.57,.871),p(.38,.849),p(.347,.782)]},
  {id:'right-planter',polygon:[p(.967,.79),p(1,.77),p(1,1),p(.969,1)]}
 ],
 spawn:p(.245,.946),refuge:p(.295,.97),
 restingSpots:[
  {id:'tv-floor',point:p(.245,.946),tags:['quiet']},
  {id:'rug-left',point:p(.345,.968),tags:['rug']},
  {id:'rug-centre',point:p(.54,.972),tags:['rug']},
  {id:'rug-right',point:p(.78,.974),tags:['rug']}
 ],
 interactions:[
  {id:'left-plant',label:'Admire the trailing plant',point:p(.23,.909),hitRegion:[p(.19,.42),p(.3,.42),p(.3,.76),p(.23,.76)],approachPoints:[p(.23,.909),p(.29,.943)],facing:'left',actionId:'admire',durationMs:2300,cooldownMs:40000,allowedMoods:['SPOTLESS','CLEAN','MESSY','DISASTER'],effectId:'plant-sparkle',soundEvent:null,availableWhen:()=>true},
  {id:'rug',label:'Settle on the cosy rug',point:p(.55,.972),hitRegion:[p(.13,.83),p(.35,.78),p(.84,.93),p(.84,1),p(.13,1)],approachPoints:[p(.55,.972),p(.78,.974),p(.345,.968)],facing:'front',actionId:'settle',durationMs:2800,cooldownMs:35000,allowedMoods:['SPOTLESS','CLEAN','MESSY','DISASTER'],effectId:'rug-glow',soundEvent:null,availableWhen:()=>true}
 ]
};

export function hitInteraction(point,object){
 const polygon=object.hitRegion;let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

export function imageToScene(point,image,scene,{fit='cover'}={}){
 const scale=fit==='contain'?Math.min(scene.width/image.width,scene.height/image.height):Math.max(scene.width/image.width,scene.height/image.height);
 const renderedWidth=image.width*scale,renderedHeight=image.height*scale;
 return {x:(point.x*renderedWidth+(scene.width-renderedWidth)/2)/scene.width,y:(point.y*renderedHeight+(scene.height-renderedHeight)/2)/scene.height};
}
export function sceneToImage(point,image,scene,{fit='cover'}={}){
 const scale=fit==='contain'?Math.min(scene.width/image.width,scene.height/image.height):Math.max(scene.width/image.width,scene.height/image.height);
 const renderedWidth=image.width*scale,renderedHeight=image.height*scale;
 return {x:(point.x*scene.width-(scene.width-renderedWidth)/2)/renderedWidth,y:(point.y*scene.height-(scene.height-renderedHeight)/2)/renderedHeight};
}
