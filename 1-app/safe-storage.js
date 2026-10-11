// Keep failed writes in memory and protect unreadable originals from replacement.
export function createSafeStorage(getStore,onIssue=()=>{}){
 const memory=new Map(),protectedValues=new Map(),issues=new Map();
 const report=(key,type,error)=>{issues.set(key,{key,type,message:error?.message||String(error)});onIssue([...issues.values()])};
 const api={
  getItem(key){if(memory.has(key))return memory.get(key);try{return getStore().getItem(key)}catch(error){report(key,'unavailable',error);return null}},
  setItem(key,value){value=String(value);if(protectedValues.has(key))return false;memory.set(key,value);try{getStore().setItem(key,value);memory.delete(key);issues.delete(key);onIssue([...issues.values()]);return true}catch(error){report(key,'write',error);return false}},
  removeItem(key){if(protectedValues.has(key))return false;memory.set(key,null);try{getStore().removeItem(key);memory.delete(key);issues.delete(key);return true}catch(error){report(key,'write',error);return false}},
  readJSON(key,fallback,validate=()=>true){const raw=api.getItem(key);if(raw===null)return structuredClone(fallback);try{const value=JSON.parse(raw);if(!validate(value))throw Error('Saved data has an invalid structure.');return value}catch(error){protectedValues.set(key,raw);report(key,'invalid',error);return structuredClone(fallback)}},
  preserve(key,raw,error){protectedValues.set(key,raw);report(key,'invalid',error)},
  issues:()=>[...issues.values()],originals:()=>Object.fromEntries(protectedValues),
  allowRecovery(){protectedValues.clear();for(const [key,issue] of issues)if(issue.type==='invalid')issues.delete(key);onIssue([...issues.values()])},
  retry(){for(const [key,value] of [...memory])value===null?api.removeItem(key):api.setItem(key,value);return issues.size===0}
 };return api;
}
const announce=()=>{if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('mc-storage-status'))};
export const localStorage=createSafeStorage(()=>globalThis.localStorage,announce);
export const sessionStorage=createSafeStorage(()=>globalThis.sessionStorage,announce);
export const criticalStorageProblem=()=>localStorage.issues().some(issue=>['mc-state-v1','mc-sync-v2','mc-config-v1'].includes(issue.key));
export function downloadJSON(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
