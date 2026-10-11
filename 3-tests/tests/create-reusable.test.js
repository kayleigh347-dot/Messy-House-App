import test from 'node:test';
import assert from 'node:assert/strict';
import {createReusable,addSavedTasks,deleteReusable} from '../task-extras.js';
const setup=()=>({rooms:[{id:'a',name:'Kitchen'},{id:'b',name:'Hall'},{id:'c',name:'Archived',archived:true}],templates:[],tasks:[]});
test('all-room reusable creation preserves each subtask family through reuse and deletion',()=>{
 const state=setup();let n=0;const ids=()=>`id-${++n}`;
 const roots=createReusable(state,{text:' Clean ',allRooms:true,subtasks:'Wipe\n\n Sweep '},ids);
 assert.equal(roots.length,2);assert.equal(state.templates.length,6);assert.equal(state.tasks.length,0);
 for(const root of roots){assert.equal(root.text,'Clean');assert.deepEqual(state.templates.filter(t=>t.parentTemplateId===root.id).map(t=>t.text),['Wipe','Sweep'])}
 assert.equal(addSavedTasks(state,roots.map(t=>t.id),ids),6);
 for(const root of state.tasks.filter(t=>!t.parentId))assert.equal(state.tasks.filter(t=>t.parentId===root.id&&t.roomId===root.roomId).length,2);
 deleteReusable(state,roots[0],true);assert.equal(state.templates.length,0);assert.equal(state.tasks.length,6);
});
test('single-room creation and Doing Now are optional and duplicates are kept intact',()=>{
 const state=setup();let n=0;const ids=()=>`id-${++n}`;
 const [root]=createReusable(state,{text:'Clean',roomId:'a',subtasks:'Wipe',doingNow:true},ids);
 assert.equal(state.templates.length,2);assert.equal(state.tasks.length,2);assert.equal(state.tasks.find(t=>!t.parentId).doingNow,true);
 const before=structuredClone(state.templates);
 assert.deepEqual(createReusable(state,{text:' clean ',roomId:'a',subtasks:'Other'},ids),[]);assert.deepEqual(state.templates,before);
 assert.equal(createReusable(state,{text:'Clean',allRooms:true},ids).length,1);
 assert.deepEqual(createReusable(state,{text:' ',allRooms:true},ids),[]);
 assert.deepEqual(createReusable(state,{text:'Other',roomId:'c'},ids),[]);
 assert.equal(state.templates.find(t=>t.id===root.id).text,'Clean');
});
