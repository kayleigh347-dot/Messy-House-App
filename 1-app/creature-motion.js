// Small deterministic route cursor. Coordinates stay in image space; the renderer owns pixels.
export function createRouteMotion({start,navigation}){
 let position={...start},route=[],index=0,metric=navigation.metric;
 const moving=()=>index<route.length;
 return {
  get position(){return {...position}},get moving(){return moving()},get destination(){return moving()?{...route.at(-1)}:null},get remaining(){return [this.position,...route.slice(index)]},
  setNavigation(next){metric=next.metric},
  setRoute(points){route=Array.isArray(points)?points.slice(1).map(p=>({...p})):[];index=0;while(moving()&&metric(position,route[index])<1e-9)index++},
  stop(){route=[];index=0},
  relocate(point){position={...point};route=[];index=0},
  step(elapsedMs,speed){
   let remaining=Math.max(0,Math.min(50,Number(elapsedMs)||0))*Math.max(0,speed)/1000,direction=null;
   while(moving()&&remaining>0){
    const next=route[index],distance=metric(position,next);
    if(distance<1e-9){position={...next};index++;continue}
    const part=Math.min(1,remaining/distance);direction={x:next.x-position.x,y:next.y-position.y};
    position={x:position.x+(next.x-position.x)*part,y:position.y+(next.y-position.y)*part};
    remaining-=distance*part;if(part>=1-1e-9){position={...next};index++}
   }
   return {position:{...position},moving:moving(),direction};
  }
 };
}
