// Pure, footprint-aware grid navigation in normalized image coordinates.
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function onSegment(a,b,p){return Math.abs(cross(a,b,p))<1e-10&&p.x>=Math.min(a.x,b.x)-1e-10&&p.x<=Math.max(a.x,b.x)+1e-10&&p.y>=Math.min(a.y,b.y)-1e-10&&p.y<=Math.max(a.y,b.y)+1e-10}
function intersects(a,b,c,d){const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);return (abC*abD<0&&cdA*cdB<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b)}
function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return length(p,{x:a.x+t*dx,y:a.y+t*dy})}
function segmentDistance(a,b,c,d){if(intersects(a,b,c,d))return 0;return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))}
function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(onSegment(a,b,p))return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function edges(poly){return poly.map((a,i)=>[a,poly[(i+1)%poly.length]])}
function validPolygon(poly){return Array.isArray(poly)&&poly.length>=3&&poly.every(finite)}
function metricPoint(p,aspect){return {x:p.x*aspect,y:p.y}}
function inFloor(p,walkable,radius,aspect){return walkable.some(poly=>inside(p,poly)&&edges(poly).every(([a,b])=>pointSegmentDistance(metricPoint(p,aspect),metricPoint(a,aspect),metricPoint(b,aspect))>=radius-1e-10))}
function outsideObstacles(p,obstacles,radius,aspect){return obstacles.every(({polygon})=>!inside(p,polygon)&&edges(polygon).every(([a,b])=>pointSegmentDistance(metricPoint(p,aspect),metricPoint(a,aspect),metricPoint(b,aspect))>=radius-1e-10))}
function segmentSafe(a,b,walkable,obstacles,radius,aspect){
 // Split at every polygon edge crossing; midpoint checks catch floor gaps and holes.
 const am=metricPoint(a,aspect),bm=metricPoint(b,aspect),distance=length(am,bm);
 const steps=Math.max(2,Math.ceil(distance/Math.max(radius/2,.004)));
 for(let i=0;i<=steps;i++){const t=i/steps,q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(!inFloor(q,walkable,radius,aspect)||!outsideObstacles(q,obstacles,radius,aspect))return false}
 for(const poly of walkable)for(const [c,d] of edges(poly)){
  const cm=metricPoint(c,aspect),dm=metricPoint(d,aspect);
  if(intersects(am,bm,cm,dm)||segmentDistance(am,bm,cm,dm)<radius-1e-10)return false;
 }
 for(const {polygon} of obstacles)for(const [c,d] of edges(polygon)){
  const cm=metricPoint(c,aspect),dm=metricPoint(d,aspect);
  if(intersects(am,bm,cm,dm)||segmentDistance(am,bm,cm,dm)<radius-1e-10)return false;
 }
 return true;
}
export function createNavigation(map,{obstacles=map?.obstacles,footprintPx=map?.footprintPx}={}){
 const {image,grid,walkable}=map||{};
 if(!image||!grid||!Number.isInteger(grid.cols)||!Number.isInteger(grid.rows)||grid.cols<2||grid.rows<2||!Number.isFinite(image.width)||!Number.isFinite(image.height)||image.width<=0||image.height<=0||!Number.isFinite(footprintPx)||footprintPx<0||!Array.isArray(walkable)||!walkable.length||!walkable.every(validPolygon)||!Array.isArray(obstacles)||!obstacles.every(o=>o.id&&validPolygon(o.polygon)))return {valid:false,reason:'invalid map'};
 const {cols,rows}=grid,aspect=image.width/image.height,radius=footprintPx/image.height;
 const points=Array.from({length:cols*rows},(_,i)=>({x:((i%cols)+.5)/cols,y:(Math.floor(i/cols)+.5)/rows}));
 const clear=points.map(p=>inFloor(p,walkable,radius,aspect)&&outsideObstacles(p,obstacles,radius,aspect));
 const safe=(a,b)=>finite(a)&&finite(b)&&segmentSafe(a,b,walkable,obstacles,radius,aspect);
 const neighbours=points.map((p,i)=>{
  if(!clear[i])return [];
  const x=i%cols,y=Math.floor(i/cols),list=[];
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]]){
   const nx=x+dx,ny=y+dy;if(nx<0||nx>=cols||ny<0||ny>=rows)continue;
   const j=ny*cols+nx;if(!clear[j])continue;
   if(dx&&dy&&(!clear[y*cols+nx]||!clear[ny*cols+x]))continue;
   if(safe(p,points[j]))list.push(j);
  }
  return list;
 });
 const authored=[map.spawn,map.refuge,...(map.restingSpots||[]).map(s=>s.point),...(map.interactions||[]).map(s=>s.point)].filter(Boolean);
 if(authored.some(p=>!finite(p)||!safe(p,p)))return {valid:false,reason:'authored point outside navigable floor'};
 const componentOf=Array(points.length).fill(-1),components=[];
 for(let i=0;i<points.length;i++){
  if(!clear[i]||componentOf[i]>=0)continue;
  const group=new Set([i]),queue=[i],number=components.length;componentOf[i]=number;
  for(let q=0;q<queue.length;q++)for(const next of neighbours[queue[q]])if(componentOf[next]<0){componentOf[next]=number;group.add(next);queue.push(next)}
  components.push(group);
 }
 const navigation={valid:true,map,points,clear,neighbours,cols,rows,aspect,safe,componentOf,components,metric:(a,b)=>length(metricPoint(a,aspect),metricPoint(b,aspect))};
 if(authored.some(point=>closestCell(navigation,point)<0))return {valid:false,reason:'authored point cannot reach grid'};
 if(map.spawn){const home=componentOf[closestCell(navigation,map.spawn)];if(authored.some(point=>componentOf[closestCell(navigation,point)]!==home))return {valid:false,reason:'authored point disconnected from spawn'}}
 return navigation;
}
function closestCell(nav,point,allowed){let best=-1,distance=Infinity;for(let i=0;i<nav.points.length;i++){if(!nav.clear[i]||allowed&&!allowed.has(i)||!nav.safe(point,nav.points[i]))continue;const d=nav.metric(point,nav.points[i]);if(d<distance){best=i;distance=d}}return best}
function compact(nav,points){if(points.length<3)return points;const out=[points[0]];for(let i=1;i<points.length-1;i++){const a=out.at(-1),c=points[i+1];if(!nav.safe(a,c))out.push(points[i])}out.push(points.at(-1));return out}
export function findPath({navigation:nav,start,target}){
 if(!nav?.valid||!finite(start)||!finite(target))return {status:'invalid',points:[]};
 if(!nav.safe(start,start))return {status:'invalid',points:[]};
 const source=closestCell(nav,start);if(source<0)return {status:'invalid',points:[]};
 const reachable=nav.components[nav.componentOf[source]],requestedCell=nav.safe(target,target)?closestCell(nav,target):-1;
 let destination=requestedCell>=0&&reachable.has(requestedCell)?requestedCell:-1;
 if(destination<0){let best=Infinity;for(const i of reachable){const d=nav.metric(nav.points[i],target);if(d<best){destination=i;best=d}}}
 if(destination<0)return {status:'unreachable',points:[],nearest:null};
 const exact=requestedCell===destination&&nav.safe(nav.points[destination],target);
 const open=[source],g=Array(nav.points.length).fill(Infinity),parent=Array(nav.points.length).fill(-1),closed=new Set();g[source]=0;
 while(open.length){open.sort((a,b)=>(g[a]+nav.metric(nav.points[a],nav.points[destination]))-(g[b]+nav.metric(nav.points[b],nav.points[destination]))||a-b);const current=open.shift();if(closed.has(current))continue;if(current===destination)break;closed.add(current);for(const next of nav.neighbours[current]){const cost=g[current]+nav.metric(nav.points[current],nav.points[next]);if(cost<g[next]-1e-10){g[next]=cost;parent[next]=current;open.push(next)}}}
 if(!Number.isFinite(g[destination]))return {status:'unreachable',points:[],nearest:nav.points[destination]};
 const chain=[];for(let i=destination;i>=0;i=parent[i])chain.push(nav.points[i]);chain.reverse();
 const route=compact(nav,[start,...chain,exact?target:nav.points[destination]].filter((point,i,list)=>i===0||nav.metric(point,list[i-1])>1e-10));
 if(exact)return {status:'ok',points:route,target};
 return {status:'unreachable',points:route,nearest:nav.points[destination]};
}
