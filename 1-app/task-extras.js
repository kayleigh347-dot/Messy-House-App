import {dueAt,freshTask,ordered} from './v2-state.js?v=release-20261010-v3';
import {descendants} from './subtasks.js';
export function activeSavedTasks(state,template){return state.tasks.filter(task=>!task.done&&!task.parentId&&task.roomId===template.roomId&&(task.sourceTemplateId===template.id||task.text.trim().toLocaleLowerCase()===template.text.trim().toLocaleLowerCase()))}
export function removeSavedTasks(state,template){const roots=activeSavedTasks(state,template),ids=new Set(roots.flatMap(root=>[root,...descendants(state.tasks,root.id)]).map(task=>task.id));state.tasks=state.tasks.filter(task=>!ids.has(task.id));return roots.length}
export function addSavedTasks(state,ids,newId=()=>crypto.randomUUID(),now=new Date().toISOString()){
 const selected=new Set(ids),roots=ordered(state.templates).filter(t=>selected.has(t.id)&&!t.parentTemplateId&&state.rooms.some(r=>r.id===t.roomId&&!r.archived)),start=Math.max(-1,...state.tasks.map(t=>t.order??0))+1;let count=0;
 for(const template of roots){if(activeSavedTasks(state,template).length)continue;const family=[],pending=[template];while(pending.length){const item=pending.shift();family.push(item);pending.push(...ordered(state.templates.filter(child=>child.parentTemplateId===item.id)))}const generated=new Map(),baseOrder=start+count;
  for(const [index,item] of family.entries()){const fresh=freshTask({...item,roomId:template.roomId,area:state.rooms.find(room=>room.id===template.roomId)?.name||template.area},newId(),now,baseOrder+index);generated.set(item.id,fresh);if(item.parentTemplateId)fresh.parentId=generated.get(item.parentTemplateId)?.id||generated.get(template.id).id;state.tasks.push(fresh);count++}
 }
 return count;
}
export function saveReusable(state,task,allRooms=false,newId=()=>crypto.randomUUID()){
 const groupId=allRooms?newId():null,rooms=allRooms?state.rooms.filter(r=>!r.archived):state.rooms.filter(r=>r.id===task.roomId),source=[task,...(task.parentId?[]:descendants(allItems(state,task),task.id))];
 for(const room of rooms){const ids=new Map();for(const item of source){const template={id:newId(),groupId,sourceId:item.id,text:item.text,roomId:room.id,area:room.name,notes:item.notes||'',allowanceDays:item.allowanceDays||null,messImpact:item.messImpact||'normal',priority:item.priority||'mid',order:state.templates.length};if(item.parentId)template.parentTemplateId=ids.get(item.parentId)||ids.get(task.id);ids.set(item.id,template.id);state.templates.push(template)}}
}
function allItems(state,task){return state.side?.some(x=>x.id===task.id)?state.side:state.tasks}
export function deleteReusable(state,template,allRooms=false){
 const ids=new Set(state.templates.filter(t=>allRooms&&template.groupId?t.groupId===template.groupId:t.id===template.id).map(t=>t.id));let changed=true;while(changed){changed=false;for(const t of state.templates)if(ids.has(t.parentTemplateId)&&!ids.has(t.id)){ids.add(t.id);changed=true}}state.templates=state.templates.filter(t=>!ids.has(t.id));
}
export function roomTemplates(state,roomId){return state.templates.filter(t=>t.roomId===roomId&&!t.parentTemplateId)}
export function reusableSuggestionEligible(item,now=Date.now(),completedAt=item?.completedAt||item?.at){
 if(item?.reusableDismissedAt)return false;
 const completed=Date.parse(completedAt);return !Number.isFinite(completed)||now-completed<=30*86400000;
}
export function nextTaskId(tasks,current){const at=tasks.findIndex(t=>t.id===current);return tasks.length?tasks[(at+1)%tasks.length].id:null}

export function taskDeadline(task){
 if(task.done||task.pausedAt||task.scheduled)return null;
 if(task.recurrence){const date=Date.parse(task.nextDue||task.activeSince||task.created);return Number.isFinite(date)?date:null;}
 const allowance=dueAt(task);if(allowance!==null)return allowance;
 const recurring=task.recurrence?Date.parse(task.nextDue):NaN;
 return Number.isFinite(recurring)?recurring:null;
}

export function overdueTaskGroups(tasks,now=Date.now()){
 const overdue=ordered(tasks.filter(task=>{const due=taskDeadline(task);return !task.parentId&&due!==null&&due<now}));
 return {important:overdue.filter(task=>task.recurrence&&task.importantWhenOverdue),other:overdue.filter(task=>!task.recurrence||!task.importantWhenOverdue)};
}

// Cleaned backups name exact duplicate IDs; importing one can remove those originals.
// Only matching unfinished roots are removed, keeping newer completions and all children.
export function applyBackupCleanup(state,cleanup){
 if(cleanup?.version!==1||!cleanup.replacements||typeof cleanup.replacements!=='object')return 0;
 const removed=new Map();
 for(const [id,keepId] of Object.entries(cleanup.replacements)){
  if(typeof keepId!=='string'||id===keepId)continue;
  const task=state.tasks.find(t=>t.id===id),keep=state.tasks.find(t=>t.id===keepId);
  if(!task||!keep||task.done||task.parentId||keep.parentId||task.roomId!==keep.roomId||task.text.trim().toLocaleLowerCase()!==keep.text.trim().toLocaleLowerCase())continue;
  removed.set(id,keepId);
 }
 for(const task of state.tasks)if(removed.has(task.parentId))task.parentId=removed.get(task.parentId);
 state.tasks=state.tasks.filter(task=>!removed.has(task.id));if(removed.has(state.current))state.current=removed.get(state.current);
 return removed.size;
}

// Exact IDs and test-labelled titles are both required, so real data is retained.
export function applyBackupTestCleanup(state,cleanup){
 if(cleanup?.version!==1||!cleanup.testEntries)return 0;
 let count=0;const removedTasks=new Set();
 for(const field of ['tasks','side','wins','templates','errands','notes','notifications','completionArchive']){
  const ids=cleanup.testEntries[field];if(!Array.isArray(ids)||!Array.isArray(state[field]))continue;
  const selected=new Set(ids.filter(id=>typeof id==='string'));
  state[field]=state[field].filter(item=>{
   if(!selected.has(item.id)||! /^(?:test(?:ing)?|preview|sample|dummy|smoke(?: test)?|codex)(?:\s*[:—-]|\s|$)/i.test(item.text?.trim()||''))return true;
   count++;if(field==='tasks')removedTasks.add(item.id);return false;
  });
 }
 if(removedTasks.has(state.current))state.current=null;
 return count;
}
