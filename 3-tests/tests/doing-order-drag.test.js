import test from 'node:test';
import assert from 'node:assert/strict';
import {moveDoingNow,doingNowTasks} from '../task-flow.js';
import {enableTaskDrag} from '../task-drag.js';
test('Doing Now Last and Top cross priority boundaries and preserve subtask parents',()=>{
 const tasks=[{id:'a',doingNow:true,priority:'high',doingNowOrder:0},{id:'b',doingNow:true,priority:'mid',doingNowOrder:1},{id:'c',doingNow:true,priority:'high',doingNowOrder:2},{id:'child',parentId:'a',order:0}];
 assert.ok(moveDoingNow(tasks,'a','bottom'));assert.deepEqual(doingNowTasks(tasks).map(t=>t.id),['b','c','a']);assert.ok(moveDoingNow(tasks,'a','top'));assert.deepEqual(doingNowTasks(tasks).map(t=>t.id),['a','b','c']);assert.equal(tasks[3].parentId,'a');
});
test('dropping a subtask at the top of its parent reorders siblings without detaching or nesting its parent',t=>{
 const listeners=new Map(),delayed=[];
 class Node{
  constructor(id,task=false,sub=false){this.dataset=id?{taskId:id}:{};this.children=[];this.parentElement=null;this.events={};this.task=task;this.sub=sub;this.offsetHeight=80;const names=new Set();this.classList={contains:n=>names.has(n),add:(...ns)=>ns.forEach(n=>names.add(n)),remove:(...ns)=>ns.forEach(n=>names.delete(n))}}
  append(n){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.push(n)}
  insertBefore(n,before){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.splice(this.children.indexOf(before),0,n)}
  contains(n){return n===this||this.children.some(x=>x.contains(n))}
  matches(){return this.task}
  closest(selector){if(selector.includes('button'))return null;for(let n=this;n;n=n.parentElement)if(selector==='.task'?n.task:selector==='.subtask-list'?n.sub:n.task)return n;return null}
  getBoundingClientRect(){return {left:0,top:this.sub?120:this.task?40:0,bottom:this.sub?400:300,height:260}}
  addEventListener(name,fn){this.events[name]=fn}
 }
 const root=new Node(),parent=new Node('parent',true),list=new Node(null,false,true),first=new Node('first',true),child=new Node('child',true),body=new Node();root.append(parent);parent.append(list);list.append(first);list.append(child);
 for(const [key,value] of Object.entries({document:{body,hidden:false,elementsFromPoint:()=>[parent],addEventListener:(n,fn)=>listeners.set(n,fn),removeEventListener:n=>listeners.delete(n)},navigator:{vibrate(){}},innerHeight:900,window:{scrollBy(){}},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},setTimeout:fn=>{delayed.push(fn);return delayed.length},clearTimeout:()=>{}})){const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});t.after(()=>{if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]})}
 let action;enableTaskDrag(child,result=>action=result);
 child.events.pointerdown({type:'pointerdown',button:0,pointerType:'mouse',target:child,clientX:10,clientY:200});delayed.shift()();
 listeners.get('pointermove')({type:'pointermove',clientX:10,clientY:45,cancelable:true,preventDefault(){}});
 listeners.get('pointerup')({type:'pointerup'});
 assert.equal(action.parentId,null);assert.equal(action.detach,false);assert.deepEqual(action.ids,['child','first']);assert.equal(child.parentElement,list);assert.equal(list.parentElement,parent);assert.equal(parent.parentElement,root);assert.equal(root.children.length,1);assert.equal(child.dataset.suppressClick,'true');
});
