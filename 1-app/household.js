import {periodStart} from './periods.js';
import {uniqueWins,hasRecordedPerson,displayPersonName,completionPoints} from './completion-history.js?v=release-20261010-v3';
const clean=value=>String(value||'').trim();

export function personName(email=''){
 const local=clean(email).split('@')[0].replace(/[._-]+/g,' ').trim();
 return local?local.replace(/\b\p{L}/gu,c=>c.toLocaleUpperCase()):'Household member';
}

export function ensurePerson(state,person){
 if(!person?.id)return false;
 state.householdPeople ||= [];
 const current=state.householdPeople.find(item=>item.id===person.id);
 const next={id:person.id,name:clean(current?.displayName||person.displayName||person.name)||personName(person.email),...(person.email?{email:person.email}:{})};
 if(!current){state.householdPeople.push(next);return true}
 let changed=false;
 for(const [key,value] of Object.entries(next))if(value&&current[key]!==value){current[key]=value;changed=true}
 return changed;
}

export function householdScoreboard(state,period=0){
 const people=new Map((state.householdPeople||[]).filter(person=>person.id!=='local-device').map(person=>[person.id,{id:person.id,name:displayPersonName(person),points:0}]));
 for(const win of uniqueWins(state)){
  if(period!=='0'&&period!==0&&(!Number.isFinite(Date.parse(win.at))||Date.parse(win.at)<periodStart(period)||Date.parse(win.at)>Date.now()))continue;
  if(!hasRecordedPerson(win))continue;
  if(!people.has(win.completedBy))people.set(win.completedBy,{id:win.completedBy,name:win.completedByName||'Household member',points:0});
  people.get(win.completedBy).points+=completionPoints(win);
 }
 if(period==='0'||period===0)for(const row of state.completionArchive||[]){if(!row.completedBy)continue;if(!people.has(row.completedBy))people.set(row.completedBy,{id:row.completedBy,name:row.completedByName||'Former household member',points:0});people.get(row.completedBy).points+=row.count||0}
 return [...people.values()].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name));
}

export function unseenActivity(state,{personId='',shoppingSeen=0,notesSeen=0}={}){
 const unseen=(items,seen)=>items.filter(item=>item.createdBy&&item.createdBy!==personId&&Date.parse(item.createdAt)>seen).length;
 return {shopping:unseen(state.shopping||[],shoppingSeen),notes:unseen(state.notes||[],notesSeen)};
}

export function setDisplayName(state,person,name){
 const value=clean(name);if(!person?.id||person.id==='local-device'||!value||value.length>60)return false;
 ensurePerson(state,person);const member=state.householdPeople.find(p=>p.id===person.id);
 member.displayName=value;member.name=value;return true;
}
