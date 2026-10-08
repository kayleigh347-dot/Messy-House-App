// Stable floor positions keep clutter from jumping when tasks change.
import {imageToScene} from './room-navigation.js';
const spots=[[17,83,-14],[72,88,12],[42,91,-8],[82,73,19],[29,73,9],[58,80,-18],[8,92,16],[62,95,8],[47,69,-12],[88,94,-9],[12,66,14],[76,62,-17],[35,85,21],[54,59,7],[25,96,-5],[91,82,12]];
// Measured image-space positions. Only the substantial box and folded-cloth piles
// are solid, and only after opacity reaches 0.5; small scraps remain decorative.
const livingSpots=[
 [.21,.943,'paper',-14], [.31,.902,'box',12], [.42,.947,'cloth',-8], [.64,.957,'dust',19],
 [.29,.925,'dish',9], [.27,.886,'box',-18], [.35,.957,'paper',16], [.55,.967,'cloth',8],
 [.47,.955,'dust',-12], [.72,.965,'paper',-9], [.24,.931,'dish',14], [.77,.966,'dust',-17],
 [.38,.944,'paper',21], [.60,.969,'cloth',7], [.33,.931,'dust',-5], [.81,.967,'paper',12]
];
const rect=(x,y,halfX,halfY)=>[{x:x-halfX,y:y-halfY},{x:x+halfX,y:y-halfY},{x:x+halfX,y:y+halfY},{x:x-halfX,y:y+halfY}];
const themes={
 'room-master':['cloth','paper','dust','cloth'],
 'room-penny':['cloth','box','paper','dust'],
 'room-bathroom':['cloth','dust','paper','cloth'],
 'room-kitchen':['dish','paper','dust','dish'],
 'room-living':['paper','cloth','dish','dust'],
 'room-craft':['paper','cloth','box','paper'],
 'room-print':['box','paper','dust','paper'],
 'room-cats':['paper','dust','box','dust'],
 'room-hall':['paper','box','dust','cloth'],
 'room-entrance':['box','paper','dust','cloth']
};
export function messPieces(roomId,percent){
 const amount=Math.max(0,Math.min(100,Number(percent)||0))/100*spots.length;
 if(roomId==='room-living')return livingSpots.slice(0,Math.ceil(amount)).map(([x,y,kind,angle],i)=>({
  id:`living-clutter-${i}`,imagePoint:{x,y},angle,kind,opacity:Math.min(1,amount-i),
  navigationRole:['box','cloth'].includes(kind)?'solid':'decorative',
  footprint:rect(x,y,kind==='box'?.011:.014,kind==='box'?.008:.007)
 }));
 const theme=themes[roomId]||['paper','dust','box','cloth'];
 return spots.slice(0,Math.ceil(amount)).map(([left,top,angle],i)=>({id:`${roomId}-clutter-${i}`,left,top,angle,kind:theme[i%theme.length],opacity:Math.min(1,amount-i),navigationRole:'decorative'}));
}
export function solidMessObstacles(pieces){return pieces.filter(p=>p.navigationRole==='solid'&&p.opacity>=.5).map(p=>({id:p.id,polygon:p.footprint}))}
export function messGeometrySignature(pieces){return solidMessObstacles(pieces).map(p=>`${p.id}:${p.polygon.map(v=>`${v.x},${v.y}`).join(';')}`).join('|')}
export function positionRoomMess(scene,roomId,pieces){
 if(roomId!=='room-living')return;
 const rect=scene.getBoundingClientRect(),children=scene.querySelector('.room-mess')?.children||[];
 if(!rect.width||!rect.height)return;
 for(let i=0;i<children.length;i++){
  const point=imageToScene(pieces[i].imagePoint,{width:1415,height:1111},rect,{fit:getComputedStyle(scene).backgroundSize==='contain'?'contain':'cover'});
  children[i].style.left=point.x*100+'%';children[i].style.top=point.y*100+'%';
 }
}
export function renderRoomMess(scene,roomId,percent,pieces=messPieces(roomId,percent)){
 let layer=scene.querySelector('.room-mess');
 if(!layer){layer=document.createElement('div');layer.className='room-mess';layer.setAttribute('aria-hidden','true');scene.append(layer)}
 layer.replaceChildren();
 for(const piece of pieces){
  const item=document.createElement('span');item.className=`mess-piece mess-${piece.kind}`;
  item.setAttribute('data-clutter-id',piece.id);
  Object.assign(item.style,{left:(piece.left??0)+'%',top:(piece.top??0)+'%',transform:`translate(-50%,-50%) rotate(${piece.angle}deg)`,opacity:piece.opacity});
  layer.append(item);
 }
 positionRoomMess(scene,roomId,pieces);
}
