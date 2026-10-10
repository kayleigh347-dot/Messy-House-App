import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLocalCalendar} from '../house-calendar.js';
class Node{
 constructor(tag='div'){this.tag=tag;this.children=[];this.className='';this.attrs={};this.style={setProperty(){}};this.dataset={};this.hidden=false;this.value='';this.classList={contains:name=>this.className.split(' ').includes(name),toggle:(name,on)=>{const set=new Set(this.className.split(' ').filter(Boolean));on?set.add(name):set.delete(name);this.className=[...set].join(' ')}}}
 append(...n){this.children.push(...n)} prepend(...n){this.children.unshift(...n)} replaceChildren(...n){this.children=n} setAttribute(k,v){this.attrs[k]=v} querySelector(){return null} scrollIntoView(){}
}
const walk=node=>[node,...node.children.flatMap(walk)];
function calendar(view='month',options={}){
 const elements=Object.fromEntries(['#houseCalendarGrid','#calendarView','#calendarRecurring','#calendarSetDay','#calendarMonthLabel','#calendarAgenda','#unscheduledErrands'].map(k=>[k,new Node()]));elements['#calendarView'].value=view;elements['#calendarRecurring'].checked=true;elements['#calendarSetDay'].checked=true;
 const state={rooms:[{id:'room-cats',name:'Cats'},{id:'room-kitchen',name:'Kitchen'}],tasks:[{id:'a',text:'Litter',roomId:'room-cats',recurrence:{kind:'weeks',every:1},nextDue:'2026-10-12T12:00:00Z'},{id:'b',text:'Counters',roomId:'room-kitchen',recurrence:{kind:'weeks',every:1},nextDue:'2026-10-12T12:00:00Z'}],appointments:[],errands:[]};
 renderLocalCalendar(state,new Date(2026,9,12),null,{elements,storageKey:'test-manual',showRoomFilter:false,...options});return elements;
}
test('month and week day headings invoke manual day selection, keeping every room visible',()=>{
 const oldDocument=globalThis.document,oldStorage=globalThis.sessionStorage;
 globalThis.document={createElement:tag=>new Node(tag),body:new Node()};globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
 try{for(const view of ['month','week']){let chosen;const elements=calendar(view,{showAgenda:false,onSelectDate:d=>chosen=d});const nodes=walk(elements['#houseCalendarGrid']),head=nodes.find(n=>n.className==='calendar-day-heading'&&n.attrs['aria-label'].includes('12'));
 head.onclick();assert.equal(chosen.getDate(),12);assert.equal(chosen.getMonth(),9);assert.equal(elements['#calendarAgenda'].hidden,true);
 if(view==='month')assert.equal(nodes.filter(n=>n.className.includes('calendar-room-symbol')).length,2);else{assert.ok(nodes.some(n=>n.textContent==='🐈 Cats'));assert.ok(nodes.some(n=>n.textContent==='🍽️ Kitchen'))}
 }}finally{globalThis.document=oldDocument;globalThis.sessionStorage=oldStorage}
});
test('room schedule preview retains both rooms and mutes only the unselected one in month and week',()=>{
 const oldDocument=globalThis.document,oldStorage=globalThis.sessionStorage;
 globalThis.document={createElement:tag=>new Node(tag),body:new Node()};globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};
 try{for(const view of ['month','week']){const elements=calendar(view,{focusRoomIds:['room-cats']}),nodes=walk(elements['#houseCalendarGrid']),rows=nodes.filter(n=>n.className.includes(view==='month'?'calendar-room-symbol':'calendar-task-row'));assert.equal(rows.length,2);assert.equal(rows.filter(n=>n.className.includes('calendar-muted-room')).length,1);assert.equal(rows[1].className.includes('calendar-muted-room'),true)}}finally{globalThis.document=oldDocument;globalThis.sessionStorage=oldStorage}
});

test('compact recurring date badge opens its date editor and tab counts stay noninteractive',async()=>{
 const {appendRecurringTiming,setTabLabel}=await import('../task-ui.js');
 const oldDocument=globalThis.document,oldEvent=globalThis.CustomEvent;let event;
 globalThis.document={createElement:tag=>new Node(tag),dispatchEvent:e=>event=e};globalThis.CustomEvent=class{constructor(type,options){this.type=type;this.detail=options.detail}};
 try{const footer=new Node(),card={dataset:{},querySelector:()=>footer},task={id:'sample',text:'Litter',nextDue:'2026-10-12T00:00:00Z'};appendRecurringTiming(card,task);const badge=footer.children[0];assert.equal(badge.tag,'button');assert.match(badge.attrs['aria-label'],/Change next due date: Litter/);badge.onclick();assert.equal(event.type,'edit-next-due');assert.equal(event.detail.id,'sample');const tab=new Node('button');setTabLabel(tab,'Recurring',2);assert.equal(tab.children[0].tag,'span')}
 finally{globalThis.document=oldDocument;globalThis.CustomEvent=oldEvent}
});
