const DAY=86400000;
export function validCivilDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
}
export function addCivilDays(value,days){
 if(!validCivilDate(value)||!Number.isInteger(days))throw Error('Choose a valid date and number of days.');
 const date=new Date(value+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);
}
export function civilDaysBetween(first,last){
 if(!validCivilDate(first)||!validCivilDate(last))throw Error('Invalid recommendation date.');
 return Math.round((Date.parse(last+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/DAY);
}
export function localCivilTime(now,timeZone){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));
 const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return {date:values.year+'-'+values.month+'-'+values.day,hour:Number(values.hour)};
}
export function effectiveFlowDay(now,timeZone){const local=localCivilTime(now,timeZone);return local.hour>=3?local.date:addCivilDays(local.date,-1);}
export function annualDate(date,year,leapDayPolicy){
 if(!validCivilDate(date)||!Number.isInteger(year))throw Error('Choose a valid event date.');
 const next=String(year).padStart(4,'0')+date.slice(4);if(validCivilDate(next))return next;
 if(date.slice(5)!=='02-29'||!['feb-28','mar-01'].includes(leapDayPolicy))throw Error('Choose how to handle 29 February.');
 return String(year).padStart(4,'0')+(leapDayPolicy==='feb-28'?'-02-28':'-03-01');
}
