import {validCivilDate,addCivilDays,annualDate} from './flow-dates.js';
export const eventTemplates={christmas:{name:'Christmas',steps:['Start Christmas shopping','Check lights and decorations','Sort toys before gifts arrive','Organise decorations','Put up decorations','Buy wrapping supplies','Wrap gifts','Plan food shopping']},birthday:{name:'Birthday',steps:['Look for gifts','Plan celebration','Arrange guests or venue','Order cake','Purchase supplies','Wrap gifts','Put out decorations']}};
export function validateFlowEvent(event){
 if(!event||typeof event.id!=='string'||!event.id||typeof event.name!=='string'||!event.name.trim()||!validCivilDate(event.date)||!Array.isArray(event.steps))throw Error('Choose an event name, date and steps.');
 if(event.annual&&event.date.slice(5)==='02-29'&&!['feb-28','mar-01'].includes(event.leapDayPolicy))throw Error('Choose how to handle 29 February.');
 const ids=new Set();for(const step of event.steps){if(!step.id||ids.has(step.id)||typeof step.text!=='string'||!step.text.trim()||!Number.isInteger(step.lead)||step.lead<0||!['days','weeks'].includes(step.unit)||!['flexible','target'].includes(step.kind))throw Error('Choose valid event preparation steps.');ids.add(step.id);}
 return structuredClone(event);
}
export function projectFlowEvents(events,{start,end}){
 const entries=[];
 for(const raw of events||[]){if(raw.deletedAt||raw.enabled===false)continue;const event=validateFlowEvent(raw),years=event.annual?Array.from({length:Math.max(0,Number(end.slice(0,4))-Number(event.date.slice(0,4))+2)},(_,i)=>Number(event.date.slice(0,4))+i):[Number(event.date.slice(0,4))];
  for(const year of years){const date=event.annual?annualDate(event.date,year,event.leapDayPolicy):event.date;
   for(const step of event.steps){const recommendedOn=addCivilDays(date,-step.lead*(step.unit==='weeks'?7:1)),id=event.id+':'+year+':'+step.id;
    if(recommendedOn>end)continue;
    // Past events remain inspectable at their original target; they never roll into a new year.
    if(date<start&&event.afterEvent==='hide')continue;
    entries.push({id,eventId:event.id,eventName:event.name,occurrenceYear:year,stepId:step.id,title:step.text,roomId:step.roomId||null,originalRecommendedOn:recommendedOn,targetOn:step.kind==='target'?recommendedOn:null,displayOn:step.kind==='target'?recommendedOn:recommendedOn<start?start:recommendedOn});
   }
  }
 }
 return entries;
}
