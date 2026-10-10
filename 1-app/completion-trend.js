import {periodStart} from './periods.js';
import {uniqueWins,completionPeople,completionPoints} from './completion-history.js';

const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const bucketKey=(date,unit)=>{
 const day=new Date(date);if(unit==='month')return dateKey(day).slice(0,7);
 if(unit==='week')day.setDate(day.getDate()-(day.getDay()+6)%7);
 return dateKey(day);
};
export function completionTrend(state,unit='day',now=new Date(),roomId='',options={}){
 const anchor=new Date(now);anchor.setHours(12,0,0,0);
 const hasPeriod=options.period!==undefined,start=hasPeriod?periodStart(options.period,+now,[...uniqueWins(state).map(win=>Date.parse(win.at)),...(state.completionArchive||[]).map(row=>Date.parse(row.month+'-01'))]):null;
 const first=new Date(hasPeriod?start:anchor);if(!hasPeriod){if(unit==='month'){first.setDate(1);first.setMonth(first.getMonth()-11)}else first.setDate(first.getDate()-(unit==='week'?77:13))}
 first.setHours(0,0,0,0);if(unit==='month')first.setDate(1);else if(unit==='week')first.setDate(first.getDate()-(first.getDay()+6)%7);
 const buckets=[];for(const date=new Date(first);date<=now;){buckets.push({key:bucketKey(date,unit),label:unit==='month'?date.toLocaleDateString([],{month:'short',year:'2-digit'}):date.toLocaleDateString([],{day:'numeric',month:'short'})});if(unit==='month')date.setMonth(date.getMonth()+1);else date.setDate(date.getDate()+(unit==='week'?7:1))}
 const people=completionPeople(state),byName=pattern=>people.find(person=>pattern.test(person.name||'')),chosen=[byName(/^kayleigh/i),byName(/^(andy|andrew)/i)];
 const rows=chosen.map((person,index)=>({id:person?.id||'',name:person?.name||['Kayleigh','Andy'][index],counts:buckets.map(()=>0)}));
 const positions=new Map(buckets.map((bucket,index)=>[bucket.key,index]));
 for(const win of uniqueWins(state).filter(completionPoints)){if(roomId&&win.roomId!==roomId)continue;const date=new Date(win.at);if(+date>+now||(hasPeriod&&+date<start)||(options.personId&&win.completedBy!==options.personId))continue;const row=rows.find(item=>item.id&&item.id===win.completedBy);if(!row||!Number.isFinite(+date))continue;const position=positions.get(bucketKey(date,unit));if(position!==undefined)row.counts[position]++}
 if(unit==='month')for(const archived of state.completionArchive||[]){if(roomId&&archived.roomId!==roomId)continue;if(options.personId&&archived.completedBy!==options.personId)continue;if(hasPeriod&&String(options.period)!=='0'&&Date.parse(archived.month+'-01')<start)continue;const row=rows.find(item=>item.id&&item.id===archived.completedBy),position=positions.get(archived.month);if(row&&position!==undefined)row.counts[position]+=Number(archived.count)||0}
 return {buckets,rows:options.personId?rows.filter(row=>row.id===options.personId):rows};
}
