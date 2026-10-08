export const companionLayouts={
"room-hall": {"name": "Direction Creature", "spots": {"center": {"x": 40, "y": 45}, "left": {"x": 26, "y": 52}, "front": {"x": 43, "y": 59}, "right": {"x": 60, "y": 52}}},
"room-entrance": {"name": "Parcel Dragon", "spots": {"center": {"x": 40, "y": 45}, "left": {"x": 26, "y": 52}, "front": {"x": 43, "y": 59}, "right": {"x": 60, "y": 52}}},
"room-penny": {"name": "Winged Cat", "spots": {"center": {"x": 47, "y": 48}, "left": {"x": 32, "y": 54}, "front": {"x": 47, "y": 62}, "right": {"x": 62, "y": 54}}},
"room-master": {"name": "Bigfoot", "spots": {"center": {"x": 47, "y": 45}, "left": {"x": 35, "y": 56}, "front": {"x": 48, "y": 63}, "right": {"x": 53, "y": 59}}},
"room-kitchen": {"name": "Kitchen Gremlin", "spots": {"center": {"x": 40, "y": 45}, "left": {"x": 26, "y": 52}, "front": {"x": 43, "y": 59}, "right": {"x": 60, "y": 52}}},
 'room-living':{name:'Nature Sprite',spots:{sofa:{x:44,y:43},rug:{x:36,y:63},window:{x:17,y:60},cosy:{x:60,y:64}}},
 'room-bathroom':{name:'Water Sprite',spots:{center:{x:42,y:47},bath:{x:28,y:47},basket:{x:62,y:47},door:{x:45,y:59}}}
};

// Match a tap to a pre-approved resting place instead of crossing furniture.
export function nearestCompanionSpot(roomId,x,y){
 const layout=companionLayouts[roomId];
 if(!layout||!Number.isFinite(x)||!Number.isFinite(y))return null;
 let best=null,distance=Infinity;
 for(const [name,p] of Object.entries(layout.spots)){
  const d=(p.x+12-x)**2+(p.y+30-y)**2;
  if(d<distance){distance=d;best=name}
 }
 return best;
}
