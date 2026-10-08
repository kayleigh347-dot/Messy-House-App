import {livingRoomMap,sceneToImage} from './room-navigation.js';
import {createNavigation,findPath} from './creature-pathfinding.js';

const namespace='http://www.w3.org/2000/svg';
const debugEnabled=()=>new URLSearchParams(location.search).get('creatureDebug')==='1';
const make=(name,attrs={})=>{const node=document.createElementNS(namespace,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node};
const polygon=points=>points.map(p=>`${p.x*1415},${p.y*1111}`).join(' ');
let overlay,routeLayer,status,sceneListener,sceneRef,nav,source,resizeObserver;

export function syncLivingNavigationDebug(scene,roomId){
 if(!debugEnabled()||roomId!==livingRoomMap.id){removeLivingNavigationDebug();return}
 if(overlay&&sceneRef===scene)return;
 removeLivingNavigationDebug();sceneRef=scene;nav=createNavigation(livingRoomMap);source={x:.33,y:.81};
 overlay=make('svg',{class:'living-navigation-debug',viewBox:'0 0 1415 1111','aria-hidden':'true'});
 overlay.style.pointerEvents='none';
 const syncFit=()=>overlay.setAttribute('preserveAspectRatio',getComputedStyle(scene).backgroundSize==='contain'?'xMidYMid meet':'xMidYMid slice');
 syncFit();if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(syncFit);resizeObserver.observe(scene)}
 const geometry=make('g');
 for(const floor of livingRoomMap.walkable)geometry.append(make('polygon',{points:polygon(floor),fill:'#45ff8090',stroke:'#004b29','stroke-width':4}));
 for(const obstacle of livingRoomMap.obstacles)geometry.append(make('polygon',{points:polygon(obstacle.polygon),fill:'#ff3c6580',stroke:'#87112e','stroke-width':3}));
 for(const point of nav.points.filter((_,i)=>nav.clear[i]))geometry.append(make('circle',{cx:point.x*1415,cy:point.y*1111,r:2,fill:'#074c30'}));
 for(const spot of livingRoomMap.restingSpots)geometry.append(make('circle',{cx:spot.point.x*1415,cy:spot.point.y*1111,r:9,fill:'#ffe543',stroke:'#674700','stroke-width':3}));
 for(const target of livingRoomMap.interactions)geometry.append(make('circle',{cx:target.point.x*1415,cy:target.point.y*1111,r:8,fill:'#48c9ff',stroke:'#003967','stroke-width':3}));
 geometry.append(make('circle',{cx:livingRoomMap.spawn.x*1415,cy:livingRoomMap.spawn.y*1111,r:11,fill:'#fff',stroke:'#004b29','stroke-width':3}));
 routeLayer=make('g');overlay.append(geometry,routeLayer);scene.append(overlay);
 status=document.createElement('p');status.className='living-navigation-status';status.setAttribute('role','status');scene.after(status);
 sceneListener=e=>{
  if(e.target.closest('#guardianArea,.room-sign,.companion-speech'))return;
  e.stopImmediatePropagation();const rect=scene.getBoundingClientRect();
  const target=sceneToImage({x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height},livingRoomMap.image,rect,{fit:getComputedStyle(scene).backgroundSize==='contain'?'contain':'cover'});
  drawRoute(target);
 };
 scene.addEventListener('click',sceneListener,true);
 drawRoute({x:.78,y:.974});
}
function drawRoute(target){
 const result=findPath({navigation:nav,start:source,target});routeLayer.replaceChildren();
 if(result.points.length){routeLayer.append(make('polyline',{points:polygon(result.points),fill:'none',stroke:'#fff','stroke-width':15,'stroke-linejoin':'round','stroke-linecap':'round'}));routeLayer.append(make('polyline',{points:polygon(result.points),fill:'none',stroke:'#1261e8','stroke-width':8,'stroke-linejoin':'round','stroke-linecap':'round'}));}
 routeLayer.append(make('circle',{cx:source.x*1415,cy:source.y*1111,r:13,fill:'#1261e8',stroke:'#fff','stroke-width':4}));
 if(result.nearest)routeLayer.append(make('circle',{cx:result.nearest.x*1415,cy:result.nearest.y*1111,r:11,fill:'#f7941d',stroke:'#fff','stroke-width':4}));
 status.textContent=`Navigation debug: ${result.status}; ${result.points.length} route points. Green is floor, red is furniture, yellow is rest, blue is interaction or route. Tap to preview another destination.`;
}
export function removeLivingNavigationDebug(){if(sceneRef&&sceneListener)sceneRef.removeEventListener('click',sceneListener,true);resizeObserver?.disconnect();overlay?.remove();status?.remove();overlay=routeLayer=status=sceneListener=sceneRef=nav=resizeObserver=null}
