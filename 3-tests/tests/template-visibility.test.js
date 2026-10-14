import test from 'node:test';
import assert from 'node:assert/strict';
import {templateFamilyIds,visibleTemplates,changeTemplateVisibility} from '../template-visibility.js';
import {createReusable,addSavedTasks} from '../task-extras.js';
import {eligibleForLearning,learnedDue} from '../flow-learning.js';
import {buildFlowSnapshot,configurableFlowSources} from '../flow-recommendations.js';
test('personal template hiding retains household definitions, tasks, another member and restoration',()=>{
 const templates=[{id:'a',text:'A',groupId:'g'},{id:'child',parentTemplateId:'a'},{id:'b',text:'B',groupId:'g'},{id:'other'}],original=structuredClone(templates),alice={future:1},bob={hiddenTemplateIds:[]};
 const ids=templateFamilyIds(templates,templates[0]);assert.deepEqual(ids,['a','child']);const hidden=changeTemplateVisibility(alice,ids,true);assert.deepEqual(visibleTemplates(templates,hidden.hiddenTemplateIds).map(x=>x.id),['b','other']);assert.deepEqual(templates,original);assert.equal(visibleTemplates(templates,bob.hiddenTemplateIds).length,4);assert.equal(visibleTemplates(templates,changeTemplateVisibility(hidden,ids,false).hiddenTemplateIds).length,4);assert.equal(hidden.future,1);assert.deepEqual(templateFamilyIds(templates,templates[0],true),['a','b','child']);
});
test('ordinary reusable add preserves root and child identity and supports three real learning dates',()=>{
 const state={rooms:[{id:'r',name:'Room'}],templates:[],tasks:[]};let i=0;const id=()=>String(++i);const [template]=createReusable(state,{text:'Clean shelf',roomId:'r',subtasks:'Wipe'},id),before=structuredClone(state.templates);
 const events=[];for(const date of ['2026-01-01','2026-01-08','2026-01-17']){addSavedTasks(state,[template.id],id,date+'T12:00:00Z');const task=state.tasks.find(t=>!t.parentId&&!t.done);assert.equal(task.sourceTemplateId,template.id);assert.equal(eligibleForLearning(task,{category:'cleaning'}),true);task.done=true;task.completedAt=date+'T12:00:00Z';events.push({id:task.id,taskKey:task.sourceTemplateId,completedAt:task.completedAt});for(const child of state.tasks.filter(t=>t.parentId===task.id)){assert.equal(child.sourceTemplateId,before.find(t=>t.parentTemplateId===template.id).id);assert.equal(eligibleForLearning(child,{category:'cleaning'}),false);}}
 assert.equal(learnedDue(events,state.tasks.find(t=>!t.parentId),{category:'cleaning'},'Europe/London','ceil').dueOn,'2026-01-25');assert.deepEqual(state.templates,before);
});
test('hidden saved definitions do not appear as recommendations but instantiated room work remains',()=>{
 const board={rooms:[{id:'r'}],tasks:[{id:'actual',sourceTemplateId:'saved',text:'Existing work',roomId:'r',nextDue:'2026-10-14'}],templates:[{id:'saved',roomId:'r',text:'Saved'}]},house={hiddenTemplateIds:['saved'],taskSettings:{saved:{include:true,priority:1,firstDate:'2026-10-14'}}};
 assert.equal(configurableFlowSources({...board,tasks:[]},{setups:[]},house).length,0);const snapshot=buildFlowSnapshot(board,{setups:[]},house,{day:'2026-10-14',policy:{timeZone:'Europe/London',base:[60,45,30,15,5],dailyCount:5,dailyMinutes:60,rounding:'ceil'}});assert.equal(snapshot.entries[0].taskId,'actual');assert.equal(board.templates.length,1);
});
