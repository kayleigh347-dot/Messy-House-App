import {subtaskCandidates,addExistingSubtasks,snoozeTask,createNamedParent} from './task-planning.js';
import {childrenOf,nestTask} from './subtasks.js';
import {localDateKey} from './calendar.js';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let api;const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b};
function dialog(title){const d=document.querySelector('#taskPlanningDialog'),body=document.querySelector('#taskPlanningBody');body.replaceChildren(el('h2',title));d.showModal();return {d,body}}
export function initTaskPlanning(handlers){api=handlers}
export function offerDraggedParent(draggedId,targetId,kind='task'){
 const key=kind==='side'?'side':'tasks',items=api.get()[key],target=items.find(t=>t.id===targetId),dragged=items.find(t=>t.id===draggedId);if(!target||!dragged)return;
 if(childrenOf(items,targetId).length){if(nestTask(items,draggedId,targetId)){api.expand(targetId);api.save()}return}
 const snapshots=[JSON.stringify(target),JSON.stringify(dragged)],{d,body}=dialog('Name a parent task?'),label=el('label','New parent name'),input=el('input'),status=el('p');input.required=true;input.maxLength=180;label.append(input);status.setAttribute('role','status');
 const apply=named=>{const current=api.get()[key];if(JSON.stringify(current.find(t=>t.id===targetId))!==snapshots[0]||JSON.stringify(current.find(t=>t.id===draggedId))!==snapshots[1]||childrenOf(current,targetId).length){status.textContent='These tasks changed. Close this and try dragging again.';return}
 const parent=named?createNamedParent(current,draggedId,targetId,input.value,crypto.randomUUID()):nestTask(current,draggedId,targetId)&&current.find(t=>t.id===targetId);if(!parent){status.textContent=named?'Enter a parent name to continue.':'These tasks cannot be grouped.';return}api.expand(parent.id);api.save();d.close()};
 body.append(el('p','Would you like a new named parent containing both tasks?'),el('strong',target.text+' + '+dragged.text),label,button('Create named parent',()=>apply(true)),button('Keep existing task as parent',()=>apply(false)),status);input.focus();
}
export function openExistingSubtasks(parentId,kind='task'){
 const key=kind==='side'?'side':'tasks',state=api.get(),parent=state[key].find(t=>t.id===parentId);if(!parent)return;
 const {d,body}=dialog('Add existing tasks as subtasks'),originalParent=JSON.stringify(parent),originals=new Map(state[key].map(t=>[t.id,JSON.stringify(t)])),selected=new Set(),search=el('input'),room=el('select'),list=el('div'),count=el('output'),notice=el('p'),confirm=button('Add selected tasks',()=>{
 const items=api.get()[key],current=items.find(t=>t.id===parentId);if(JSON.stringify(current)!==originalParent||[...selected].some(id=>JSON.stringify(items.find(t=>t.id===id))!==originals.get(id))||!addExistingSubtasks(items,parentId,[...selected])){notice.textContent='These tasks changed. Close and reopen this selection.';return}api.expand(parentId);api.save();d.close();api.toast(`Added ${selected.size} subtasks to ${parent.text}.`)});
 search.type='search';search.placeholder='Search tasks';search.setAttribute('aria-label','Search existing tasks');room.setAttribute('aria-label','Task room');room.append(new Option('All rooms',''));for(const r of state.rooms.filter(r=>!r.archived))room.append(new Option(r.name,r.id));room.value=parent.roomId;list.className='existing-subtask-choices';notice.setAttribute('role','status');body.append(el('strong',parent.text),el('p','Selected tasks move into this parent’s room and follow its schedule. Their existing subtasks move with them.'),search,room,count,list,notice,confirm);
 const draw=()=>{const items=subtaskCandidates(api.get()[key],parentId,{roomId:room.value,query:search.value});list.replaceChildren();for(const t of items){const label=el('label'),check=el('input');label.className='checkbox-label';check.type='checkbox';check.checked=selected.has(t.id);check.onchange=()=>{check.checked?selected.add(t.id):selected.delete(t.id);update()};label.append(check,el('span',t.text+(room.value?'':' · '+t.area)));list.append(label)}count.textContent=`${items.length} matching tasks`;update()};
 const update=()=>{confirm.textContent=`Add selected tasks (${selected.size})`;confirm.disabled=!selected.size};search.oninput=room.onchange=draw;draw();search.focus();
}
export function openSnooze(id){const state=api.get(),task=state.tasks.find(t=>t.id===id);if(!task)return;const {d,body}=dialog('Snooze task'),original=JSON.stringify(task),input=el('input'),status=el('p');input.type='date';input.setAttribute('aria-label','Snooze until');const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);input.min=input.value=localDateKey(tomorrow);status.setAttribute('role','status');
 const apply=date=>{try{const current=api.get().tasks.find(t=>t.id===id);if(JSON.stringify(current)!==original)throw Error('This task changed. Close and reopen Snooze.');if(!snoozeTask(api.get().tasks,id,date))throw Error('This task cannot be snoozed.');api.save();d.close();api.toast('Snoozed until '+new Date(date+'T12:00:00').toLocaleDateString()+'.')}catch(error){status.textContent=error.message}};
 body.append(el('strong',task.text),button('Tomorrow',()=>apply(localDateKey(tomorrow))),el('label','Choose a date'),input,button('Snooze until this date',()=>apply(input.value)),status);input.focus();
}
