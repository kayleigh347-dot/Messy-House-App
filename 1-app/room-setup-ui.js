import {createAdaptiveSync} from './adaptive-sync.js';
import {createRoomSetupDraft,editRoomSetupTask,resumeRoomSetupDraft,setupRoomSequence,previewRoomSetupAdditions,applyRoomSetupAdditions} from './room-setup.js';
import {createRoomArea,renameRoomArea,assignRoomArea,deleteRoomArea,roomAreaMatches} from './room-areas.js';
import {toolsPicker} from './needed-tools.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const button=(text,action)=>{const node=el('button',text);node.type='button';node.onclick=action;return node};
function field(root,label,type,value,change){const wrapper=el('label',label),input=el('input');input.type=type;input.setAttribute('aria-label',label);input.value=value??'';input.oninput=()=>change(input.value);wrapper.append(input);root.append(wrapper);return input}
function select(root,label,choices,value,change){const wrapper=el('label',label),input=el('select');input.setAttribute('aria-label',label);for(const [key,text] of choices)input.append(new Option(text,key));input.value=value;input.onchange=()=>change(input.value);wrapper.append(input);root.append(wrapper);return input}
const values=item=>Object.fromEntries(Object.entries(item).filter(([key])=>key!=='id'));

export function initRoomSetup(options){
 const sync=createAdaptiveSync(options),root=document.getElementById('rooms'),section=el('details'),overview=el('div'),editorRoot=el('div'),status=el('p');
 section.className='optional-section personal-room-setup';section.append(el('summary','Personal room setups & areas'),overview,editorRoot,status);status.setAttribute('role','status');root.insertBefore(section,document.getElementById('roomList'));
 let current=null,houseId=null,ready=false,loading=false,saving=false,editor=null,addDialog=null,message='Sign in to save your personal room setups and areas.';
 const changesInMemory=new Map();
 const scope=context=>options.getHouseId?.(context.userId)||null;
 const records=collection=>current?.record[collection].filter(item=>item.houseId===houseId&&!item.deletedAt)||[];
 const changeFor=(collection,item)=>({collection,id:item.id,values:values({...item,houseId})});
 const roomChoices=()=>setupRoomSequence(options.get()).map(id=>[id,options.get().rooms.find(room=>room.id===id).name]);
 function report(text){message=text;status.textContent=text}
 function gate(){status.textContent=message;for(const node of section.querySelectorAll('[data-personal-write]'))node.disabled=!ready||saving||loading||!!editor?.conflict;}
 function clearView(){current=null;houseId=null;ready=false;editor=null;changesInMemory.clear();if(addDialog){addDialog.close();addDialog.remove();addDialog=null}editorRoot.replaceChildren();drawOverview();}
 function accept(result){if(current?.context.key===result.context.key&&current.record.revision>=result.record.revision)return false;current=result;return true;}
 async function refresh(){
  if(loading||saving)return;loading=true;gate();
  try{
   const identity=await sync.identity();if(current&&(current.context.key!==identity.key||houseId!==scope(identity)))clearView();
   const result=await sync.readRoomConfiguration(),nextHouse=scope(result.context);
   if(!nextHouse)throw Error('Open your household before saving personal room setups.');
   if(current&&(current.context.key!==result.context.key||houseId!==nextHouse))clearView();
   const changed=accept(result),wasReady=ready;houseId=nextHouse;ready=true;message='';if(changed||!wasReady)drawOverview();
  }catch(error){
   ready=false;
   if(['signed-out','account-changed'].includes(error.kind)){clearView();message='Sign in to save your personal room setups and areas.';}
   else message=error.kind==='unavailable'?'Personal room setup saving is not connected yet.':error.message==='Open your household before saving personal room setups.'?error.message:'Personal room setup saving is unavailable. Please reconnect and try again.';
  }finally{loading=false;gate();options.onAreasChanged?.();}
 }
 async function persist(changes){
  if(!ready||loading||saving||!current)throw Error('Connect your personal room settings before saving.');
  const before=current,oldHouse=houseId;saving=true;gate();
  try{
   const result=await sync.patchRoomConfiguration(before.context,changes,before.record.revision);
   if(scope(result.context)!==oldHouse||current?.context.key!==before.context.key)throw Error('The account or household changed. Reopen the setup.');
   accept(result);message='Saved to your personal room settings.';drawOverview();options.onAreasChanged?.();return result;
  }catch(error){
   if(['signed-out','account-changed'].includes(error.kind))clearView();
   if(error.kind==='conflict'){if(editor)editor.conflict=true;message='Your personal settings changed on another device. Reopen this setup before saving.';}
   else message='Your personal room changes were not saved. Please reconnect and try again.';
   throw error;
  }finally{saving=false;gate();}
 }
 const run=action=>async()=>{try{await action()}catch(error){report(error.kind?message:error.message||'This action could not be completed.');gate()}};
 function rememberEditor(){if(editor)changesInMemory.set(editor.draft.roomId,{draft:structuredClone(editor.draft),name:editor.name,setupId:editor.setupId,updatedAt:new Date().toISOString()});}
 function openRoom(roomId,sequence=[roomId],setup=null){
  rememberEditor();
  const memory=changesInMemory.get(roomId),paused=records('drafts').find(item=>item.roomId===roomId),saved=setup||records('setups').find(item=>item.roomId===roomId);
  const source=setup?{draft:setup.draft,name:setup.name,setupId:setup.id}:memory||paused||saved;
  editor={draft:source?resumeRoomSetupDraft(source.draft,options.get(),{allowStale:true}):createRoomSetupDraft(options.get(),roomId),name:source?.name||'',setupId:source?.setupId||(source===saved?saved?.id:null),sequence,index:sequence.indexOf(roomId),conflict:false};
  if(!source)for(const task of editor.draft.tasks)if(task.taskId)task.areaId=records('assignments').find(item=>item.taskId===task.taskId&&item.roomId===roomId)?.areaId||null;
  section.open=true;drawEditor();
 }
 function drawOverview(){
  const previousRoom=overview.querySelector('select')?.value||'',opened=new Set([...overview.querySelectorAll('details[open]')].map(item=>item.dataset.savedSetup));
  overview.replaceChildren();const chooser=select(overview,'Room',[['','Choose a room'],...roomChoices()],previousRoom,()=>{});
  overview.append(button('Set up a room',run(()=>{if(!chooser.value)throw Error('Choose a room.');openRoom(chooser.value)})),button('Review all rooms',run(()=>{const sequence=setupRoomSequence(options.get());if(!sequence.length)throw Error('Add a cleaning room first.');openRoom(sequence[0],sequence)})));
  const paused=records('drafts').sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))[0];
  if(paused){const resume=button('Resume room setup',run(()=>openRoom(paused.roomId,setupRoomSequence(options.get()))));overview.append(resume)}
  for(const setup of records('setups')){
   const room=options.get().rooms.find(item=>item.id===setup.roomId&&!item.archived);if(!room)continue;
   const box=el('details');box.dataset.savedSetup=setup.id;box.open=opened.has(setup.id);box.append(el('summary',setup.name+' · '+room.name));
   box.append(button('Edit setup',run(()=>openRoom(room.id,[room.id],setup))));
   for(const [label,all] of [['Add all tasks',true],['Add selected tasks',false]]){const action=button(label,run(()=>openAdditions(setup,all)));action.dataset.personalWrite='true';box.append(action)}
   const remove=button('Delete setup from my account',run(async()=>{await persist([{collection:'setups',id:setup.id,values:{deletedAt:new Date().toISOString()}}]);if(changesInMemory.get(setup.roomId)?.setupId===setup.id)changesInMemory.delete(setup.roomId);if(editor?.setupId===setup.id){editor=null;editorRoot.replaceChildren();}}));remove.dataset.personalWrite='true';box.append(remove);
   overview.append(box);
  }
  gate();
 }
 function changeTask(id,patch){editor.draft=editRoomSetupTask(editor.draft,id,patch);rememberEditor()}
 function validateInputs(){for(const input of editorRoot.querySelectorAll('input'))if(!input.checkValidity()){input.reportValidity();throw Error('Check the highlighted setup field.');}}
 function drawEditor(){
  editorRoot.replaceChildren();if(!editor)return;
  const room=options.get().rooms.find(item=>item.id===editor.draft.roomId),heading=el('h3',room?.name||'Room setup');editorRoot.append(heading);
  const progress=el('p',`Room ${editor.index+1} of ${editor.sequence.length}`);progress.className='wizard-progress';editorRoot.append(progress);
  const name=field(editorRoot,'Setup name','text',editor.name,value=>{editor.name=value;rememberEditor()});name.maxLength=100;
  const list=el('div');
  for(const task of editor.draft.tasks){
   const row=el('section');row.className='maker-task-choice';row.dataset.setupEntry=task.id;
   const label=el('label'),check=el('input');label.className='checkbox-label';check.type='checkbox';check.checked=task.selected;check.onchange=run(()=>changeTask(task.id,{selected:check.checked}));label.append(check,document.createTextNode(task.text));row.append(label);
   const details=el('details');details.append(el('summary','Edit task'));const taskName=field(details,'Task name','text',task.text,value=>{if(value.trim())changeTask(task.id,{text:value})});taskName.required=true;
   const choices=[['as-needed','As needed'],['days','Custom days'],['weeks','Custom weeks']];if(task.frequency.kind==='existing')choices.push(['existing','Keep existing weekdays']);
   const interval=field(details,'Repeat every','number',task.frequency.every??1,value=>{if(['days','weeks'].includes(task.frequency.kind)&&Number.isSafeInteger(Number(value))&&Number(value)>=1)changeTask(task.id,{frequency:{kind:task.frequency.kind,every:Number(value)}})});interval.min=1;interval.step=1;interval.max=3650;interval.hidden=!['days','weeks'].includes(task.frequency.kind);interval.closest('label').hidden=interval.hidden;
   const originalFrequency=structuredClone(task.frequency),freq=select(details,'Frequency',choices,task.frequency.kind,value=>{if(value!=='existing')changeTask(task.id,{frequency:value==='as-needed'?{kind:value}:{kind:value,every:Number(interval.value)||1}});else{editor.draft.tasks.find(item=>item.id===task.id).frequency=structuredClone(originalFrequency);rememberEditor()}interval.closest('label').hidden=!['days','weeks'].includes(value)});
   interval.oninput=()=>{const value=Number(interval.value);if(['days','weeks'].includes(freq.value)&&Number.isSafeInteger(value)&&value>=1&&value<=3650)changeTask(task.id,{frequency:{kind:freq.value,every:value}})};
   const advanced=el('details');advanced.append(el('summary','More options'));
   const minutes=field(advanced,'Estimated minutes','number',task.estimatedMinutes,value=>{const number=value===''?null:Number(value);if(number===null||number>0)changeTask(task.id,{estimatedMinutes:number})});minutes.min=1;minutes.max=1440;
   select(advanced,'Effort',[['','Not set'],['low','Low'],['medium','Medium'],['high','High']],task.effort||'',value=>changeTask(task.id,{effort:value||null}));
   select(advanced,'Area',[['','Unassigned'],...records('areas').filter(area=>area.roomId===room.id).map(area=>[area.id,area.name])],task.areaId||'',value=>changeTask(task.id,{areaId:value||null}));
   const tools=el('details');tools.append(el('summary','Tools needed'));const toolRoot=el('div');tools.append(toolRoot);advanced.append(tools);const readTools=toolsPicker(toolRoot,task.tools||[]);toolRoot.addEventListener('change',()=>changeTask(task.id,{tools:readTools()}));toolRoot.addEventListener('click',()=>changeTask(task.id,{tools:readTools()}));
   details.append(advanced);row.append(details);list.append(row);
  }
  editorRoot.append(list);
  const custom=el('details');custom.append(el('summary','Add a custom setup task'));let customName='';field(custom,'Custom task name','text','',value=>customName=value);custom.append(button('Add to setup',run(()=>{if(!customName.trim())throw Error('Enter a custom task name.');editor.draft.tasks.push({id:'custom:'+crypto.randomUUID(),text:customName.trim(),selected:true,frequency:{kind:'as-needed'},estimatedMinutes:null,effort:null,areaId:null,tools:[]});rememberEditor();drawEditor()})));editorRoot.append(custom);
  const save=button('Save this room',run(async()=>{
   validateInputs();
   if(!editor.name.trim())throw Error('Name this room setup before saving.');
   const draft=resumeRoomSetupDraft(editor.draft,options.get()),id=editor.setupId||crypto.randomUUID();
   const changes=[changeFor('setups',{id,roomId:draft.roomId,name:editor.name.trim(),draft})],paused=records('drafts').find(item=>item.roomId===draft.roomId);if(paused)changes.push({collection:'drafts',id:paused.id,values:{deletedAt:new Date().toISOString()}});
   await persist(changes);editor.setupId=id;rememberEditor();
  }));save.dataset.personalWrite='true';editorRoot.append(save);
  const keep=button('Keep standard options',run(()=>{editor.draft=createRoomSetupDraft(options.get(),editor.draft.roomId);rememberEditor();drawEditor()}));editorRoot.append(keep);
  const move=delta=>run(()=>{rememberEditor();const next=editor.index+delta;if(next>=0&&next<editor.sequence.length)openRoom(editor.sequence[next],editor.sequence)});
  const back=button('Back',move(-1));back.disabled=editor.index===0;editorRoot.append(back,button('Skip',run(()=>{if(editor.index+1<editor.sequence.length)awaitMove();else{rememberEditor();editor=null;editorRoot.replaceChildren()}})),button('Next room',move(1)));
  function awaitMove(){rememberEditor();openRoom(editor.sequence[editor.index+1],editor.sequence)}
  const pause=button('Save and finish later',run(async()=>{
   validateInputs();
   rememberEditor();const changes=[...changesInMemory].map(([roomId,value])=>changeFor('drafts',{id:'draft:'+encodeURIComponent(houseId)+':'+encodeURIComponent(roomId),roomId,name:value.name.trim()||options.get().rooms.find(room=>room.id===roomId).name,draft:resumeRoomSetupDraft(value.draft,options.get()),setupId:value.setupId||null,updatedAt:value.updatedAt,deletedAt:null}));
   await persist(changes);editor=null;editorRoot.replaceChildren();
  }));pause.dataset.personalWrite='true';editorRoot.append(pause,button('Close setup',()=>{rememberEditor();editor=null;editorRoot.replaceChildren()}));
  drawAreas(editorRoot,room.id);gate();
 }
 function drawAreas(target,roomId){
  const panel=el('details');panel.append(el('summary','Areas in this room'));let newName='';field(panel,'New area name','text','',value=>newName=value);
  const add=button('Add area',run(async()=>{const areas=createRoomArea(records('areas'),{id:crypto.randomUUID(),roomId,name:newName});await persist([changeFor('areas',areas.at(-1))]);drawEditor()}));add.dataset.personalWrite='true';panel.append(add);
  for(const area of records('areas').filter(item=>item.roomId===roomId)){
   const box=el('details');box.append(el('summary',area.name));let label=area.name;field(box,'Area name','text',label,value=>label=value);
   const rename=button('Save area name',run(async()=>{const next=renameRoomArea(records('areas'),area.id,label).find(item=>item.id===area.id);await persist([changeFor('areas',next)]);drawEditor()}));rename.dataset.personalWrite='true';
   const remove=button('Delete area',run(async()=>{const next=deleteRoomArea(records('areas'),records('assignments'),area.id,new Date().toISOString()),changes=[changeFor('areas',next.areas.find(item=>item.id===area.id)),...next.assignments.filter(item=>records('assignments').find(old=>old.id===item.id)?.areaId!==item.areaId).map(item=>changeFor('assignments',item))];for(const collection of ['setups','drafts'])for(const setup of records(collection))if(setup.draft.tasks.some(task=>task.areaId===area.id)){const draft=structuredClone(setup.draft);for(const task of draft.tasks)if(task.areaId===area.id)task.areaId=null;changes.push({collection,id:setup.id,values:{draft}})}await persist(changes);for(const value of changesInMemory.values())for(const task of value.draft.tasks)if(task.areaId===area.id)task.areaId=null;for(const task of editor.draft.tasks)if(task.areaId===area.id)task.areaId=null;drawEditor()}));remove.dataset.personalWrite='true';box.append(rename,remove);panel.append(box);
  }
  const assignments=el('details');assignments.append(el('summary','Assign existing tasks to areas'));
  for(const task of options.get().tasks.filter(item=>item.roomId===roomId&&!item.parentId&&!item.archived)){
   const old=records('assignments').find(item=>item.taskId===task.id),chooser=select(assignments,task.text,[['','Unassigned'],...records('areas').filter(item=>item.roomId===roomId).map(item=>[item.id,item.name])],old?.areaId||'',()=>{});
   const save=button('Save area for '+task.text,run(async()=>{const next=assignRoomArea(records('assignments'),records('areas'),{id:old?.id||crypto.randomUUID(),taskId:task.id,roomId,areaId:chooser.value||null});await persist([changeFor('assignments',next.find(item=>item.taskId===task.id))])}));save.dataset.personalWrite='true';assignments.append(save);
  }
  panel.append(assignments);target.append(panel);
 }
 async function openAdditions(setup,all){
  if(!ready||!current)throw Error('Connect personal room settings before adding tasks.');
  const context=current.context,oldHouse=houseId,draft=resumeRoomSetupDraft(setup.draft,options.get(),{allowStale:true}),room=options.get().rooms.find(item=>item.id===setup.roomId),dialog=el('dialog');
  dialog.id='roomSetupAdditions';dialog.setAttribute('aria-labelledby','roomSetupAdditionsTitle');const title=el('h2','Add tasks to '+room.name);title.id='roomSetupAdditionsTitle';dialog.append(title,el('p','Saving this setup did not change your tasks. Confirm only the additions you want below. Existing room tasks stay unchanged.'));
  const choices=[],dates={};
  for(const entry of draft.tasks){
   const wrapper=el('div'),label=el('label'),check=el('input');label.className='checkbox-label';check.type='checkbox';check.checked=all||entry.selected;label.append(check,document.createTextNode(entry.text));wrapper.append(label);choices.push({entry,check});
   const referenceKey=entry.referenceKey?room.id+':'+entry.referenceKey:null,known=referenceKey?options.get().tasks.find(task=>task.roomId===room.id&&!task.done&&!task.archived&&(task.scheduleKey===referenceKey||task.roomSetupReferenceKey===referenceKey)):null;
   const id=entry.taskId||known?.id||'room-setup:'+encodeURIComponent(setup.id)+':'+encodeURIComponent(entry.id),previous=options.get().tasks.find(task=>task.id===id),exists=previous&&!previous.done&&!previous.archived;
   if(entry.taskId&&!exists||previous&&(previous.done||previous.archived)){check.checked=false;check.disabled=true;wrapper.append(el('p','Completed or unavailable — kept in your setup, not added.'));dialog.append(wrapper);continue;}
   if(exists)wrapper.append(el('p','Already in this room — unchanged.'));
   else if(entry.frequency.kind!=='as-needed'){const date=field(wrapper,'First scheduled date','date','',value=>dates[entry.id]=value);date.dataset.firstDate=entry.id;wrapper.append(el('p',`Repeats every ${entry.frequency.every} ${entry.frequency.kind}.`));}
   else wrapper.append(el('p','As needed — no scheduled date.'));
   dialog.append(wrapper);
  }
  const notice=el('p');notice.setAttribute('role','status');dialog.append(notice);
  const confirm=button('Confirm additions',async()=>{
   confirm.disabled=true;
   try{
    const identity=await sync.identity();if(identity.key!==context.key||scope(identity)!==oldHouse||current?.context.key!==context.key)throw Error('The account or household changed. Reopen this setup.');
    const ids=choices.filter(item=>item.check.checked).map(item=>item.entry.id),state=options.get(),preview=previewRoomSetupAdditions(state,setup,ids,dates),result=applyRoomSetupAdditions(state,preview);
    if(result.added.length)options.save();
    const mappings=[];for(const entry of preview.entries)if(entry.task.areaId){const old=records('assignments').find(item=>item.taskId===entry.taskId);mappings.push(changeFor('assignments',{id:old?.id||crypto.randomUUID(),roomId:preview.roomId,taskId:entry.taskId,areaId:entry.task.areaId}))}
    if(mappings.length){try{await persist(mappings)}catch{notice.textContent='Tasks were added. Their personal area assignments were not saved; retry them in Areas in this room.';return}}
    report(`${result.added.filter(task=>!task.parentId).length} tasks added to ${room.name}. Existing tasks kept.`);dialog.close();
   }catch(error){notice.textContent=error.message||'Tasks could not be added.';}finally{confirm.disabled=false;}
  });dialog.append(confirm,button('Cancel',()=>dialog.close()));document.body.append(dialog);addDialog=dialog;dialog.addEventListener('close',()=>{dialog.remove();if(addDialog===dialog)addDialog=null},{once:true});dialog.showModal();
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});window.addEventListener('online',()=>void refresh());setInterval(()=>{if(document.visibilityState==='visible'&&document.body.dataset.view==='rooms')void refresh()},10000);
 drawOverview();gate();
 return {
  refresh,
  configuration(){const available=!!(ready&&current&&scope(current.context)===houseId);return {ready:available,contextKey:available?current.context.key:null,setups:available?records('setups').map(item=>structuredClone(item)):[]}},
  areaView(roomId){return ready?{scope:current.context.key+':'+houseId,areas:records('areas').filter(area=>area.roomId===roomId),assignments:records('assignments').filter(item=>item.roomId===roomId)}:{scope:null,areas:[],assignments:[]}},
  areaMatches(task,selected){return roomAreaMatches(task,records('assignments'),records('areas'),selected)},
  routineView(roomId){return {ready,scope:current?current.context.key+':'+houseId:null,variations:current?records('routineVariations').filter(item=>item.roomId===roomId):[],hiddenIds:current?records('routineVisibility').filter(item=>item.roomId===roomId&&item.hidden).map(item=>item.routineId):[]}},
  async saveRoutineVariation(routine,baseRoutineId){return persist([changeFor('routineVariations',{id:routine.id,roomId:routine.roomId,name:routine.name,steps:routine.steps,baseRoutineId,deletedAt:null})])},
  async hideRoutine(routine,hidden=true){if(routine.baseRoutineId)return persist([{collection:'routineVariations',id:routine.id,values:{deletedAt:hidden?new Date().toISOString():null}}]);const old=records('routineVisibility').find(item=>item.routineId===routine.id);return persist([changeFor('routineVisibility',{id:old?.id||crypto.randomUUID(),roomId:routine.roomId,routineId:routine.id,hidden})])},
  async assignPreparationAreas(entries){const changes=entries.filter(entry=>entry.areaId).map(entry=>{const old=records('assignments').find(item=>item.taskId===entry.taskId);return changeFor('assignments',{id:old?.id||crypto.randomUUID(),roomId:entry.roomId,taskId:entry.taskId,areaId:entry.areaId})});if(changes.length)return persist(changes)},
  async identity(){const identity=await sync.identity();if(scope(identity)!==houseId||current?.context.key!==identity.key)throw Error('The account or household changed. Reopen this routine.');return identity}
 };
}
