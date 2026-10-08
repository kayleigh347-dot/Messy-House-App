// Fixed household colours; additional rooms take unused hues outside the red range.
export function roomHues(rooms){
 const fixed={'room-penny':325,'room-master':175,'room-bathroom':210,'room-kitchen':275,'room-living':140,'room-entrance':42,'room-hall':65,'room-cats':95,'room-print':240,'room-craft':295};
 const used=new Set(Object.values(fixed)),result=new Map();
 for(const room of rooms){let hue=fixed[room.id];if(hue===undefined){hue=Array.from({length:296},(_,i)=>i+35).filter(h=>!used.has(h)).sort((a,b)=>Math.min(...[...used].map(h=>Math.abs(h-a)))-Math.min(...[...used].map(h=>Math.abs(h-b)))).at(-1);used.add(hue)}result.set(room.id,hue)}return result;
}
