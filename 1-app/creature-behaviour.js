// Room-local action timing; mood and navigation are deliberately separate.
export function createBehaviour({now,random}){
 let action='idle',deadline=0,nextAuto=now()+14000,lastObject=null;
 const cooldowns=new Map();
 const idleDelay=()=>8000+Math.max(0,Math.min(1,random()))*10000;
 return {
  get action(){return action},get deadline(){return deadline},get nextAuto(){return nextAuto},
  set(next,duration=0){action=next;deadline=duration?now()+duration:0},
  idle(){action='idle';deadline=0;nextAuto=now()+idleDelay()},
  hold(){nextAuto=Math.max(nextAuto,now()+14000)},
  ready(object){return now()>=(cooldowns.get(object.id)||0)},
  finishObject(object){cooldowns.set(object.id,now()+object.cooldownMs);lastObject=object.id;this.idle()},
  canAuto({paused,hidden,reduced,attentionUntil}){return !paused&&!hidden&&!reduced&&action==='idle'&&now()>=Math.max(nextAuto,attentionUntil)},
  choose(objects,rests,{restWeight=1,inspectWeight=1}={}){
   const available=objects.filter(o=>this.ready(o)&&o.id!==lastObject);
   const restTotal=rests.length*restWeight,inspectTotal=available.length*inspectWeight,total=restTotal+inspectTotal;
   if(!total){this.idle();return null}
   let draw=Math.min(.999999,Math.max(0,random()))*total;
   if(draw<restTotal)return {kind:'rest',value:rests[Math.floor(draw/restWeight)]};
   draw-=restTotal;return {kind:'object',value:available[Math.floor(draw/inspectWeight)]};
  },
  reset(){action='idle';deadline=0;nextAuto=now()+14000;lastObject=null;cooldowns.clear()}
 };
}
