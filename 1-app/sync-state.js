import {normalize,activateDue} from "./v2-state.js?v=purple-subtasks-1";
export const empty=()=>({tasks:[],side:[],wins:[],rewards:[],shopping:[],appointments:[],errands:[],notes:[],householdPeople:[],notifications:[],current:null});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Only a saved copy of this exact account + house may participate in its merge.
export function openHouseState(remote,cached,owner,houseId){
 if(cached?.meta?.owner===owner&&cached.meta.houseId===houseId){
  return merge(cached.meta.base||empty(),cached.state,remote);
 }
 return normalize(remote);
}
export function merge(base,local,remote){
  base=normalize(base);local=normalize(local);remote=normalize(remote);
  const out=structuredClone(remote);
  for(const key of ['tasks','side','wins','completionArchive','rewards','rooms','templates','homeless','shopping','appointments','errands','notes','householdPeople','notifications','settings']){
    const before=new Map((base[key]||[]).map(x=>[x.id,x]));
    const mine=new Map((local[key]||[]).map(x=>[x.id,x]));
    const result=new Map((remote[key]||[]).map(x=>[x.id,structuredClone(x)]));
    for(const [id,item] of before)if(!mine.has(id))result.delete(id);
    for(const [id,item] of mine){
      const old=before.get(id);
      if(equal(old,item))continue;
      if(!old||!result.has(id)){result.set(id,structuredClone(item));continue}
      const next=result.get(id);
      for(const field of new Set([...Object.keys(old),...Object.keys(item)])){
        if(!equal(old[field],item[field])){
          if(field in item)next[field]=structuredClone(item[field]);else delete next[field];
        }
      }
    }
    out[key]=[...result.values()];
    if(key==='completionArchive')for(const row of out[key])row.count=Math.max(row.count||0,local[key]?.find(item=>item.id===row.id)?.count||0,remote[key]?.find(item=>item.id===row.id)?.count||0);
  }
  out.wins.sort((a,b)=>b.at.localeCompare(a.at));
  const archivedThrough=[base.historyArchivedThrough,local.historyArchivedThrough,remote.historyArchivedThrough].filter(Boolean).sort().at(-1);if(archivedThrough)out.historyArchivedThrough=archivedThrough;
  out.current=local.current!==base.current?local.current:remote.current;
  if(!out.tasks.some(t=>t.id===out.current&&!t.done&&!t.scheduled))out.current=null;
  return normalize(out);
}

// Keep live card references valid when a background poll has no visible changes.
export function reconcileSync(snapshot,current,combined){
 const next=merge(snapshot,current,combined);activateDue(next);
 return equal(next,current)?current:next;
}
