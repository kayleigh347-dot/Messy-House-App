import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {saveReusable,roomTemplates} from '../task-extras.js';
import {freshTask} from '../v2-state.js';
const source=readFileSync(new URL('../v2-ui.js',import.meta.url),'utf8');
test('actual task composer adds only one active task when saving templates for every room',()=>{
 const st={rooms:[{id:'a',name:'A'},{id:'b',name:'B'}],tasks:[],side:[],templates:[],householdPeople:[]};
 const field=()=>({value:'',checked:false,replaceChildren(){},append(){},focus(){}});
 const elements=Object.fromEntries(['room','text','bucket','questType','template','impact','allRooms','reusable','every','period','important','doingNow'].map(k=>[k,field()]));
 const form={elements,dataset:{},reset(){elements.impact.value='normal';elements.every.value='1';elements.period.value='weeks'}},dialog={showModal(){},close(){}},suggestions=field();let saved=0;
 const document={querySelector:s=>s==='#quickTask'?dialog:s==='#quickTaskForm'?form:suggestions,querySelectorAll:()=>[]};
 const snippet=source.slice(source.indexOf('export function quickAdd('),source.indexOf('function installInlineTemplates(')).replace('export ','');
 const open=new Function('document','getState','ordered','Option','roomTemplates','quickFields','freshTask','saveReusable','save','crypto',snippet+';return quickAdd')(document,()=>st,x=>x,function(){},roomTemplates,()=>{},freshTask,saveReusable,()=>saved++,globalThis.crypto);
 open('a',{text:'Clean windows'});elements.reusable.checked=true;elements.allRooms.checked=true;form.onsubmit({preventDefault(){}});
 assert.equal(saved,1);assert.equal(st.tasks.length,1);assert.equal(st.tasks[0].roomId,'a');assert.equal(st.templates.length,2);assert.equal(st.tasks[0].text,'Clean windows');
 open('b');elements.text.value='';
 form.querySelectorAll=()=>[{value:st.templates.find(t=>t.roomId==='b').id}];
 form.dataset.mode='saved';form.onchange();assert.equal(elements.text.required,false,'saved tab removes native typed-task requirement');
 form.onsubmit({preventDefault(){}});
 assert.equal(st.tasks.length,2);assert.equal(st.tasks[1].roomId,'b');assert.equal(st.tasks[1].text,'Clean windows');
 form.querySelectorAll=()=>[];form.dataset.mode='normal';form.onchange();assert.equal(elements.text.required,true,'normal tab requires a typed task');
});

test('room multi-add excludes active saved tasks, including older tasks without template ids',()=>{
 const source=readFileSync(new URL('../v2-ui.js',import.meta.url),'utf8');
 assert.match(source,/task\.sourceTemplateId===template\.id\|\|task\.text\.trim\(\)\.toLocaleLowerCase\(\)===template\.text\.trim\(\)\.toLocaleLowerCase\(\)/);
 assert.match(source,/available=items\.filter\(t=>!alreadyAdded\(state,t,rooms\.value\)\)/);
});
