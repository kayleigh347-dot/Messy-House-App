import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {descendants} from '../subtasks.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const snippet=source.slice(source.indexOf('function completeTaskCard('),source.indexOf('function subtaskPanel('));
function harness({reduced=false,children=[]}={}){
 const task={id:'parent',text:'Task'},st={tasks:[task,...children],side:[]},classes=new Set(),card={classList:{contains:value=>classes.has(value),add:value=>classes.add(value)}},control={textContent:'✓ I did a thing',disabled:false},pending=[],calls=[];
 const window={matchMedia:()=>({matches:reduced}),setTimeout:(action,delay)=>pending.push({action,delay})};
 const complete=new Function('st','descendants','finish','window',snippet+';return completeTaskCard')(st,descendants,(task,kind)=>calls.push({task,kind}),window);
 return {task,card,control,pending,calls,classes,complete};
}
test('completion action reaches the person-checked handler without delaying it',()=>{
 const h=harness();h.complete(h.card,h.task,'task',h.control);h.complete(h.card,h.task,'task',h.control);
 assert.equal(h.control.disabled,false);assert.equal(h.pending.length,0);
 assert.equal(h.calls.length,2);assert.equal(h.calls[0].task.id,'parent');
});
test('reduced motion completes immediately; unfinished subtasks do not show success feedback',()=>{
 const reduced=harness({reduced:true});reduced.complete(reduced.card,reduced.task,'task',reduced.control);assert.equal(reduced.pending.length,0);assert.equal(reduced.calls.length,1);
 const blocked=harness({children:[{id:'child',parentId:'parent',done:false}]});blocked.complete(blocked.card,blocked.task,'task',blocked.control);
 assert.equal(blocked.pending.length,0);assert.equal(blocked.control.disabled,false);assert.equal(blocked.control.textContent,'✓ I did a thing');assert.equal(blocked.classes.size,0);
 assert.equal(blocked.calls.length,1,'the completion handler handles unfinished subtasks');
});
