// Pure operations on the conceptual area/mapping records. Persistence is supplied
// only after ownership/storage is approved; existing task.area remains a room name.
const name=value=>{if(typeof value!=='string'||!value.trim()||value.trim().length>100)throw Error('Enter an area name of up to 100 characters.');return value.trim()};
export function createRoomArea(areas,{id,roomId,name:label}){
 if(typeof id!=='string'||!id||typeof roomId!=='string'||!roomId||areas.some(area=>area.id===id))throw Error('Invalid area identity.');
 const text=name(label);
 if(areas.some(area=>area.roomId===roomId&&!area.deletedAt&&area.name.toLocaleLowerCase()===text.toLocaleLowerCase()))throw Error('That area already exists in this room.');
 return [...structuredClone(areas),{id,roomId,name:text,sortIndex:Math.max(-1,...areas.filter(area=>area.roomId===roomId).map(area=>area.sortIndex??0))+1}];
}
export function renameRoomArea(areas,id,label){
 const area=areas.find(item=>item.id===id&&!item.deletedAt);if(!area)throw Error('This area is no longer available.');
 const text=name(label);
 if(areas.some(item=>item.id!==id&&!item.deletedAt&&item.roomId===area.roomId&&item.name.toLocaleLowerCase()===text.toLocaleLowerCase()))throw Error('That area already exists in this room.');
 return areas.map(item=>item.id===id?{...structuredClone(item),name:text}:structuredClone(item));
}
export function assignRoomArea(assignments,areas,{id,taskId,roomId,areaId}){
 if([id,taskId,roomId].some(value=>typeof value!=='string'||!value)||areaId!==null&&!areas.some(area=>area.id===areaId&&area.roomId===roomId&&!area.deletedAt))throw Error('Choose an area in the same room.');
 const previous=assignments.find(item=>item.taskId===taskId);
 if(assignments.some(item=>item.id===id&&item.taskId!==taskId)||previous&&previous.roomId!==roomId)throw Error('Invalid assignment identity.');
 const next=structuredClone(assignments),record={...(previous||{}),id:previous?.id||id,taskId,roomId,areaId};
 if(previous)Object.assign(next.find(item=>item.id===previous.id),record);else next.push(record);return next;
}
export function deleteRoomArea(areas,assignments,id,at){
 if(typeof at!=='string'||!Number.isFinite(Date.parse(at)))throw Error('Invalid deletion date.');
 const area=areas.find(item=>item.id===id&&!item.deletedAt);if(!area)throw Error('This area is no longer available.');
 return {areas:areas.map(item=>item.id===id?{...structuredClone(item),deletedAt:at}:structuredClone(item)),assignments:assignments.map(item=>item.areaId===id?{...structuredClone(item),areaId:null}:structuredClone(item))};
}
export function roomAreaMatches(task,assignments,areas,selected='all'){
 if(selected==='all')return true;
 const record=assignments.find(item=>item.taskId===task.id&&item.roomId===task.roomId)||assignments.find(item=>item.taskId===task.clearWaySourceTaskId&&item.roomId===task.roomId);
 const area=areas.find(item=>item.id===record?.areaId&&item.roomId===task.roomId&&!item.deletedAt);
 return selected==='unassigned'?!area:area?.id===selected;
}
