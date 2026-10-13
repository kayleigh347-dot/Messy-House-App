const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const ROOM_CONFIGURATION_COLLECTIONS=['setups','drafts','areas','assignments','routineVariations','routineVisibility'];
const fields={setups:['houseId','roomId','name','draft','deletedAt'],drafts:['houseId','roomId','name','draft','setupId','updatedAt','deletedAt'],areas:['houseId','roomId','name','sortIndex','deletedAt'],assignments:['houseId','roomId','taskId','areaId'],routineVariations:['houseId','roomId','name','steps','baseRoutineId','deletedAt'],routineVisibility:['houseId','roomId','routineId','hidden']};
export const initialRoomConfiguration=userId=>Object.fromEntries([['userId',userId],['revision',0],...ROOM_CONFIGURATION_COLLECTIONS.map(key=>[key,[]])]);
export function validatePreparationRoutine(value){
 if(!object(value)||typeof value.id!=='string'||!value.id||typeof value.roomId!=='string'||!value.roomId||typeof value.name!=='string'||!value.name.trim()||value.name.length>100||!Array.isArray(value.steps)||!value.steps.length)throw Error('Invalid preparation routine.');
 const ids=new Set();for(const step of value.steps){if(!object(step)||typeof step.id!=='string'||!step.id||ids.has(step.id)||typeof step.label!=='string'||!step.label.trim()||step.instructions!=null&&typeof step.instructions!=='string'||typeof step.pickup!=='boolean'||typeof step.important!=='boolean'||typeof step.optional!=='boolean'||step.pickup&&(typeof step.followUpText!=='string'||!step.followUpText.trim()))throw Error('Invalid preparation step.');ids.add(step.id)}
 return structuredClone(value);
}
function validateItem(collection,item){
 if(!object(item)||typeof item.id!=='string'||!item.id||typeof item.roomId!=='string'||!item.roomId||typeof item.houseId!=='string'||!item.houseId)throw Error('Invalid personal room record.');
 if(item.deletedAt!=null&&(typeof item.deletedAt!=='string'||!Number.isFinite(Date.parse(item.deletedAt))))throw Error('Invalid deletion date.');
 if(item.updatedAt!=null&&(typeof item.updatedAt!=='string'||!Number.isFinite(Date.parse(item.updatedAt))))throw Error('Invalid draft update date.');
 if(item.setupId!=null&&(typeof item.setupId!=='string'||!item.setupId))throw Error('Invalid saved setup identity.');
 if(collection==='setups'||collection==='drafts'){
  if(typeof item.name!=='string'||!item.name.trim()||item.name.length>100||!object(item.draft)||item.draft.roomId!==item.roomId||item.draft.version!==1||!Array.isArray(item.draft.tasks))throw Error('Invalid saved room setup.');
 }
 if(collection==='areas'&&(typeof item.name!=='string'||!item.name.trim()||item.name.length>100||!Number.isSafeInteger(item.sortIndex)||item.sortIndex<0))throw Error('Invalid personal area.');
 if(collection==='assignments'&&(typeof item.taskId!=='string'||!item.taskId||!(item.areaId===null||typeof item.areaId==='string'&&item.areaId)))throw Error('Invalid personal area assignment.');
 if(collection==='routineVariations'){validatePreparationRoutine(item);if(typeof item.baseRoutineId!=='string'||!item.baseRoutineId)throw Error('Invalid routine variation.');}
 if(collection==='routineVisibility'&&(typeof item.routineId!=='string'||!item.routineId||typeof item.hidden!=='boolean'))throw Error('Invalid personal routine visibility.');
}
export function validateRoomConfiguration(record,userId){
 if(!object(record)||record.userId!==userId||!Number.isSafeInteger(record.revision)||record.revision<0)throw Error('Invalid personal room configuration.');
 record=structuredClone(record);for(const key of ['routineVariations','routineVisibility'])if(record[key]===undefined)record[key]=[];
 for(const collection of ROOM_CONFIGURATION_COLLECTIONS){
  if(!Array.isArray(record[collection]))throw Error('Invalid personal room configuration.');
  const ids=new Set();for(const item of record[collection]){validateItem(collection,item);if(ids.has(item.id))throw Error('Duplicate personal room record.');ids.add(item.id)}
 }
 const assigned=new Set();for(const item of record.assignments){const key=item.houseId+':'+item.roomId+':'+item.taskId;if(assigned.has(key))throw Error('Duplicate personal assignment.');assigned.add(key);if(item.areaId!==null&&!record.areas.some(area=>area.id===item.areaId&&area.roomId===item.roomId&&area.houseId===item.houseId&&!area.deletedAt))throw Error('Unknown personal area.');}
 return structuredClone(record);
}
export function roomConfigurationChanges(changes){
 if(!Array.isArray(changes)||!changes.length)throw Error('No personal room changes.');
 const ids=new Set();
 for(const change of changes){
  if(!object(change)||Object.keys(change).some(key=>!['collection','id','values'].includes(key))||!fields[change.collection]||typeof change.id!=='string'||!change.id||!object(change.values)||!Object.keys(change.values).length||Object.keys(change.values).some(key=>!fields[change.collection].includes(key)))throw Error('Invalid personal room change.');
  const key=change.collection+':'+change.id;if(ids.has(key))throw Error('Duplicate personal room change.');ids.add(key);
 }
 return structuredClone(changes);
}
// Reference implementation for synthetic tests. The server must merge and validate
// against the authenticated user's current row atomically with the revision check.
export function applyRoomConfigurationChanges(record,changes){
 const next=validateRoomConfiguration(record,record.userId);
 for(const change of roomConfigurationChanges(changes)){
  const list=next[change.collection],old=list.find(item=>item.id===change.id);
  if(old)Object.assign(old,change.values);else list.push({id:change.id,...change.values});
 }
 next.revision++;return validateRoomConfiguration(next,record.userId);
}
