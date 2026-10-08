// A jointed walk keeps the leading leg unambiguous instead of relying on generated poses.
export const masterWalkRigAtlas='assets/sprites/master-v2/walk-rig.png';
export const masterWalkProportions={legLength:.135,hipY:.73,stride:.24};
const cycleMs=1300,legLength=masterWalkProportions.legLength;
const pieces={leg:[56,539,381,447],farLeg:[832,538,361,442],body:[62,24,352,500],upperArm:[517,103,219,370],hand:[854,131,298,354],thigh:[1229,59,250,437],shin:[66,541,225,330],foot:[65,839,366,143],cloth:[449,550,350,435],farShin:[839,542,211,332],farFoot:[845,839,344,146],farHand:[1191,564,309,345]};
const degrees=angle=>angle*180/Math.PI;
function leg(phase,hip){
 const grounded=phase<.6,u=grounded?phase/.6:(phase-.6)/.4;
 const ankle={x:grounded?.62-.24*u:.38+.24*u,y:.92-(grounded?0:.07*Math.sin(Math.PI*u))};
 const dx=ankle.x-hip.x,dy=ankle.y-hip.y,distance=Math.hypot(dx,dy);
 const direction=Math.atan2(dy,dx),bend=Math.acos(Math.min(1,distance/(2*legLength))),angle=direction-bend;
 const knee={x:hip.x+legLength*Math.cos(angle),y:hip.y+legLength*Math.sin(angle)};
 return {phase,grounded,hip,knee,ankle,footAngle:grounded?-6+12*u:-12*Math.sin(Math.PI*u),thighAngle:degrees(angle)-90,shinAngle:degrees(Math.atan2(ankle.y-knee.y,ankle.x-knee.x))-90};
}
export function masterStridePose(elapsed){
 const phase=((Math.max(0,elapsed)%cycleMs)/cycleMs),bob=.004*Math.cos(phase*Math.PI*4);
 return {phase,bob,near:leg(phase,{x:.515,y:masterWalkProportions.hipY+bob}),far:leg((phase+.5)%1,{x:.485,y:masterWalkProportions.hipY+bob})};
}
export function createMasterWalkRig(sprite){
 let root,parts;
 function piece(key,height,pivot=.5,widthOverride,pivotY=.15){
  const node=document.createElement('span'),[x,y,width,cropHeight]=pieces[key];
  node.className='master-rig-part';node.style.backgroundImage=`url("${masterWalkRigAtlas}")`;node.style.backgroundSize=`${1536/width*100}% ${1024/cropHeight*100}%`;node.style.backgroundPosition=`${x/(1536-width)*100}% ${y/(1024-cropHeight)*100}%`;
  node.style.width=((widthOverride??height*width/cropHeight)*100)+'%';node.style.height=(height*100)+'%';node.style.transformOrigin=`${pivot*100}% ${pivotY*100}%`;node.dataset.pivot=String(pivot);node.dataset.pivotY=String(pivotY);root.append(node);return node;
 }
 function ensure(){
  if(root||!sprite?.append||!globalThis.document?.createElement)return;
  root=document.createElement('span');root.className='master-walk-rig';root.setAttribute('aria-hidden','true');sprite.append(root);
  // Limb roots sit inside opaque fur, and the torso covers both hip seams.
  parts={farLeg:piece('farLeg',.32,.29,undefined,.83),nearLeg:piece('leg',.32,.27,undefined,.82),farHand:piece('farHand',.29,.3,.22),nearHand:piece('hand',.29,.3,.22),cloth:piece('cloth',.32,.3,.23),body:piece('body',.78,.5,undefined,0)};
 }
 function position(node,point,angle=0){node.style.left=point.x*100+'%';node.style.top=point.y*100+'%';node.style.transform=`translate(-${Number(node.dataset.pivot)*100}%, -${Number(node.dataset.pivotY)*100}%) rotate(${angle}deg)`}
 return {
  show(elapsed,mood){
   ensure();if(!root)return;
   root.hidden=false;const pose=masterStridePose(elapsed);
   // Keep the original calf and foot in one crop. Their seam cannot open.
   for(const side of ['far','near'])position(parts[side+'Leg'],pose[side].ankle,pose[side].grounded?0:pose[side].footAngle*.45);
   position(parts.body,{x:.50,y:.01+pose.bob});
   for(const side of ['far','near']){
    const armAngle=mood==='CLEAN'&&side==='near'?-8:-pose[side].thighAngle*.25;
    const shoulder={x:side==='near'?.67:.33,y:.46+pose.bob};
    position(parts[side+'Hand'],shoulder,armAngle-10);
    if(side==='far')parts.farHand.style.transform+=' scaleX(-1)';
    if(side==='near')position(parts.cloth,shoulder,armAngle-10);
   }
   parts.nearHand.hidden=mood==='CLEAN';parts.cloth.hidden=mood!=='CLEAN';
   root.dataset.nearLeg=pose.near.grounded?'planted':'swinging';root.dataset.farLeg=pose.far.grounded?'planted':'swinging';
   root.dataset.nearFootX=pose.near.ankle.x.toFixed(3);root.dataset.farFootX=pose.far.ankle.x.toFixed(3);
  },
  hide(){if(root)root.hidden=true}
 };
}
