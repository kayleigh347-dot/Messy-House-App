// Continuous short limbs overlap beneath the leaf skirt; no disconnected joints.
export const livingWalkRigAtlas='assets/sprites/living-v1/walk-rig-v2.png';
export const livingWalkCycle=1200;
export function livingStridePose(elapsed){
 const phase=Math.max(0,elapsed)%livingWalkCycle/livingWalkCycle;
 const leg=offset=>{
  const angle=(phase+offset)*Math.PI*2;
  return {swing:Math.sin(angle),lift:Math.max(0,Math.cos(angle))*.018};
 };
 return {phase,bob:Math.cos(phase*Math.PI*4)*.002,left:leg(0),right:leg(.5)};
}
export function createLivingWalkRig(sprite){
 let root,parts;
 function piece(crop,width,height){
  const node=document.createElement('span'),[x,y,w,h]=crop;
  node.className='living-rig-part';
  Object.assign(node.style,{backgroundImage:`url("${livingWalkRigAtlas}")`,backgroundSize:`${1536/w*100}% ${1024/h*100}%`,backgroundPosition:`${x/(1536-w)*100}% ${y/(1024-h)*100}%`,width:width*100+'%',height:height*100+'%'});
  root.append(node);return node;
 }
 function ensure(){
  if(root||!sprite?.append||!globalThis.document?.createElement)return;
  root=document.createElement('span');root.className='living-walk-rig';root.setAttribute('aria-hidden','true');sprite.append(root);
  parts={leftLeg:piece([851,529,235,390],.18,.17),rightLeg:piece([1215,524,245,394],.18,.17),body:piece([32,115,820,810],.90,.67),leftArm:piece([874,104,229,356],.13,.19),rightArm:piece([1214,101,237,359],.13,.19)};
 }
 function place(node,x,y,angle=0){Object.assign(node.style,{left:x*100+'%',top:y*100+'%',transform:`translateX(-50%) rotate(${angle}deg)`})}
 return {
  show(elapsed){
   ensure();if(!root)return false;root.hidden=false;
   const p=livingStridePose(elapsed);
   for(const side of ['left','right']){
    const leg=p[side],x=side==='left'?.40:.60;
    place(parts[side+'Leg'],x+leg.swing*.018,.675-leg.lift,leg.swing*12);
    place(parts[side+'Arm'],side==='left'?.32:.68,.565+p.bob,-leg.swing*10);
   }
   place(parts.body,.5,.115+p.bob);
   return true;
  },
  hide(){if(root)root.hidden=true}
 };
}
