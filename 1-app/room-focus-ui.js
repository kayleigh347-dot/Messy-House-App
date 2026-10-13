import {focusRoomTasks,selectFocusTasks} from './room-focus.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const button=(text,action)=>{const node=el('button',text);node.type='button';node.onclick=action;return node};

export function initRoomFocus(options){
 let dialog=null,roomId=null,scope=null,selected=new Set(),recommendations=new Set(),working=false,returnFocus=null;
 const currentScope=()=>options.scope();
 function render(){
  if(!dialog?.open)return;
  const room=options.get().rooms.find(room=>room.id===roomId&&!room.archived);
  if(!room||scope!==currentScope()||!options.isRoomOpen(roomId)){dialog.close();return;}
  const focusedId=document.activeElement?.closest('[data-task-id]')?.dataset.taskId;
  const scroll=dialog.scrollTop;
  dialog.replaceChildren();const title=el('h2','Focus on '+room.name);title.id='roomFocusTitle';dialog.append(title);
  const body=el('div');body.className='room-focus-tasks';
  if(working){
   const tasks=[...selected].map(id=>options.get().tasks.find(task=>task.id===id&&task.roomId===roomId&&!task.archived)).filter(Boolean);
   if(!tasks.length)body.append(el('p','No tasks selected.'));
   const completed=el('section');completed.className='completed-list';completed.append(el('h3','Completed'));
   for(const task of tasks)(task.done?completed:body).append(options.card(task,'task','doing'));
   if(completed.children.length>1)body.append(completed);
   dialog.append(body,button('Choose more tasks',()=>{working=false;render()}));
  }else{
   const tasks=focusRoomTasks(options.get(),roomId);
   const flow=options.flow?.view(),suggestions=flow?.enabled?flow.entries.filter(entry=>entry.roomId===roomId&&!entry.done&&!entry.unavailable&&entry.displayOn<=flow.snapshot?.day):[];
   if(flow?.enabled){body.append(el('h3','Recommendations'));if(!suggestions.length)body.append(el('p',flow.notice||'No recommendations for this room.'));
    for(const entry of suggestions){const row=el('section');row.className='maker-task-choice';const label=el('label');label.className='checkbox-label';const choice=el('input');choice.type='checkbox';choice.checked=recommendations.has(entry.id);choice.setAttribute('aria-label','Recommend: '+entry.title);choice.onchange=()=>choice.checked?recommendations.add(entry.id):recommendations.delete(entry.id);label.append(choice,el('span',entry.title));row.append(label,el('small',entry.reason));const optionsMenu=el('details');optionsMenu.append(el('summary','Options'),button('Stop recommending this task',async()=>{try{await options.flow.suppress(entry.sourceKey,true)}catch(error){options.toast?.(error.message)}}));row.append(optionsMenu);body.append(row);}
    body.append(el('h3','Room tasks'));
   }
   for(const task of tasks){
    const row=el('label');row.className='checkbox-label maker-task-choice';const check=el('input');check.type='checkbox';check.checked=selected.has(task.id);check.onchange=()=>check.checked?selected.add(task.id):selected.delete(task.id);check.setAttribute('aria-label','Select '+task.text);row.append(check,el('span',task.text));body.append(row);
   }
   if(!tasks.length)body.append(el('p','No active tasks in this room.'));
   const status=el('p');status.setAttribute('role','status');
   dialog.append(body,button('Start focus',async()=>{
    try{
     for(const entry of suggestions.filter(entry=>recommendations.has(entry.id))){const id=await options.flow.select(entry);if(id)selected.add(id);}recommendations.clear();
     // Keep completed selections for ordinary Undo while adding only active references.
     const activeIds=tasks.filter(task=>selected.has(task.id)).map(task=>task.id);
     selectFocusTasks(options.get(),roomId,activeIds);working=true;options.save();render();
    }catch(error){status.textContent=error.message;}
   }),status);
  }
  dialog.append(button('Close focus',()=>dialog.close()));dialog.scrollTop=scroll;
  if(focusedId)dialog.querySelector(`[data-task-id="${CSS.escape(focusedId)}"] button.check`)?.focus({preventScroll:true});
 }
 function open(id){
  const room=options.get().rooms.find(room=>room.id===id&&!room.archived);if(!room||id==='room-laundry')return;
  if(dialog)dialog.close();const openingScope=currentScope();returnFocus=document.activeElement?.closest('.page.hide')?document.getElementById('roomFocus'):document.activeElement;
  options.clearWay.offer(id,undefined,{onContinue:ids=>{
   if(openingScope!==currentScope()||!options.isRoomOpen(id)||!options.get().rooms.some(room=>room.id===id&&!room.archived))return;
   roomId=id;scope=openingScope;selected=new Set(ids);recommendations=new Set();working=false;
   const popup=el('dialog');dialog=popup;popup.id='roomFocusDialog';popup.setAttribute('aria-labelledby','roomFocusTitle');document.body.append(popup);
   popup.addEventListener('close',()=>{popup.remove();if(dialog===popup)dialog=null;if(returnFocus?.isConnected)returnFocus.focus()},{once:true});popup.showModal();render();
  }});
 }
 function chooseRoom(){const popup=el('dialog'),title=el('h2','Focus on a room'),label=el('label','Room'),chooser=el('select');chooser.setAttribute('aria-label','Choose Focus room');chooser.append(new Option('Choose a room',''));for(const room of options.get().rooms.filter(room=>!room.archived&&room.id!=='room-laundry'))chooser.append(new Option(room.name,room.id));label.append(chooser);popup.append(title,label,button('Cancel',()=>popup.close()));chooser.onchange=()=>{const id=chooser.value;if(!id)return;popup.close();options.openRoom(id);open(id);};document.body.append(popup);popup.addEventListener('close',()=>popup.remove(),{once:true});popup.showModal();}
 return {open,render,chooseRoom};
}
