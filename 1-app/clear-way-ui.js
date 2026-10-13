import {standardPreparationRoutine,previewPreparationTasks,applyPreparationTasks} from './clear-way.js';
import {validatePreparationRoutine} from './room-configuration.js';
import {activeTask} from './task-flow.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const button=(text,action)=>{const node=el('button',text);node.type='button';node.onclick=action;return node};
function input(root,label,value,change){const wrap=el('label',label),field=el('input');field.type='text';field.setAttribute('aria-label',label);field.value=value||'';field.oninput=()=>change(field.value);wrap.append(field);root.append(wrap);return field}
function check(root,label,value,change){const wrap=el('label'),field=el('input');wrap.className='checkbox-label';field.type='checkbox';field.checked=value;field.onchange=()=>change(field.checked);wrap.append(field,document.createTextNode(label));root.append(wrap);return field}
export function initClearWay(options){
 const root=document.getElementById('rooms'),section=el('details'),catalogueRoot=el('div'),editorRoot=el('div'),status=el('p');section.className='optional-section clear-way-settings';section.append(el('summary','Clear the Way routines'),catalogueRoot,editorRoot,status);status.setAttribute('role','status');root.insertBefore(section,document.getElementById('roomList'));
 let selectedRoom='',draft=null,source=null,viewScope=null,dialog=null,lastCatalogue=null;
 const rooms=()=>options.get().rooms.filter(room=>!room.archived&&room.id!=='room-laundry');
 const baseRoutines=roomId=>[standardPreparationRoutine(roomId),...(options.get().preparationRoutines||[]).filter(routine=>routine.roomId===roomId)];
 const personal=roomId=>options.personal.routineView(roomId);
 const routines=roomId=>{const view=personal(roomId);return [...baseRoutines(roomId),...view.variations].filter(routine=>!view.hiddenIds.includes(routine.id))};
 const run=action=>async()=>{try{await action()}catch(error){status.textContent=error.message||'This routine could not be saved.'}};
 function render(){
  if(!rooms().some(room=>room.id===selectedRoom))selectedRoom='';
  const nextScope=(options.houseKey?.()||'local')+'|'+personal(selectedRoom).scope;if(viewScope!==nextScope){if(viewScope!==null){draft=null;source=null;editorRoot.replaceChildren();if(dialog){dialog.close();dialog=null}}viewScope=nextScope;}
  const signature=JSON.stringify([selectedRoom,rooms().map(room=>[room.id,room.name]),options.get().preparationRoutines,personal(selectedRoom)]);if(signature===lastCatalogue)return;lastCatalogue=signature;
  const opened=new Set([...catalogueRoot.querySelectorAll('details[open]')].map(row=>row.dataset.routineId));
  catalogueRoot.replaceChildren();const label=el('label','Room'),chooser=el('select');chooser.setAttribute('aria-label','Clear the Way room');chooser.append(new Option('Choose a room',''));for(const room of rooms())chooser.append(new Option(room.name,room.id));chooser.value=selectedRoom;chooser.onchange=()=>{selectedRoom=chooser.value;draft=null;source=null;editorRoot.replaceChildren();render()};label.append(chooser);catalogueRoot.append(label);
  if(!selectedRoom)return;
  const create=button('Create a shared routine',()=>{source=null;draft={...standardPreparationRoutine(selectedRoom),id:crypto.randomUUID(),name:''};drawEditor()});catalogueRoot.append(create);
  const view=personal(selectedRoom);if(!view.ready)catalogueRoot.append(el('p','Personal variations and deletion need your connected personal settings.'));
  for(const routine of routines(selectedRoom)){
   const row=el('details');row.dataset.routineId=routine.id;row.open=opened.has(routine.id);row.append(el('summary',routine.name+(routine.baseRoutineId?' · My variation':' · Shared')));
   const steps=el('ol');for(const step of routine.steps)steps.append(el('li',step.label));row.append(steps);
   row.append(button('Use routine',()=>offer(selectedRoom,routine.id)));
   const edit=button(routine.baseRoutineId?'Edit my variation':'Make a personal variation',()=>{source=routine;draft={...structuredClone(routine),id:routine.baseRoutineId?routine.id:crypto.randomUUID()};drawEditor()});edit.disabled=!view.ready;row.append(edit);
   const remove=button('Delete from my view',run(async()=>{await options.personal.hideRoutine(routine);status.textContent='Removed from your view. Other members keep their copy.';render()}));remove.disabled=!view.ready;row.append(remove);catalogueRoot.append(row);
  }
  const hidden=baseRoutines(selectedRoom).filter(routine=>view.hiddenIds.includes(routine.id));if(hidden.length){const restore=el('details');restore.append(el('summary','Hidden routines'));for(const routine of hidden){const action=button('Restore '+routine.name,run(async()=>{await options.personal.hideRoutine(routine,false);render()}));action.disabled=!view.ready;restore.append(action)}catalogueRoot.append(restore);}
 }
 function drawEditor(){
  editorRoot.replaceChildren();if(!draft)return;section.open=true;editorRoot.append(el('h3',source?'Personal variation':'New shared routine'));const name=input(editorRoot,'Routine name',draft.name,value=>draft.name=value);name.maxLength=100;
  draft.steps.forEach((step,index)=>{
   const row=el('details');row.open=true;row.append(el('summary',`Step ${index+1}`));input(row,'Step text',step.label,value=>step.label=value);input(row,'Instructions (optional)',step.instructions||'',value=>step.instructions=value);
   check(row,'Pickup or boxing step',step.pickup,value=>{step.pickup=value;drawEditor()});
   if(step.pickup){input(row,'Sorting task after completion',step.followUpText||'',value=>step.followUpText=value);check(row,'Important items — sorting needs attention',step.important,value=>step.important=value)}
   check(row,'Optional step',step.optional,value=>step.optional=value);
   for(const [label,delta] of [['Up',-1],['Down',1]]){const move=button(label,()=>{const next=index+delta;if(next<0||next>=draft.steps.length)return;[draft.steps[index],draft.steps[next]]=[draft.steps[next],draft.steps[index]];drawEditor()});move.disabled=index+delta<0||index+delta>=draft.steps.length;row.append(move)}
   row.append(button('Remove step',()=>{draft.steps.splice(index,1);drawEditor()}));editorRoot.append(row);
  });
  editorRoot.append(button('Add step',()=>{draft.steps.push({id:crypto.randomUUID(),label:'',pickup:false,important:false,optional:false,followUpText:null});drawEditor()}));
  const save=button(source?'Save personal variation':'Save shared routine',run(async()=>{
   validatePreparationRoutine(draft);
   if(source){await options.personal.saveRoutineVariation(draft,source.baseRoutineId||source.id);status.textContent='Personal variation saved. The shared routine is unchanged.';}
   else{const state=options.get();if(!state.rooms.some(room=>room.id===draft.roomId&&!room.archived))throw Error('This room is no longer available.');if((state.preparationRoutines||[]).some(routine=>routine.id===draft.id))throw Error('This routine was already saved.');state.preparationRoutines||=[];state.preparationRoutines.push({...structuredClone(draft),createdBy:options.actor()?.id||'local-device'});options.save();status.textContent='Shared routine saved. No tasks added.';}
   draft=null;source=null;editorRoot.replaceChildren();render();
  }));save.disabled=!!source&&!personal(selectedRoom).ready;editorRoot.append(save,button('Close editor',()=>{draft=null;source=null;editorRoot.replaceChildren()}));
 }
 function offer(roomId,routineId,continuation={}){
  const room=rooms().find(item=>item.id===roomId);if(!room)return;
  const available=routines(roomId).map(item=>structuredClone(item)),houseKey=options.houseKey?.();if(!available.length){status.textContent='Restore or create a routine in editing mode first.';continuation.onContinue?.([]);return;}
  let confirmedIds=[];
  if(dialog)dialog.close();dialog=el('dialog');const popup=dialog;popup.id='clearWayPrompt';popup.setAttribute('aria-labelledby','clearWayPromptTitle');const title=el('h2','Clear the Way first?');title.id='clearWayPromptTitle';popup.append(title,el('p',room.name));
  const label=el('label','Routine'),select=el('select');select.setAttribute('aria-label','Choose Clear the Way routine');for(const routine of available)select.append(new Option(routine.name+(routine.baseRoutineId?' · My variation':''),routine.id));select.value=available.some(item=>item.id===routineId)?routineId:available[0].id;label.append(select);popup.append(label);
  const actions=el('div'),list=el('div'),notice=el('p');notice.setAttribute('role','status');const confirm=button('Confirm selected tasks',runConfirm);confirm.hidden=true;let mode=null,choices=[];
  const confirmationActions=el('div');confirmationActions.className='clear-way-confirm-actions';confirmationActions.append(confirm,button('Cancel',()=>popup.close()));actions.append(button('Add All',()=>{mode='all';drawChoices()}),button('Choose Tasks',()=>{mode='choose';drawChoices()}),button('Not Now',()=>popup.close()));popup.append(actions,list,notice,confirmationActions);
  select.onchange=()=>{if(mode)drawChoices()};
  function drawChoices(){
   list.replaceChildren();choices=[];const routine=available.find(item=>item.id===select.value),areaView=options.personal.areaView(roomId);
   for(const step of routine.steps){
    const row=el('section');row.className='maker-task-choice';const selected=check(row,step.label,mode==='all',()=>{}),entry={step,selected,areas:[],reuse:null};if(step.instructions)row.append(el('p',step.instructions));
    if(step.pickup){row.append(el('p','After completion: '+step.followUpText+(step.important?' · Needs attention':'')));const details=el('details');details.append(el('summary','Choose areas'));const whole=check(details,'Whole room',true,yes=>{if(yes)for(const choice of entry.areas)choice.check.checked=false});entry.whole=whole;for(const area of areaView.areas){const checkbox=check(details,area.name,false,yes=>{if(yes)whole.checked=false});entry.areas.push({area,check:checkbox});}row.append(details);}
    const similar=options.get().tasks.filter(task=>task.roomId===roomId&&!task.parentId&&activeTask(task)&&!task.clearWay&&task.text.trim().toLocaleLowerCase()===step.label.trim().toLocaleLowerCase());
    if(similar.length){const wrap=el('label','Matching existing task'),reuse=el('select');reuse.setAttribute('aria-label','Existing task for '+step.label);reuse.append(new Option('Create a separate preparation task',''));for(const task of similar)reuse.append(new Option('Reuse '+task.text,task.id));wrap.append(reuse);row.append(wrap);entry.reuse=reuse;}
    choices.push(entry);list.append(row);
   }
   confirm.hidden=false;notice.textContent='Only confirmed steps are added to this room and Doing Now. Sorting tasks appear separately after pickup completion.';
  }
  async function runConfirm(){
   confirm.disabled=true;
   try{
    if(houseKey!==options.houseKey?.())throw Error('The household changed. Reopen this routine.');
    const routine=available.find(item=>item.id===select.value),view=options.personal.areaView(roomId),selections=[],areaIds=new Map();
    if(JSON.stringify(routines(roomId).find(item=>item.id===routine.id))!==JSON.stringify(routine))throw Error('This routine changed or was hidden. Reopen it before adding tasks.');
    if(routine.baseRoutineId||choices.some(entry=>entry.areas.some(choice=>choice.check.checked)))await options.personal.identity();
    for(const entry of choices.filter(item=>item.selected.checked)){
     const selectedAreas=entry.areas.filter(choice=>choice.check.checked);
     if(!entry.step.pickup||entry.whole.checked)selections.push({stepId:entry.step.id,reuseTaskId:entry.reuse?.value||null});
     for(const choice of selectedAreas){if(!view.areas.some(area=>area.id===choice.area.id&&area.name===choice.area.name))throw Error('An area changed. Reopen this routine before adding tasks.');const key=view.scope+':'+choice.area.id;areaIds.set(key,choice.area.id);selections.push({stepId:entry.step.id,area:{key,name:choice.area.name},reuseTaskId:entry.reuse?.value||null});}
     if(entry.step.pickup&&!entry.whole.checked&&!selectedAreas.length)throw Error('Choose an area or Whole room for each selected pickup step.');
    }
    const preview=previewPreparationTasks(options.get(),routine,selections),result=applyPreparationTasks(options.get(),preview);confirmedIds=preview.entries.map(entry=>entry.taskId);options.save();
    const assignments=preview.entries.filter(entry=>entry.area).map(entry=>({taskId:entry.taskId,roomId,areaId:areaIds.get(entry.area.key)}));
    if(assignments.length){try{await options.personal.assignPreparationAreas(assignments)}catch{notice.textContent='Tasks added. Personal area assignments did not save; retry them in My rooms.';return;}}
    options.toast?.(`${result.added.length} preparation tasks added. Existing unfinished steps kept.`);popup.close();
   }catch(error){notice.textContent=error.message||'The preparation tasks could not be added.';}finally{confirm.disabled=false;}
  }
  document.body.append(popup);popup.addEventListener('close',()=>{popup.remove();if(dialog===popup)dialog=null;if(houseKey===options.houseKey?.())continuation.onContinue?.(confirmedIds)},{once:true});popup.showModal();
 }
 render();return {render,offer};
}
