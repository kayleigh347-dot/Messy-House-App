import {laundryProgress,completeLaundryStep,laundryTasks,addLaundryTask,completeLaundryTask} from './laundry.js?v=laundry-20261010-v2';
import {renderSidequestTabs,sidequestMatches} from './sidequest-tabs.js';
import {recurringTiming,appendTaskGroups} from './task-ui.js?v=schedule-20261010-v1';
import {appendItemImage,readItemImage} from './item-images.js';
import {childrenOf,subtasksForDisplay,descendants,rootTask,nestTask,detachTask,repeatChildren} from './subtasks.js?v=streamline-20261009-v2';
import {enableTaskDrag} from './task-drag.js?v=release-20261010-v3';
import {roomHues} from './room-colours.js';
import {calendarStep} from './house-calendar.js?v=release-20261010-v3';
import {localDateKey} from './calendar.js';
import {initFeatures,renderFeatures,applyPreferences,renderLocalCalendar,calendarDragOptions,startFocus,featureToast} from './features.js?v=release-20261010-v3';
import {enablePush,disablePush,pushAvailability} from './push-client.js';
import {uniqueWins,completionPeople,displayPersonName} from './completion-history.js?v=release-20261010-v3';
import {completionRecord} from './task-stats.js';
import {activeTask,addToDoingNow,removeFromDoingNow,moveDoingNow,doingNowTasks,completedToday,captureCompletion,undoCompletion,taskNotification,taskNoticeForPerson} from './task-flow.js?v=schedule-20261010-v1';

import {renderStats} from './stats-ui.js?v=streamline-20261009-v2';

import {applyBackupCleanup,applyBackupTestCleanup,taskDeadline} from './task-extras.js?v=overdue-20261010-v1';

import {navigate,initNavigation} from './navigation.js';

import {initV2,renderV2,editTask,quickAdd,showRoom} from "./v2-ui.js?v=task-input-20261010-v1";

import {taskAge,ordered,priorityOrdered,priorityOf,move,moveToTop,moveToBottom,moveBefore,normalize,validateV2,allowanceLabel,scheduleNext,activateDue,recurrenceLabel,roomMess} from "./v2-state.js?v=release-20261010-v3";

import {notifyCompanionTaskCompleted} from './room-companion.js?v=mobile-1';

import {ensurePerson,setDisplayName,householdScoreboard,personName,unseenActivity} from './household.js?v=schedule-20261010-v1';



// Local-network previews may not expose randomUUID, although getRandomValues is available.
if(!crypto.randomUUID)crypto.randomUUID=()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
document.addEventListener('reset',event=>{for(const section of event.target.querySelectorAll('details.optional-section'))section.open=false});
document.addEventListener('invalid',event=>{for(let section=event.target.closest('details');section;section=section.parentElement?.closest('details'))section.open=true},true);
const inputDraftKey=field=>`mc-input-draft:${field.form?.id||'form'}:${field.name||field.id}`;
function restoreInputDrafts(){let drafts={};try{drafts=JSON.parse(sessionStorage.getItem('mc-input-drafts')||'{}')}catch{}for(const field of document.querySelectorAll('input[type=text],textarea'))if(!field.closest('#setup,#houseSharing')&&!field.value&&drafts[inputDraftKey(field)])field.value=drafts[inputDraftKey(field)]}
document.addEventListener('input',event=>{const field=event.target;if(!(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement)||field.type==='password'||field.closest('#setup,#houseSharing'))return;let drafts={};try{drafts=JSON.parse(sessionStorage.getItem('mc-input-drafts')||'{}')}catch{}const key=inputDraftKey(field);if(field.value)drafts[key]=field.value;else delete drafts[key];sessionStorage.setItem('mc-input-drafts',JSON.stringify(drafts))});
document.addEventListener('submit',event=>{let drafts={};try{drafts=JSON.parse(sessionStorage.getItem('mc-input-drafts')||'{}')}catch{}for(const field of event.target.querySelectorAll('input[type=text],textarea'))delete drafts[inputDraftKey(field)];sessionStorage.setItem('mc-input-drafts',JSON.stringify(drafts))});window.addEventListener('pageshow',restoreInputDrafts);restoreInputDrafts();

if(!localStorage.getItem('mc-compact-default-20261010')){localStorage.setItem('mc-task-layout','compact');localStorage.setItem('mc-compact-default-20261010','true')}
const C="mc-config-v1",S="mc-state-v1";
let cfg=JSON.parse(localStorage.getItem(C)||'{"url":"https://thviqhojcjrmqurhdkql.supabase.co","key":"sb_publishable_ziQesp5o-pHIXINUMMdmTA_3nDFSVZr"}'),st=JSON.parse(localStorage.getItem(S)||'{"tasks":[],"side":[],"wins":[],"current":null}'),db=null,filter="all";
let calendarMonth=new Date();

const id=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random(), iso=()=>new Date().toISOString();

function local(){localStorage.setItem(S,JSON.stringify(st))}
import {rewardProgress,revealReward,prizes} from "./rewards.js?v=release-20261010-v3";

import {merge, empty,openHouseState,reconcileSync} from "./sync-state.js?v=schedule-20261010-v1";

const M="mc-sync-v2";

let meta=JSON.parse(localStorage.getItem(M)||"{}"), busy=false, timer, authSubscription;

const activityKey=()=>`mc-house-seen-v1:${meta.owner||'local'}:${meta.houseId||'home'}`;
function activitySeen(){try{return JSON.parse(localStorage.getItem(activityKey())||'{}')}catch{return {}}}
function markActivitySeen(type){const seen=activitySeen();seen[type]=Date.now();localStorage.setItem(activityKey(),JSON.stringify(seen))}
const currentActor=()=>meta.actor?{...meta.actor,...st.householdPeople?.find(p=>p.id===meta.actor.id)}:{id:'local-device',name:'This device'};
const entryTime=value=>{const time=Date.parse(value);return Number.isFinite(time)?new Date(time).toLocaleString():''};

let signedIn=false;
function updateSignInUI(value){signedIn=!!value;$('#displayNameForm').hidden=!signedIn;document.querySelector('.sync-line').hidden=signedIn;$('#signOut').hidden=!signedIn;$('#signIn').hidden=signedIn;$('#email').closest('label').hidden=signedIn}
const status=text=>$('#sync').textContent=text;
function settingsTab(name='general'){for(const panel of $$('[data-settings-panel]'))panel.hidden=panel.dataset.settingsPanel!==name;for(const tab of $$('[data-settings-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.settingsTab===name));if(name==='account'){$('#url').value=cfg.url||'';$('#key').value=cfg.key||'';if(db&&!sharingBusy&&!busy)db.auth.getSession().then(({data})=>{if(data.session)runSharing(refreshHouses)}).catch(()=>{})}}
for(const tab of $$('[data-settings-tab]'))tab.onclick=()=>settingsTab(tab.dataset.settingsTab);

function remember(){localStorage.setItem(M,JSON.stringify(meta))}
const expandedSubtasks=new Set();
let lastDeleted=null;
function renderUndoDeleted(){for(const page of document.querySelectorAll('.page,#roomDetail')){let holder=page.querySelector(':scope > .undo-deleted');if(!holder){holder=document.createElement('div');holder.className='undo-deleted';page.append(holder)}holder.replaceChildren();holder.hidden=!lastDeleted;if(!lastDeleted)continue;const label=document.createElement('span'),undo=document.createElement('button');label.textContent=`Deleted “${lastDeleted.items[0]?.text||'task'}”`;undo.textContent='Undo deleted';undo.onclick=()=>{const target=lastDeleted.kind==='side'?st.side:st.tasks;for(const item of lastDeleted.items)if(!target.some(t=>t.id===item.id))target.push(item);lastDeleted=null;changed()};holder.append(label,undo)}}
function rememberSubtaskExpansion(){for(const details of document.querySelectorAll('.subtasks')){const id=details.closest('.task')?.dataset.taskId;if(!id)continue;if(details.open)expandedSubtasks.add(id);else expandedSubtasks.delete(id)}}
function changed(){st=normalize(st);
local();
render();
clearTimeout(timer);
timer=setTimeout(push,300)}
async function connect(){
  authSubscription?.unsubscribe();
 db=null;

  if(!cfg.url||!cfg.key){status("Local · saved on this device");
return}
  try{
    const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");

    db=createClient(cfg.url,cfg.key);

    authSubscription=db.auth.onAuthStateChange(()=>setTimeout(push,0)).data.subscription;

    await push();

  }catch(e){status("Offline · saved on this device");
$("#msg").textContent=e.message}
}
async function push(forSharing=false){
  if(!db||busy||(sharingBusy&&!forSharing))return;

  busy=true;

  try{
    const client=db;

    const {data:{session},error:authError}=await client.auth.getSession();

    if(authError)throw authError;

    updateSignInUI(!!session);
    if(!session){$("#account").textContent="Sign in to sync your house.";status("Local · sign in to sync");
return}
    const owner=cfg.url+"/"+session.user.id;

    if(meta.owner&&meta.owner!==owner){status("Account changed · export your board first");
return}
    meta.owner=owner;
    meta.actor={id:session.user.id,email:session.user.email,name:personName(session.user.email)};
    ensurePerson(st,meta.actor);if(document.activeElement!==$('#displayName'))$('#displayName').value=displayPersonName(currentActor());
remember();
local();

    $("#account").textContent="Signed in as "+session.user.email;

    for(let attempt=0;
attempt<5;
attempt++){
      const snapshot=structuredClone(st), base=meta.base||empty();

      const houseId=meta.houseId||session.user.id;
      const {data:remote,error}=await client.from("mission_boards").select("payload,revision").eq("user_id",houseId).maybeSingle();

      if(error)throw error;
      if(houseId!==session.user.id&&!remote)throw new Error('Shared house unavailable. Your local copy is kept; ask the owner to check your access.');

      const combined=merge(base,snapshot,remote?.payload||empty());

      if(JSON.stringify(combined)===JSON.stringify(remote?.payload)){
        const previous=st;st=reconcileSync(snapshot,st,combined);
meta.base=combined;
remember();
local();
if(st!==previous)render();
status("Synced");
if(JSON.stringify(st)!==JSON.stringify(combined))setTimeout(push,0);
return true;

      }
      status("Saving…");

      const shared=houseId!==session.user.id;
      const {data:saved,error:saveError}=await client.rpc(shared?"save_shared_mission_board":"save_mission_board",{...(shared?{house_id:houseId}:{}),expected_revision:remote?.revision||0,new_payload:combined});

      if(saveError)throw saveError;

      if(!saved)continue;

      const previous=st;st=reconcileSync(snapshot,st,combined);
meta.base=combined;
remember();
local();
if(st!==previous)render();
status("Synced");

      if(JSON.stringify(st)!==JSON.stringify(combined))setTimeout(push,0);

      return true;

    }
    status("Changes waiting · retrying shortly");

  }catch(e){status("Offline · changes saved here");
$("#msg").textContent=e.message}
  finally{busy=false}
}
setInterval(()=>{if(document.visibilityState==="visible")push()},10000);

window.addEventListener("online",()=>db?push():connect());

document.addEventListener("visibilitychange",()=>{if(!document.hidden)push()});

let categoryFilter="",personFilter="",shownCurrent=null;

const inCategory=t=>!categoryFilter||t.roomId===categoryFilter;

function categoryOptions(){
 const choices=$("#categories"),view=$("#categoryFilter");
choices.replaceChildren();
view.replaceChildren(new Option("All rooms",""));

 for(const room of ordered(st.rooms)){
  if(!room.archived)choices.append(new Option(room.name,room.name));

  view.append(new Option(room.name+(room.archived?' (archived)':''),room.id));

 }
 view.value=categoryFilter;

}
function personOptions(){
 const people=completionPeople(st).sort((a,b)=>a.name.localeCompare(b.name));
 if(personFilter&&!people.some(person=>person.id===personFilter))personFilter='';
 for(const select of [$("#statsPerson")]){
  select.replaceChildren(new Option('Everyone',''));
  for(const person of people)select.append(new Option(person.name,person.id));
  select.value=personFilter;
 }
}
$("#categoryFilter").onchange=e=>{categoryFilter=e.target.value;$("#recurringRoom").value=categoryFilter;
if(categoryFilter){$("#area").value=st.rooms.find(r=>r.id===categoryFilter)?.name||"General";
$("#sideArea").value=$("#area").value}render()};

function add(text,area="General",bucket="now"){area=area.trim()||"General";
text=text.trim();
if(!text)return;
st.tasks.push({id:id(),text,area,bucket,done:false,created:iso(),order:Math.max(-1,...st.tasks.map(t=>t.order??0))+1});
changed()}
function win(t,kind,at=iso(),actor=currentActor(),details={}){const record={...completionRecord(t,at,kind,actor),...details};st.wins.unshift(record);return record;
}
function finish(t,kind,actor=currentActor(),silent=false){t=(kind==='side'?st.side:st.tasks).find(item=>item.id===t.id);if(!t||t.done)return false;
 actor=st.householdPeople.find(p=>p.id===actor?.id&&p.id!=='local-device');if(!actor){if(!silent)featureToast('Sign in on this device to complete tasks and keep your points.');return false}
const items=kind==='side'?st.side:st.tasks,childIds=descendants(items,t.id).reverse().map(child=>child.id);for(const childId of childIds){const childItems=kind==='side'?st.side:st.tasks,child=childItems.find(item=>item.id===childId);if(child&&!child.done)finish(child,kind,actor,true)}t=(kind==='side'?st.side:st.tasks).find(item=>item.id===t.id);if(!t||t.done)return true;
const roomId=t.roomId,fromMood=roomId&&roomMess(st,roomId).state;
// Capture any overdue growth before removing this task's contribution.
const messRoom=st.rooms?.find(room=>room.id===roomId);
if(messRoom)messRoom.messCapacity=roomMess(st,roomId).capacity;
const before=rewardProgress(st).earned,completedAt=iso(),previous={hasNextDue:Object.hasOwn(t,'nextDue'),nextDue:t.nextDue,hasLastDone:Object.hasOwn(t,'lastDone'),lastDone:t.lastDone};
let root=t;const seen=new Set();while(root.parentId&&!seen.has(root.id)){seen.add(root.id);const parent=items.find(item=>item.id===root.parentId);if(!parent)break;root=parent}
const record=win(t,kind,completedAt,actor,{rootTaskId:root.id,rootText:root.text,rootRecurrence:root.recurrence||null,rootSourceTemplateId:root.sourceTemplateId||null,points:childIds.length?0:1,aggregate:!!childIds.length});
t.done=true;
let next=null;if(kind==="task"&&!t.parentId&&t.recurrence){next=scheduleNext(t,new Date(completedAt));
if(next&&!st.tasks.some(x=>x.id===next.id)){next.order=Math.max(-1,...st.tasks.map(x=>x.order))+1;
st.tasks.push(next,...repeatChildren(st.tasks,t,next))}}if(kind==="task"&&st.current===t.id)st.current=null;
captureCompletion(t,completedAt,record.id,next?.id||null,previous);
changed();
const parentId=t.parentId;
if(parentId){const currentItems=kind==='side'?st.side:st.tasks,parent=currentItems.find(item=>item.id===parentId),siblings=currentItems.filter(item=>item.parentId===parentId);if(parent&&!parent.done&&siblings.length&&siblings.every(item=>item.done))finish(parent,kind,actor,true)}
if(!silent&&roomId)notifyCompanionTaskCompleted({id:t.id,roomId,fromMood,toMood:roomMess(st,roomId).state,kind:kind==="side"?"sidequest":"task"});
if(!silent&&actor.id===currentActor().id){const earned=rewardProgress(st).earned;if(earned>before)featureToast("A new mystery joined your shelf! "+prizes[st.rewards.at(-1)?.prizeIndex||0].treat);else celebrate("Task complete — "+rewardProgress(st).remaining+" more to your next mystery.")}return true}
$("#unlockOpen").onclick=()=>{$("#mysteryUnlocked").close();
openMystery()};

function v2EditButton(t){const b=document.createElement("button");
b.textContent="Edit";
b.onclick=()=>editTask(t);
return b}
function addDragHandle(card,t,kind,tools,context){
 card.dataset.taskId=t.id;card.dataset.parentId=t.parentId||'';
 enableTaskDrag(card,action=>{const items=kind==='side'?st.side:st.tasks;
 if(action.parentId){if(nestTask(items,t.id,action.parentId))expandedSubtasks.add(action.parentId)}
 else{if(action.detach){detachTask(items,t.id);if(context==='doing')addToDoingNow(t,items)}const peers=action.ids.map(id=>items.find(x=>x.id===id)).filter(Boolean),key=context==='doing'&&!t.parentId?'doingNowOrder':'order';const slots=peers.map(x=>x[key]??0).sort((a,b)=>a-b);peers.forEach((x,i)=>x[key]=slots[i]+i*.000001)}st.current=null;changed();if(action.groupBlocked)featureToast(`Task kept in ${card.dataset.orderGroupLabel}. Reorder within its group.`)});
}
function completeTaskCard(card,task,kind,control){
 if(card.classList.contains('task-completing'))return;
 const items=kind==='side'?st.side:st.tasks,current=items.find(item=>item.id===task.id);
 if(!current||current.done)return;
 finish(current,kind);
}
function subtaskPanel(t,kind,context,body){const items=kind==='side'?st.side:st.tasks,children=subtasksForDisplay(items,t.id);if(!children.length&&(t.done||t.parentId))return;
 const details=document.createElement(context==='doing'?'section':'details'),summary=document.createElement(context==='doing'?'h4':'summary'),list=document.createElement('div');details.className='subtasks';details.open=context==='doing'||expandedSubtasks.has(t.id);if(context==='doing')details.setAttribute('open','');summary.textContent=children.length?`Subtasks (${children.filter(x=>x.done).length}/${children.length})`:'Add subtasks';details.ontoggle=()=>{details.open?expandedSubtasks.add(t.id):expandedSubtasks.delete(t.id)};list.className='subtask-list';list.dataset.parentId=t.id;
 for(const child of children)list.append(mk(child,kind,context));details.append(summary,list);if(children.length&&context!=='doing'){const collapse=document.createElement('button');collapse.type='button';collapse.className='collapse-subtasks';collapse.textContent='Collapse subtasks';collapse.onclick=()=>{details.open=false;expandedSubtasks.delete(t.id);details.closest('.task')?.scrollIntoView({block:'start',behavior:'smooth'})};details.append(collapse)}
 if(!t.done&&!t.parentId){const form=document.createElement('form'),input=document.createElement('input'),add=document.createElement('button');form.className='subtask-add';input.placeholder='Add a subtask…';input.setAttribute('aria-label','Subtask for '+t.text);input.maxLength=180;input.required=true;add.textContent='Add';form.append(input,add);form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;items.push({id:id(),text,parentId:t.id,roomId:t.roomId,area:t.area,assignedTo:t.assignedTo,assignedToName:t.assignedToName,done:false,bucket:'now',created:iso(),order:Math.max(-1,...items.map(x=>x.order??0))+1});expandedSubtasks.add(t.id);changed()};details.append(form)}body.append(details)
}
function roomColour(task){return `hsl(${roomHues(st.rooms).get(task.roomId)??200} 55% 70%)`}
function mk(t,kind="task",context="source"){let a=document.createElement("article");
a.className="task task-card";a.dataset.taskId=t.id;
let colourHash=0;for(const c of t.id)colourHash=(colourHash*31+c.charCodeAt(0))>>>0;
a.style.setProperty('--task-hue',[325,270,155,205,45,180,295][colourHash%7]);
a.dataset.priority=kind==='task'?priorityOf(t):'mid';
const deadline=kind==='task'?taskDeadline(t):null;const overdue=deadline!==null&&deadline<Date.now();a.classList.toggle('is-overdue',overdue);a.classList.toggle('is-paused',!!t.pausedAt);
a.style.setProperty("--room-colour",roomColour(t));
if(t.parentId)a.classList.add('subtask-card');
if(t.done){a.classList.add('completed-task');const body=document.createElement('div'),heading=document.createElement('div'),strong=document.createElement('strong'),footer=document.createElement('div'),undo=document.createElement('button');body.className='body';heading.className='task-heading';footer.className='task-footer';strong.textContent=t.text;strong.title=t.text;heading.append(strong);const children=childrenOf(kind==='side'?st.side:st.tasks,t.id);if(children.length){a.classList.add('has-subtask-counter');const count=document.createElement('span');count.className='subtask-progress';count.textContent=`${children.filter(child=>child.done).length}/${children.length}`;heading.append(count)}undo.textContent='Undo';undo.className='task-undo';undo.disabled=!t.completionUndo;undo.setAttribute('aria-label','Undo completion: '+t.text);undo.onclick=()=>{if(undoCompletion(st,(kind==='side'?st.side:st.tasks).find(item=>item.id===t.id)))changed()};footer.append(undo);const record=st.wins.find(w=>w.taskId===t.id),by=document.createElement('span');by.className='meta completion-person';by.textContent=record?.aggregate?'Subtasks completed':`Completed by ${record?.completedByName||'Unrecorded'}`;body.append(heading,by,footer);subtaskPanel(t,kind,context,body);a.append(body);return a}
let check=document.createElement("button");
check.type="button";check.disabled=!!t.pausedAt;
check.className="check";
check.textContent=t.parentId?'Done it!':t.recurrence&&!activeTask(t)?'Already done!':context==='doing'||document.body.classList.contains('task-compact-view')?'Done it!':'I did a thing!';
check.setAttribute("aria-label","Complete: "+t.text);
check.onclick=()=>completeTaskCard(a,t,kind,check);
let body=document.createElement("div");
body.className="body";
let strong=document.createElement("strong");
strong.textContent=t.text;strong.title=t.text;
let meta=document.createElement("span");
meta.className="meta";
meta.textContent=(t.area||'General')+(overdue?' · Overdue by '+(Date.now()-deadline<86400000?Math.max(1,Math.floor((Date.now()-deadline)/3600000))+'h':Math.floor((Date.now()-deadline)/86400000)+' days'):'')+' · '+(st.householdPeople.find(person=>person.id===t.assignedTo)?.name||t.assignedToName||'Anyone');
const heading=document.createElement("div");heading.className="task-heading";strong.tabIndex=0;strong.setAttribute('role','button');strong.setAttribute('aria-label',(t.parentId&&!childrenOf(kind==='side'?st.side:st.tasks,t.id).length?'Subtask options: ':'Expand subtasks: ')+t.text);const toggleCompactCard=()=>{if(context==='doing')return;const panel=a.querySelector(':scope > .body > .task-secondary-actions > details.subtasks');if(!panel){if(t.parentId){const options=a.querySelector('.task-options');options.open=!options.open;a.classList.toggle('subtask-expanded',options.open)}return;}panel.open=!panel.open;a.classList.toggle('compact-expanded',panel.open);panel.open?expandedSubtasks.add(t.id):expandedSubtasks.delete(t.id);if(!panel.open)a.scrollIntoView({block:'start',behavior:'smooth'})};strong.onclick=toggleCompactCard;strong.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleCompactCard()}};if(context==='doing'){strong.removeAttribute('role');strong.removeAttribute('tabindex');strong.removeAttribute('aria-label')}heading.append(strong);const children=childrenOf(kind==='side'?st.side:st.tasks,t.id);if(children.length){a.classList.add('has-subtask-counter');const count=document.createElement('span');count.className='subtask-progress';count.textContent=`${children.filter(child=>child.done).length}/${children.length}`;heading.append(count)}const arrow=document.createElement('span');arrow.className='subtask-chevron';arrow.setAttribute('aria-hidden','true');arrow.textContent='⌄';if(children.length)heading.append(arrow);check.classList.add('task-complete');body.append(heading,meta);if(kind==='side')appendItemImage(body,t,()=>st.side.find(item=>item.id===t.id),changed,{editable:false});
if(t.notes){const details=document.createElement("details"),summary=document.createElement("summary"),note=document.createElement("p");
summary.textContent="Notes";
note.textContent=t.notes;
details.append(summary,note);
body.append(details)}let tools=document.createElement("div");
tools.className="tools";
const assignee=document.createElement('select');assignee.className='task-assignee';assignee.setAttribute('aria-label','Assign '+t.text);assignee.append(new Option('Anyone',''));
for(const person of [...st.householdPeople].sort((a,b)=>a.name.localeCompare(b.name)))assignee.append(new Option(person.name,person.id));
assignee.value=st.householdPeople.some(person=>person.id===t.assignedTo)?t.assignedTo:'';
assignee.onchange=()=>{t.assignedTo=assignee.value||null;t.assignedToName=st.householdPeople.find(person=>person.id===t.assignedTo)?.name||null;changed()};tools.append(assignee);
if(kind==="side"){const make=document.createElement('button');
make.textContent='Make task';
make.onclick=()=>{const family=[t,...descendants(st.side,t.id)],ids=new Set(family.map(x=>x.id));delete t.parentId;st.tasks.push(...family.map((x,i)=>({...x,bucket:'now',scheduled:false,activeSince:iso(),order:st.tasks.length+i})));st.side=st.side.filter(x=>!ids.has(x.id));
changed()};
tools.append(make);
}if(kind==="side"){
 const peers=ordered(st.side.filter(x=>x.parentId===t.parentId&&!x.done&&(t.parentId||(!$("#roomDetail").classList.contains("hide")?x.roomId===t.roomId:inCategory(x)))));

 const priorityPeers=ordered(peers.filter(peer=>t.parentId||priorityOf(peer)===priorityOf(t)));
 const top=document.createElement('button');
top.textContent='Top';
top.classList.add('move-top');
top.setAttribute('aria-label','Move to top: '+t.text);
top.disabled=priorityPeers[0]?.id===t.id;
top.onclick=()=>{moveToTop(priorityPeers,t.id);
changed()};
tools.append(top);

 for(const [label,delta] of [['↑',-1],['↓',1]]){const b=document.createElement('button');
b.textContent=label;
b.setAttribute('aria-label',(delta<0?'Move up: ':'Move down: ')+t.text);
const pos=priorityPeers.findIndex(x=>x.id===t.id);
b.disabled=pos+delta<0||pos+delta>=priorityPeers.length;
b.onclick=()=>{move(priorityPeers,t.id,delta);
changed()};
tools.append(b)}
const bottom=document.createElement('button');
bottom.textContent='Last';
bottom.classList.add('move-last');
bottom.setAttribute('aria-label','Move to last: '+t.text);
bottom.disabled=priorityPeers.at(-1)?.id===t.id;
bottom.onclick=()=>{moveToBottom(priorityPeers,t.id);changed()};
tools.append(bottom);
}if(kind==="task"&&context==='doing'&&!t.parentId){
 tools.append(v2EditButton(t));const peers=doingNowTasks(st.tasks,st.wins).filter(x=>!x.done),position=peers.findIndex(x=>x.id===t.id);
 for(const [label,where] of [['Top','top'],['↑',-1],['↓',1],['Last','bottom']]){const control=document.createElement('button');control.textContent=label;if(label==='Top'||label==='Last')control.classList.add(label==='Top'?'move-top':'move-last');control.setAttribute('aria-label',`${label==='Top'||label==='Last'?'Move to '+label.toLowerCase():(where<0?'Move up':'Move down')}: ${t.text}`);control.disabled=where==='top'?position===0:where==='bottom'?position===peers.length-1:position+where<0||position+where>=peers.length;control.onclick=()=>{moveDoingNow(peers,t.id,where);changed()};tools.append(control)}
 const remove=document.createElement('button');remove.className='do-now';remove.textContent='Not on it';remove.setAttribute('aria-pressed','true');remove.setAttribute('aria-label','Remove from Doing Now: '+t.text);remove.onclick=()=>{removeFromDoingNow(t);changed()};tools.append(remove);
}else if(kind==="task"){
 tools.append(v2EditButton(t));

 const peers=ordered(st.tasks.filter(x=>x.parentId===t.parentId&&activeTask(x)&&(t.parentId||(!$("#roomDetail").classList.contains("hide")?x.roomId===t.roomId:inCategory(x)))));

 const priorityPeers=ordered(peers.filter(peer=>t.parentId||priorityOf(peer)===priorityOf(t)));
 const top=document.createElement('button');
top.textContent='Top';
top.classList.add('move-top');
top.setAttribute('aria-label','Move to top: '+t.text);
top.disabled=priorityPeers[0]?.id===t.id;
top.onclick=()=>{moveToTop(priorityPeers,t.id);
st.current=null;
changed()};
tools.append(top);

 for(const [label,delta] of [['↑',-1],['↓',1]]){const button=document.createElement('button');
button.textContent=label;
button.setAttribute('aria-label',(delta<0?'Move up: ':'Move down: ')+t.text);
const pos=priorityPeers.findIndex(x=>x.id===t.id);
button.disabled=pos+delta<0||pos+delta>=priorityPeers.length;
button.onclick=()=>{move(priorityPeers,t.id,delta);
st.current=null;
changed()};
tools.append(button)}
 const bottom=document.createElement('button');
bottom.textContent='Last';
bottom.classList.add('move-last');
bottom.setAttribute('aria-label','Move to last: '+t.text);
bottom.disabled=priorityPeers.at(-1)?.id===t.id;
bottom.onclick=()=>{moveToBottom(priorityPeers,t.id);st.current=null;changed()};
tools.append(bottom);
 const doing=document.createElement('button');doing.className='do-now';doing.textContent=t.doingNow?'Not on it':"I'm on it";doing.setAttribute('aria-pressed',String(!!t.doingNow));doing.setAttribute('aria-label',(t.doingNow?'Remove from Doing Now: ':'Add to Doing Now: ')+t.text);doing.onclick=()=>{t.doingNow?removeFromDoingNow(t):addToDoingNow(t,st.tasks);changed()};if(!t.parentId)tools.append(doing)

}
const focus=document.createElement('button');focus.type='button';focus.className='time-task';focus.innerHTML='<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true"><path fill="#63b6b1" d="M12 2h8v4h-8zM22 6l3-3 3 3-3 3z"/><circle cx="16" cy="19" r="12" fill="#f5b4cd" stroke="#694671" stroke-width="2"/><path d="M16 10v9l5 3" fill="none" stroke="#51375b" stroke-width="2.5" stroke-linecap="round"/></svg>';focus.setAttribute('aria-label','Start stopwatch for '+t.text);focus.title='Start stopwatch';focus.onclick=()=>startFocus(t);
let del=document.createElement("button");
del.textContent="Delete";
del.setAttribute("aria-label","Delete: "+t.text);
del.onclick=()=>{if(!window.confirm(`Delete “${t.text}”${childrenOf(kind==='side'?st.side:st.tasks,t.id).length?' and its subtasks':''}?`))return;rememberSubtaskExpansion();const items=kind==='side'?st.side:st.tasks,family=[t,...descendants(items,t.id)],snapshot=structuredClone(family),ids=new Set(family.map(x=>x.id));lastDeleted={kind,items:snapshot};for(const item of family)expandedSubtasks.delete(item.id);if(kind==='side')st.side=st.side.filter(x=>!ids.has(x.id));else st.tasks=st.tasks.filter(x=>!ids.has(x.id));changed();featureToast('Task deleted. Undo deleted is at the bottom of this page.')};
const completeBy=document.createElement('select');completeBy.setAttribute('aria-label','Completed by, then confirm: '+t.text);completeBy.append(new Option('Completed by…',''));for(const person of st.householdPeople.filter(p=>p.id!=='local-device'))completeBy.append(new Option(displayPersonName(person),person.id));completeBy.append(new Option('✓ Confirm completion','__confirm__'));let chosenPerson='';completeBy.onchange=()=>{if(completeBy.value!=='__confirm__'){chosenPerson=completeBy.value;return}const person=st.householdPeople.find(x=>x.id===chosenPerson&&x.id!=='local-device');if(person)finish(t,kind,person);else{completeBy.value='';featureToast('Choose who completed this task first.')}};tools.append(completeBy,del);
addDragHandle(a,t,kind,tools,context);
if(kind==='task'){const side=document.createElement('button');side.textContent='Side quest';side.onclick=()=>{const family=[t,...descendants(st.tasks,t.id)],ids=new Set(family.map(x=>x.id));delete t.parentId;st.side.push(...family.map((x,i)=>({...x,type:'organisation',messImpact:'none',bucket:'now',scheduled:false,doingNow:false,order:st.side.length+i})));st.tasks=st.tasks.filter(x=>!ids.has(x.id));if(st.current===t.id)st.current=null;changed()};tools.append(side)}
if(kind==='side')tools.prepend(v2EditButton(t));
const quickMoves=document.createElement('div');quickMoves.className='task-quick-actions';
const doingControl=tools.querySelector('.do-now');for(const control of [...tools.querySelectorAll('button')].filter(b=>['Top','Last'].includes(b.textContent))){control.classList.add('quick-reorder');quickMoves.append(control)}

const options=document.createElement('details'),summary=document.createElement('summary');options.className='task-options';summary.textContent='Edit & options';options.append(summary,tools);const secondary=document.createElement('div');secondary.className='task-secondary-actions';secondary.append(quickMoves,options);body.append(secondary);subtaskPanel(t,kind,context,secondary);if(t.parentId){const detach=document.createElement('button');detach.textContent='Make standalone';detach.onclick=()=>{detachTask(kind==='side'?st.side:st.tasks,t.id);changed()};tools.append(detach)}const footer=document.createElement('div');footer.className='task-footer';if(t.parentId)footer.append(quickMoves);if(doingControl)footer.append(doingControl);if(t.parentId){const more=document.createElement('button');more.type='button';more.className='subtask-options-toggle';more.textContent='⋯';more.setAttribute('aria-label','Options for subtask: '+t.text);more.onclick=()=>{options.open=!options.open;a.classList.toggle('subtask-expanded',options.open)};footer.append(more)}footer.append(focus,check);body.append(footer);a.append(body);a.classList.toggle('compact-expanded',context==='doing'||expandedSubtasks.has(t.id));a.onclick=e=>{if(a.dataset.suppressClick)return;if(e.target.closest('.task')!==a)return;if(e.target.closest('button,input,select,textarea,summary,a,label,form')||e.target===strong)return;toggleCompactCard()};let swipeX=0,swipeY=0;a.addEventListener('touchstart',e=>{if(e.target.closest('.task')!==a)return;if(e.target.closest('button,input,select,textarea,summary,a,label,form'))return;swipeX=e.touches[0].clientX;swipeY=e.touches[0].clientY},{passive:true});a.addEventListener('touchend',e=>{if(e.target.closest('.task')!==a||document.body.classList.contains('task-drag-active')||a.dataset.suppressClick||!document.body.classList.contains('task-compact-view')||!swipeX)return;const dx=e.changedTouches[0].clientX-swipeX,dy=e.changedTouches[0].clientY-swipeY;swipeX=0;if(dx>80&&Math.abs(dy)<50){e.preventDefault();finish(t,kind)}},{passive:false});
return a}
function list(sel,arr,kind,completed=[]){let e=$(sel);
e.innerHTML="";
arr=arr.filter(t=>!t.parentId);completed=completed.filter(t=>!t.parentId);
if(!arr.length&&!completed.length){e.innerHTML="<p>Nothing here right now.</p>";
return}appendTaskGroups(e,priorityOrdered(arr),t=>mk(t,kind));if(completed.length){const box=document.createElement('section'),title=document.createElement('h3');box.className='completed-list';title.textContent='Completed today';box.append(title);completed.sort((a,b)=>Date.parse(b.completedAt)-Date.parse(a.completedAt)).forEach(t=>box.append(mk(t,kind)));e.append(box)}}
function colourTaskLists(){for(const root of document.querySelectorAll('#nowList,#sideList,#doingList,#roomTasks,#homeOverdue,#attentionList,#recurringList,#templateList,#completedLibrary,.subtask-list')){let i=0;for(const card of root.querySelectorAll('.task')){const nested=card.closest('.subtask-list');if(root.classList.contains('subtask-list')?nested!==root:!!nested)continue;card.style.setProperty('--task-hue',(root.classList.contains('subtask-list')?[45,235,15,195,320,165]:[320,165,45,235,15,195])[i++%6])}}}

function notificationTarget(){const actor=currentActor(),others=st.householdPeople.filter(person=>person.id!==actor.id);return others.find(person=>/^andy\b/i.test(person.name||person.email||''))||others[0]||null}
function notifyAboutTasks(tasks,target){if(!target)return;for(const task of tasks)st.notifications.push(taskNotification(task,target,currentActor()))}
function renderTaskNotifications(){const actor=currentActor(),pending=st.notifications.filter(notice=>taskNoticeForPerson(notice,actor.id,st.tasks)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),notice=pending[0],banner=$('#taskNotice');banner.classList.toggle('hide',!notice);if(!notice)return;$('#taskNoticeTitle').textContent=`${notice.kind==='recurring-due'?'Task due':'New task'} for ${displayPersonName(actor)}`;$('#taskNoticeText').textContent=notice.kind==='recurring-due'?`“${notice.text}” is now due in ${notice.area||'General'}.`:`${displayPersonName(st.householdPeople.find(p=>p.id===notice.createdBy)||{name:notice.createdByName||'Someone'})} added “${notice.text}” in ${notice.area||'General'}.`;$('#dismissTaskNotice').onclick=()=>{notice.readBy||=[];if(!notice.readBy.includes(actor.id))notice.readBy.push(actor.id);changed()}}
function renderAttention(){const root=$('#attentionList');root.replaceChildren();const tasks=priorityOrdered(st.tasks.filter(t=>!t.parentId&&activeTask(t)&&t.priority==='high'));const byRoom=new Map();for(const task of tasks){const room=st.rooms.find(r=>r.id===task.roomId)?.name||task.area||'General';if(!byRoom.has(room))byRoom.set(room,[]);byRoom.get(room).push(task)}for(const [room,items] of byRoom){const group=document.createElement('section'),title=document.createElement('h3');group.className='attention-group';title.textContent=room;group.append(title);group.id='attention-room-'+items[0].roomId;appendTaskGroups(group,items,task=>mk(task,'task'));root.append(group)}if(!tasks.length){const empty=document.createElement('p');empty.textContent='No tasks need attention right now.';root.append(empty)}}
function renderDoingSearch(){
 const input=$('#doingSearch'),root=$('#doingSearchResults');if(!input||!root)return;root.replaceChildren();
 const query=input.value.trim().toLocaleLowerCase();if(!query){root.hidden=true;return}root.hidden=false;
 const matches=st.tasks.filter(t=>!t.parentId&&activeTask(t)&&!t.doingNow&&`${t.text} ${t.area||''}`.toLocaleLowerCase().includes(query));
 for(const task of matches){const row=document.createElement('div'),text=document.createElement('span'),add=document.createElement('button');row.className='doing-search-result';text.textContent=task.text+' · '+(task.area||'General');add.type='button';add.textContent="I'm on it";add.setAttribute('aria-label','Add to Doing Now: '+task.text);add.onclick=()=>{addToDoingNow(task,st.tasks);changed()};row.append(text,add);root.append(row)}
 if(!matches.length)root.textContent='No matching available tasks.';
}
const laundryBusy={rail:false,dryer:false};
function renderLaundryPanel(){
 for(const cycle of ['rail','dryer']){
  const prefix=cycle==='dryer'?'dryer':'laundry',progress=laundryProgress(st,cycle),button=$('#'+prefix+'Complete');
  $('#'+prefix+'StepNumber').textContent=`Step ${progress.index+1} of 3`;
  $('#'+prefix+'StepTitle').textContent=progress.text;
  $('#'+prefix+'Symbol').textContent=(cycle==='dryer'?['🧺','♨️','👕']:['🧺','👕','🧥'])[progress.index];
  button.setAttribute('aria-label','Complete: '+progress.text);button.disabled=laundryBusy[cycle];
  button.onclick=()=>{
   if(laundryBusy[cycle])return;
   const before=rewardProgress(st).earned,record=completeLaundryStep(st,progress.completed,currentActor(),new Date().toISOString(),cycle);
   if(!record){featureToast('Sign in on this device to complete laundry and keep your points.');return}
   laundryBusy[cycle]=true;$('#'+prefix+'Status').textContent=`${record.text} complete. +1 point. Next: ${laundryProgress(st,cycle).text}.`;
   changed();
   if(rewardProgress(st).earned>before)featureToast('A new mystery joined your shelf!');
   setTimeout(()=>{laundryBusy[cycle]=false;renderLaundryPanel()},800);
  };
 }
}
function renderLaundryTasks(){
 const list=$('#laundryTasks');list.replaceChildren();
 for(const task of laundryTasks(st)){
  const row=document.createElement('div'),text=document.createElement('span'),done=document.createElement('button'),remove=document.createElement('button');
  row.className='laundry-extra-task';text.textContent=task.text;done.type=remove.type='button';done.textContent='Done it!';remove.textContent='Delete';
  done.setAttribute('aria-label','Complete laundry task: '+task.text);remove.setAttribute('aria-label','Delete laundry task: '+task.text);
  done.onclick=()=>{const before=rewardProgress(st).earned;if(!completeLaundryTask(st,task.id,currentActor())){featureToast('Sign in on this device to complete laundry and keep your points.');return}$('#laundryTasksStatus').textContent=task.text+' complete. +1 point.';changed();if(rewardProgress(st).earned>before)featureToast('A new mystery joined your shelf!')};
  remove.onclick=()=>{st.settings=st.settings.filter(item=>item.id!==task.id);changed()};
  row.append(text,done,remove);list.append(row);
 }
 $('#laundryTasksEmpty').hidden=!!list.children.length;
}
$('#laundryTaskForm').onsubmit=event=>{
 event.preventDefault();const input=$('#laundryTaskInput'),task=addLaundryTask(st,input.value,id());if(!task)return;
 input.value='';$('#laundryTasksStatus').textContent='Added '+task.text+'.';changed();input.value='';input.focus();
};

function showDoingTab(tab){
 const laundry=tab==='laundry',attention=tab==='attention';
 $('#doingList').hidden=laundry||attention;$('#attentionList').hidden=laundry||!attention;$('#laundryPanel').hidden=!laundry;
 for(const node of document.querySelectorAll('#doing > .task-list-toolbar,#doing > .doing-search,#doingSearchResults,#doingAdd,#doing > .undo-deleted'))node.hidden=laundry;
 if(!laundry)renderDoingSearch();
 for(const button of document.querySelectorAll('[data-doing-tab]'))button.setAttribute('aria-pressed',String(button.dataset.doingTab===tab));
}
$('#doingSearch').oninput=renderDoingSearch;
function renderDoingNow(){const root=$('#doingList'),items=doingNowTasks(st.tasks,st.wins),active=items.filter(t=>!t.done),completed=items.filter(t=>t.done);root.replaceChildren();for(const task of active)root.append(mk(task,'task','doing'));if(completed.length){const box=document.createElement('section');box.className='completed-list';box.append(document.createElement('h3'));box.firstChild.textContent='Completed today';for(const task of completed)box.append(mk(task,'task','doing'));root.append(box)}if(!items.length){const empty=document.createElement('p');empty.textContent="Nothing selected yet. Tap “I'm on it” on a task, or choose one from Needs done.";root.append(empty)}renderAttention();renderDoingSearch()}
function render(){const actor=currentActor(),nameField=$('#displayName');if(document.activeElement!==nameField)nameField.value=displayPersonName(actor);applyPreferences(st,currentActor());document.body.classList.toggle('task-compact-view',localStorage.getItem('mc-task-layout')!=='detail');for(const b of document.querySelectorAll('[data-task-layout]'))b.textContent=document.body.classList.contains('task-compact-view')?'Detailed view':'Compact view';renderV2(st);
renderHousehold();
renderDoingNow();
renderLaundryPanel();renderLaundryTasks();
renderTaskNotifications();
categoryOptions();
personOptions();
renderRewards();
let active=priorityOrdered(st.tasks).filter(t=>activeTask(t)&&inCategory(t)),cur=active.find(t=>t.id===shownCurrent)||active[0];

for(const [tab,count] of [["doing",doingNowTasks(st.tasks,st.wins).filter(t=>!t.done).length],["now",active.length],["side",st.side.filter(t=>!t.done&&inCategory(t)).length],["wins",uniqueWins(st).filter(inCategory).length]]){const b=document.querySelector('nav button[data-tab="'+tab+'"]');
b.textContent=({doing:"Doing Now",now:"Tasks",side:"Side quests",wins:"Task Data"})[tab]}
let d=uniqueWins(st).filter(inCategory).length+(st.completionArchive||[]).filter(row=>!categoryFilter||row.roomId===categoryFilter).reduce((sum,row)=>sum+(row.count||0),0),r=active.length;
$("#doneN").textContent=d+" done";
$("#openN").textContent=r+" remaining";
$("#bar").value=(d+r)?Math.round(d/(d+r)*100):0;
const shownTasks=st.tasks.filter(t=>!t.parentId&&activeTask(t)&&inCategory(t));
$('#allTaskSummary').textContent=`${shownTasks.length} active tasks${categoryFilter?' in this room':''} · Future tasks are on the calendar.`;
list("#nowList",shownTasks,"task",st.tasks.filter(t=>completedToday(t,st.wins)&&inCategory(t)));
renderSidequestTabs($('#sideTabs'),st,filter,value=>{filter=value;render()},changed,()=>st);
list("#sideList",st.side.filter(t=>!t.done&&inCategory(t)&&sidequestMatches(t,filter)),"side",st.side.filter(t=>completedToday(t,st.wins)&&inCategory(t)&&sidequestMatches(t,filter)));
renderStats(st,categoryFilter,personFilter,changed);renderFeatures();renderCalendar();colourTaskLists();renderUndoDeleted();showDoingTab(document.querySelector('[data-doing-tab][aria-pressed="true"]')?.dataset.doingTab||'mine')}

function renderHousehold(){
 $('#scoreboardHeading').textContent='Household members · '+$('#statsPeriod').selectedOptions[0].textContent;
 const scores=householdScoreboard(st,$('#statsPeriod').value),scoreList=$("#scoreboardList");scoreList.replaceChildren();
 if(!scores.length){const empty=document.createElement('p');empty.className='meta';empty.textContent='Sign in to start keeping scores for each person.';scoreList.append(empty)}
 for(const person of scores){const row=document.createElement('div'),name=document.createElement('strong'),points=document.createElement('strong');row.className='score-row';name.textContent=person.name;points.textContent=person.points+' '+(person.points===1?'point':'points');row.append(name,points);scoreList.append(row)}
 const seen=activitySeen(),activity=unseenActivity(st,{personId:currentActor().id,shoppingSeen:seen.shopping||0,notesSeen:seen.notes||0});
 const openShopping=st.shopping.filter(item=>!item.done).length,threadCount=st.notes.filter(note=>!note.parentId||!st.notes.some(parent=>parent.id===note.parentId)).length;
 $("#homeShoppingStatus").textContent=activity.shopping?`${activity.shopping} new ${activity.shopping===1?'item':'items'} added by someone else`:openShopping?`${openShopping} ${openShopping===1?'item':'items'} to get`:'Nothing waiting';
 $('#homeCalendarStatus').textContent=`${st.appointments.length} appointments · ${st.errands.filter(x=>!x.done).length} errands`;
 $("#homeNotesStatus").textContent=activity.notes?`${activity.notes} new ${activity.notes===1?'update':'updates'} from someone else`:threadCount?`${threadCount} shared ${threadCount===1?'note':'notes'}`:'No notes yet';
 $("#homeShopping").classList.toggle('has-update',activity.shopping>0);$("#homeNotes").classList.toggle('has-update',activity.notes>0);

 const shopping=$("#shoppingList");shopping.replaceChildren();
 const shoppingItems=[...st.shopping].sort((a,b)=>Number(a.done)-Number(b.done)||String(b.createdAt).localeCompare(String(a.createdAt)));
 for(const item of shoppingItems){const row=document.createElement('article'),toggle=document.createElement('button'),body=document.createElement('div'),text=document.createElement('strong'),by=document.createElement('span'),remove=document.createElement('button');row.className='shared-item'+(item.done?' is-done':'');toggle.type='button';toggle.textContent=item.done?'↶':'✓';toggle.setAttribute('aria-label',(item.done?'Put back on list: ':'Mark bought: ')+item.text);toggle.onclick=()=>{item.done=!item.done;item.updatedAt=iso();item.completedBy=item.done?currentActor().id:null;changed()};body.className='shared-item-body';text.className='shared-item-text';text.textContent=item.text;by.className='meta';by.textContent=`Added by ${item.createdByName||'a household member'}${entryTime(item.createdAt)?' · '+entryTime(item.createdAt):''}`;remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove: '+item.text);remove.onclick=()=>{st.shopping=st.shopping.filter(x=>x.id!==item.id);changed()};body.append(text,by);row.append(toggle,body,remove);shopping.append(row)}
 if(!shoppingItems.length){const empty=document.createElement('p');empty.textContent='The shopping list is empty.';shopping.append(empty)}

 const memberName=item=>st.householdPeople.find(person=>person.id===item.assignedTo)?.name||item.assignedToName||'Anyone';
 const appointments=$("#appointmentList");appointments.replaceChildren();
 for(const item of [...st.appointments].sort((a,b)=>String(a.date+a.startTime).localeCompare(String(b.date+b.startTime)))){
  const row=document.createElement('article'),body=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('span'),calendar=document.createElement('button'),remove=document.createElement('button');row.className='shared-item';body.className='shared-item-body';title.className='shared-item-text';title.textContent=item.text;meta.className='meta';meta.textContent=`${new Date(`${item.date}T${item.startTime}`).toLocaleString()}–${item.endTime} · ${memberName(item)}${item.location?' · '+item.location:''}`;calendar.type='button';calendar.textContent='View calendar';calendar.onclick=()=>{calendarMonth=new Date(item.date+'T12:00:00');showPage('calendar')};remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Delete appointment: '+item.text);remove.onclick=()=>{st.appointments=st.appointments.filter(value=>value.id!==item.id);changed()};body.append(title,meta);appendItemImage(body,item,()=>st.appointments.find(value=>value.id===item.id),changed);row.append(body,calendar,remove);appointments.append(row)
 }
 if(!st.appointments.length){const empty=document.createElement('p');empty.textContent='No appointments yet.';appointments.append(empty)}

 const errands=$("#errandList");errands.replaceChildren();
 for(const item of [...st.errands].sort((a,b)=>Number(a.done)-Number(b.done)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')))){
  const row=document.createElement('article'),toggle=document.createElement('button'),body=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('span'),due=document.createElement('input'),remove=document.createElement('button');row.className='shared-item'+(item.done?' is-done':'');toggle.type='button';toggle.textContent=item.done?'↶':'✓';toggle.setAttribute('aria-label',(item.done?'Reopen: ':'Complete: ')+item.text);toggle.onclick=()=>{item.done=!item.done;changed()};body.className='shared-item-body';title.className='shared-item-text';title.textContent=item.text;meta.className='meta';meta.textContent=`Assigned to ${memberName(item)}${item.dueDate?' · Due by '+new Date(`${item.dueDate}T12:00:00`).toLocaleDateString():''}`;due.type='date';due.value=item.dueDate||'';due.setAttribute('aria-label','Due by date for '+item.text);due.onchange=()=>{item.dueDate=due.value||null;changed()};remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Delete errand: '+item.text);remove.onclick=()=>{st.errands=st.errands.filter(value=>value.id!==item.id);changed()};const calendarLabel=document.createElement('label'),calendarCheck=document.createElement('input');calendarLabel.className='checkbox-label';calendarCheck.type='checkbox';calendarCheck.checked=item.showOnCalendar!==false;calendarCheck.onchange=()=>{item.showOnCalendar=calendarCheck.checked;changed()};calendarLabel.append(calendarCheck,document.createTextNode('Show on calendar'));body.append(title,meta,due,calendarLabel);appendItemImage(body,item,()=>st.errands.find(value=>value.id===item.id),changed);row.append(toggle,body,remove);errands.append(row)
 }
 if(!st.errands.length){const empty=document.createElement('p');empty.textContent='No errands yet.';errands.append(empty)}

 for(const select of [$("#addAppointment").elements.assignee,$("#addErrand").elements.assignee]){const value=select.value;select.replaceChildren(new Option('Anyone',''));for(const person of [...st.householdPeople].sort((a,b)=>a.name.localeCompare(b.name)))select.append(new Option(person.name,person.id));select.value=st.householdPeople.some(person=>person.id===value)?value:''}

 const notes=$("#notesList");notes.replaceChildren();
 const topNotes=st.notes.filter(note=>!note.parentId||!st.notes.some(parent=>parent.id===note.parentId));
 for(const note of [...topNotes].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))){
  const replies=st.notes.filter(reply=>reply.parentId===note.id).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))),row=document.createElement(replies.length?'details':'article'),body=document.createElement('div'),text=document.createElement('strong'),by=document.createElement('span');row.className='shared-item note-item'+(replies.length?' note-thread':'');body.className='shared-item-body';text.className='shared-item-text';text.textContent=note.text;by.className='meta';by.textContent=`${note.createdByName||'Household member'}${entryTime(note.createdAt)?' · '+entryTime(note.createdAt):''}`;
  if(replies.length){const summary=document.createElement('summary');summary.append(text,by,document.createTextNode(` · ${replies.length} ${replies.length===1?'reply':'replies'}`));row.append(summary);const key='mc-note-thread:'+note.id;row.open=sessionStorage.getItem(key)==='expanded';row.ontoggle=()=>sessionStorage.setItem(key,row.open?'expanded':'collapsed')}
  else body.append(text,by);
  for(const reply of replies){const entry=document.createElement('div'),content=document.createElement('p'),author=document.createElement('span');entry.className='note-reply';content.textContent=reply.text;author.className='meta';author.textContent=`${reply.createdByName||'Household member'} · ${entryTime(reply.createdAt)}`;entry.append(content,author);body.append(entry)}
  const actions=document.createElement('div'),replyButton=document.createElement('button'),remove=document.createElement('button'),form=document.createElement('form'),input=document.createElement('textarea'),send=document.createElement('button');actions.className='note-actions';replyButton.type=remove.type='button';replyButton.textContent='Reply';remove.textContent=replies.length?'Delete thread':'Delete note';remove.onclick=()=>{if(replies.length&&!confirm('Delete this note and its replies?'))return;st.notes=st.notes.filter(item=>item.id!==note.id&&item.parentId!==note.id);changed()};form.className='note-reply-form';form.id='noteReply-'+note.id;const replyKey='mc-note-reply-open:'+note.id;form.hidden=sessionStorage.getItem(replyKey)!=='true';input.name='reply';input.required=true;input.maxLength=1000;input.rows=2;input.placeholder='Write a reply…';input.setAttribute('aria-label','Reply to '+note.text);send.textContent='Add reply';replyButton.onclick=()=>{form.hidden=!form.hidden;sessionStorage.setItem(replyKey,String(!form.hidden));if(!form.hidden)input.focus()};form.onsubmit=event=>{event.preventDefault();const text=input.value.trim();if(!text)return;const actor=currentActor();ensurePerson(st,actor);st.notes.push({id:id(),parentId:note.id,text,createdAt:iso(),createdBy:actor.id,createdByName:actor.name});input.value='';sessionStorage.setItem(replyKey,'false');let drafts={};try{drafts=JSON.parse(sessionStorage.getItem('mc-input-drafts')||'{}')}catch{}delete drafts[inputDraftKey(input)];sessionStorage.setItem('mc-input-drafts',JSON.stringify(drafts));changed()};form.append(input,send);actions.append(replyButton,remove);body.append(actions,form);row.append(body);notes.append(row);
 }
 if(!topNotes.length){const empty=document.createElement('p');empty.textContent='No house notes yet.';notes.append(empty)}restoreInputDrafts();

}

function renderCalendar(){renderLocalCalendar(st,calendarMonth,(type,id,done)=>{if(type==='errand'){const item=st.errands.find(t=>t.id===id);if(item){item.done=done;changed()}return}const task=st.tasks.find(t=>t.id===id);if(!task)return;if(done)finish(task,'task');else if(task.completionUndo&&!st.tasks.some(t=>t.id===task.completionUndo.nextTaskId&&t.done)&&undoCompletion(st,task))changed()},calendarDragOptions())}
document.addEventListener('room-recurring-complete',event=>{const task=st.tasks.find(t=>t.id===event.detail?.id);if(task){if(event.detail.done===false){if(undoCompletion(st,task))changed()}else finish(task,'task')}});
$('#statsPeriod').value='month';localStorage.setItem('mc-stats-period','month');
$("#statsPeriod").onchange=()=>{localStorage.setItem('mc-stats-period',$('#statsPeriod').value);renderHousehold();
renderStats(st,categoryFilter,personFilter,changed);renderFeatures();renderCalendar();colourTaskLists()};
for(const select of [$("#statsPerson")])select.onchange=e=>{personFilter=e.target.value;personOptions();renderStats(st,categoryFilter,personFilter,changed);renderFeatures();renderCalendar();colourTaskLists()};


let celebrationTimer;

function celebrate(text){$("#celebration").textContent=text;
$("#celebration").classList.remove("hide");
clearTimeout(celebrationTimer);
celebrationTimer=setTimeout(()=>$("#celebration").classList.add("hide"),5000)}
function showPage(name){document.querySelector('nav button[data-tab="'+name+'"]').click()}
document.querySelector('#doingAdd')?.addEventListener('click',()=>quickAdd(null,{doingNow:true}));for(const b of document.querySelectorAll('[data-add-task]'))b.onclick=()=>quickAdd(null,{bucket:b.closest('#side')?'side':b.closest('#recurring')?'recurring':'now',doingNow:!!b.closest('#doing'),type:filter==='all'?'organisation':filter});for(const b of document.querySelectorAll('[data-task-layout]'))b.onclick=()=>{const compact=!document.body.classList.contains('task-compact-view');localStorage.setItem('mc-task-layout',compact?'compact':'detail');render()};
for(const tab of document.querySelectorAll('[data-doing-tab]'))tab.onclick=()=>showDoingTab(tab.dataset.doingTab);
let otherView='shopping';
function showOtherView(name){otherView=name;for(const button of $$('[data-other]'))button.setAttribute('aria-pressed',String(button.dataset.other===name));for(const panel of $$('.other-panel'))panel.classList.toggle('hide',panel.id!==`other${name[0].toUpperCase()+name.slice(1)}`)}
for(const button of $$('[data-other]'))button.onclick=()=>showOtherView(button.dataset.other);showOtherView(otherView);
$("#homeShopping").onclick=()=>{otherView='shopping';showPage('other');showOtherView('shopping')};
$("#homeCalendar").onclick=()=>showPage('calendar');
$("#homeNotes").onclick=()=>showPage('notes');

$("#addShopping").addEventListener('submit',e=>{e.preventDefault();const input=e.currentTarget.querySelector('[name="item"]'),text=input.value.trim();if(!text){input.reportValidity();return}const actor=currentActor();ensurePerson(st,actor);st.shopping.push({id:id(),text,done:false,createdAt:iso(),createdBy:actor.id,createdByName:actor.name});input.value='';$("#shoppingStatus").textContent=`Added ${text}.`;changed();input.focus()});
function fillTimeChoices(form){for(const key of ['startTime','endTime']){const select=form.elements[key],prior=select.value||(key==='startTime'?'09:00':'10:00');select.replaceChildren();for(let hour=0;hour<24;hour++)for(const minute of [0,15,30,45]){const value=String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');select.append(new Option(new Date('2000-01-01T'+value).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),value))}select.value=prior}}
fillTimeChoices($('#addAppointment'));fillTimeChoices($('#calendarEventForm'));
$("#addAppointment").onsubmit=e=>{e.preventDefault();const form=e.currentTarget,text=form.elements.text.value.trim(),date=form.elements.date.value,startTime=form.elements.startTime.value,endTime=form.elements.endTime.value;if(!text||!date||!startTime||!endTime)return;if(endTime<=startTime){$("#appointmentStatus").textContent='Choose an end time after the start time.';return}const assignedTo=form.elements.assignee.value||null;st.appointments.push({id:id(),text,date,startTime,endTime,location:form.elements.location.value.trim(),assignedTo,assignedToName:st.householdPeople.find(person=>person.id===assignedTo)?.name||null,createdAt:iso()});form.reset();form.elements.startTime.value='09:00';form.elements.endTime.value='10:00';$("#appointmentStatus").textContent=`Saved ${text}.`;changed()};
$('#addErrand').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,text=form.elements.text.value.trim();if(!text)return;const values={text,dueDate:form.elements.dueDate.value||null,showOnCalendar:form.elements.showOnCalendar.checked,assignedTo:form.elements.assignee.value||null},file=form.elements.image.files?.[0],button=form.querySelector('button[type=submit],button:not([type])');button.disabled=true;$('#errandStatus').textContent='';
 try{const image=file?await readItemImage(file):null;st.errands.push({...values,id:id(),assignedToName:st.householdPeople.find(person=>person.id===values.assignedTo)?.name||null,done:false,createdAt:iso(),...(image?{image}:{})});form.reset();changed()}catch(error){$('#errandStatus').textContent=error.message}finally{button.disabled=false}
};

$("#addNote").onsubmit=e=>{e.preventDefault();const input=e.currentTarget.elements.note,text=input.value.trim();if(!text)return;const actor=currentActor();ensurePerson(st,actor);st.notes.push({id:id(),text,createdAt:iso(),createdBy:actor.id,createdByName:actor.name});input.value='';changed()};

$("#addCalendarEvent").onclick=()=>{const f=$('#calendarEventForm');f.reset();f.elements.date.value=localDateKey(new Date());$('#calendarEventStatus').textContent='';$('#calendarEventDialog').showModal()};
$('#cancelCalendarEvent').onclick=()=>$('#calendarEventDialog').close();
$('#addCalendarEvent').onclick=()=>{const f=$('#calendarEventForm');f.reset();f.elements.date.value=localDateKey(new Date());f.elements.startTime.value='09:00';f.elements.endTime.value='10:00';$('#calendarEventStatus').textContent='';$('#calendarEventDialog').showModal()};
$('#calendarEventForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,v=Object.fromEntries(new FormData(f));if(v.endTime<=v.startTime){$('#calendarEventStatus').textContent='Choose an end time after the start time.';return;}st.appointments.push({...v,text:v.text.trim(),id:id(),createdAt:iso()});calendarMonth=new Date(v.date+'T12:00:00');$('#calendarEventDialog').close();changed()};
$('#previousCalendarMonth').onclick=()=>{calendarMonth=calendarStep(calendarMonth,-1);renderCalendar()};
$('#nextCalendarMonth').onclick=()=>{calendarMonth=calendarStep(calendarMonth,1);renderCalendar()};

$('#displayNameForm').onsubmit=e=>{e.preventDefault();if(!signedIn||!setDisplayName(st,currentActor(),$('#displayName').value)){ $('#displayNameStatus').textContent='Enter a name (up to 60 characters) while signed in.';return}meta.actor=currentActor();remember();$('#displayNameStatus').textContent='Your household name is saved.';changed()};
$('#connectShortcut').onclick=()=>{showPage('preferences');settingsTab('account')};$('#closeSettings').onclick=()=>showPage('house');
$('#calendarView').value=localStorage.getItem('mc-calendar-view')||'month';$('#calendarRecurring').checked=localStorage.getItem('mc-calendar-recurring')!=='off';$('#calendarSetDay').checked=localStorage.getItem('mc-calendar-set-day')!=='off';
$('#calendarView').onchange=()=>{localStorage.setItem('mc-calendar-view',$('#calendarView').value);renderCalendar()};$('#calendarRecurring').onchange=()=>{localStorage.setItem('mc-calendar-recurring',$('#calendarRecurring').checked?'on':'off');renderCalendar()};$('#calendarSetDay').onchange=()=>{localStorage.setItem('mc-calendar-set-day',$('#calendarSetDay').checked?'on':'off');renderCalendar()};
document.addEventListener('calendar-jump',e=>{calendarMonth=new Date(e.detail.date);renderCalendar()});


$("#openReward").onclick=()=>{if(rewardProgress(st).available.length)openMystery();
else showPage("rewards")};

$("#revealNext").onclick=openMystery;

$("#keepReward").onclick=()=>{$("#rewardDialog").close();
showPage("rewards")};

function openMystery(){
 $("#keepReward").textContent="Add to my shelf ✦";$("#rewardDialog .eyebrow").textContent="MYSTERY UNLOCKED";
 const reward=revealReward(st);
if(!reward)return;

 st.rewards||=[];
st.rewards.push(reward);
changed();

 const prize=prizes[reward.prizeIndex];

 $("#revealedIcon").textContent=prize.icon;
$("#revealedName").textContent=prize.name;

 $("#revealedTitle").textContent=reward.achievement||prize.title;
$("#revealedTreat").textContent=prize.treat;

 $("#rewardDialog").className=prize.colour;
$("#rewardDialog").showModal();

}
function renderRewards(){
 const p=rewardProgress(st),ready=p.available.length;

 $("#rewardStatus").textContent=ready?ready+" mystery "+(ready===1?"gift":"gifts")+" ready to open!":"Your next mystery awaits";

 $("#rewardHint").textContent=p.remaining+" more completed "+(p.remaining===1?"task":"tasks")+" to unlock the next surprise.";

 $("#openReward").textContent=ready?"Open a mystery ✦":"See mystery shelf";

 $("#rewardShelfStatus").textContent=p.remaining+" more completed tasks to your next mystery."+(ready?" "+ready+" unopened "+(ready===1?"box":"boxes")+" ready.":"");

 $("#revealNext").hidden=!ready;

 const challengeList=$('#rewardChallenges');challengeList.replaceChildren();for(const challenge of p.challenges){const line=document.createElement('p');line.textContent=challenge.label+' · '+challenge.count+'/'+challenge.target;challengeList.append(line)}
 const shelf=$("#rewardCollection");
shelf.hidden=false;shelf.replaceChildren();

 $('#totalRewardsFound').textContent=`Total found: ${(st.rewards||[]).length}`;
 const uniquePrizes=new Map();for(const reward of [...(st.rewards||[])].sort((a,b)=>b.index-a.index)){if(!uniquePrizes.has(reward.prizeIndex))uniquePrizes.set(reward.prizeIndex,{...reward,count:0});uniquePrizes.get(reward.prizeIndex).count++}
 const rewards=[...uniquePrizes.values()];
 const cabinets=Math.max(1,Math.ceil(rewards.length/12));
 for(let page=0;page<cabinets;page++){
  const cabinet=document.createElement('div');cabinet.className='prize-cabinet';
  for(let row=0;row<3;row++){const rail=document.createElement('div');rail.className='prize-rail';rail.style.top=[31,59,87][row]+'%';
   for(const reward of rewards.slice(page*12+row*4,page*12+row*4+4)){const prize=prizes[reward.prizeIndex];if(!prize)continue;const item=document.createElement('button');item.className='shelf-prize';item.type='button';item.textContent=prize.icon;item.title=prize.name+(reward.count>1?' · Earned '+reward.count+' times':'');item.setAttribute('aria-label','About '+prize.name+(reward.edition>1?' · Edition '+reward.edition:''));item.onclick=()=>{$('#keepReward').textContent='Close';$('#rewardDialog .eyebrow').textContent='YOUR COLLECTION';$('#revealedIcon').textContent=prize.icon;$('#revealedName').textContent=prize.name;$('#revealedTitle').textContent=reward.achievement||prize.title;$('#revealedTreat').textContent=prize.treat;$('#rewardDialog').className=prize.colour;$('#rewardDialog').showModal()};rail.append(item)}
   cabinet.append(rail)
  }shelf.append(cabinet)
 }
 if(!rewards.length){const empty=document.createElement('p');empty.textContent='Your shelf is waiting for its first prize.';shelf.append(empty)}

}
$("#add").onsubmit=e=>{e.preventDefault();
quickAdd(st.rooms.find(r=>r.name.toLowerCase()===$("#area").value.trim().toLowerCase())?.id,{text:$("#task").value,onAdded:()=>$("#task").value=""})};

$("#addSide").onsubmit=e=>{e.preventDefault();
quickAdd(st.rooms.find(r=>r.name.toLowerCase()===$("#sideArea").value.trim().toLowerCase())?.id,{text:$("#sideText").value,bucket:'side',type:$("#sideType").value,onAdded:()=>$("#sideText").value=""})};


function renderRoute({page,room}){
if(page==='data')page='wins';if(page==='later')page='now';if(!document.querySelector('nav button[data-tab="'+page+'"]'))page='house';
$$("nav button").forEach(b=>b.classList.toggle('active',b.dataset.tab===page));
document.body.dataset.view=page;
const categoryBar=document.querySelector('.category-bar');if(page==='wins')$('#dataFilters').append(categoryBar);else $('#categories').before(categoryBar);
$$(".page").forEach(x=>x.classList.add('hide'));
$("#"+page).classList.remove('hide');
if(page==='preferences')settingsTab('general');
if(page==='other'){markActivitySeen('shopping');renderHousehold();showOtherView(otherView)}else if(page==='notes'){markActivitySeen('notes');renderHousehold()}else if(page==='calendar'){renderCalendar()}else if(page==='manualSchedule'){renderFeatures()}
localStorage.setItem('mc-view-v2',page);
showRoom(page==='house'&&st.rooms.some(r=>r.id===room)?room:null);
window.scrollTo({top:0,behavior:'instant'})}
$$("nav button[data-tab]").forEach(b=>b.onclick=()=>{if(['wins','data'].includes(b.dataset.tab))sessionStorage.setItem('mc-data-tab','overview');navigate(b.dataset.tab);if(['wins','data'].includes(b.dataset.tab))renderStats(st,categoryFilter,personFilter,changed)});
$$(".filters button").forEach(b=>b.onclick=()=>{$$(".filters button").forEach(x=>x.classList.remove("on"));
b.classList.add("on");
for(const tab of $$(".filters button"))tab.setAttribute("aria-pressed",String(tab===b));filter=b.dataset.filter;
render()});

$('#settings').onclick=()=>{showPage('preferences');settingsTab('account')};
$('#cancel').onclick=()=>settingsTab('general');
$("#saveCfg").onclick=async()=>{
  const url=$("#url").value.trim().replace(/\/$/,""),key=$("#key").value.trim();

  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key){$("#msg").textContent="Enter your Supabase Project URL and public key.";
return}
  let privileged=key.startsWith("sb_secret_");

  try{privileged ||= JSON.parse(atob(key.split(".")[1])).role==="service_role"}catch{}
  if(privileged){$("#msg").textContent="Use a public publishable or anon key, never a secret key.";
return}
  if(busy){$("#msg").textContent="Please wait for the current sync to finish.";
return}
  cfg={url,key};
localStorage.setItem(C,JSON.stringify(cfg));
await connect();

  $("#msg").textContent="Settings saved. Sign in below to start syncing.";

};

$("#signIn").onclick=async()=>{
  if(!db){$("#msg").textContent="Save your project settings first.";
return}
  const email=$("#email").value.trim();

  if(!email||!$("#email").checkValidity()){$("#msg").textContent="Enter your email address.";
return}
  const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});

  $("#msg").textContent=error?error.message:"Check your email and open the sign-in link on this device.";

};

$("#signOut").onclick=async()=>{if(busy)return;
try{if("PushManager" in window)await disablePush(db)}catch{}
if(db)await db.auth.signOut();
$("#account").textContent="Signed out. Your local board is still saved on this device.";
updateSignInUI(false);status("Local")};

function notificationStatus(){
 const output=$("#notificationSetupStatus"),unavailable=pushAvailability();
 output.textContent=unavailable||'Enable external notifications on each phone to receive new shared tasks while the app is closed.';
}
$("#enableNotifications").onclick=async()=>{
 const button=$("#enableNotifications");button.disabled=true;
 try{await enablePush(db,meta.houseId);$("#notificationSetupStatus").textContent='External notifications enabled on this device. New shared task alerts usually arrive within a minute after syncing.'}
 catch(error){$("#notificationSetupStatus").textContent=error.message}
 finally{button.disabled=false}
};
$("#disableNotifications").onclick=async()=>{
 try{await disablePush(db);$("#notificationSetupStatus").textContent='External notifications turned off on this device.'}
 catch{$("#notificationSetupStatus").textContent='Could not turn off notifications. Try again when online.'}
};
notificationStatus();

let sharingBusy=false;
async function sharingSession(){
 if(!db)throw new Error('Connect and sign in first.');
 const {data:{session},error}=await db.auth.getSession();
 if(error)throw error;
 if(!session)throw new Error('Sign in with your own email first.');
 if(meta.owner&&meta.owner!==cfg.url+'/'+session.user.id)throw new Error('This local board belongs to a different account. Export it before changing accounts.');
 return session;
}
async function sharingCall(action,extra={}){
 await sharingSession();
 const {data,error}=await db.rpc('mission_house_sharing',{action,...extra});
 if(error){
  if(error.code==='PGRST202'){ $('#sharingSetupHelp').hidden=false;throw new Error('Invites are not available yet: the house-sharing update has not been installed in your database. Use the download below to activate it.');}
  throw error;
 }
 return data;
}
async function refreshHouses(){
 const session=await sharingSession(),data=await sharingCall('list'),menu=$('#sharedHouseChoice');
 menu.replaceChildren();
 for(const house of data.houses)menu.append(new Option(house.label,house.id));
 // An empty new account may not yet have saved its own board.
 if(!data.houses.some(h=>h.id===session.user.id))menu.append(new Option('My house',session.user.id));
 menu.value=meta.houseId||session.user.id;
 const actor={id:session.user.id,email:session.user.email,name:personName(session.user.email)};let peopleChanged=ensurePerson(st,actor);
 if(menu.value===session.user.id){for(const member of data.members)peopleChanged=ensurePerson(st,{id:member.id,email:member.email,name:personName(member.email)})||peopleChanged}
 else{const ownerHouse=data.houses.find(h=>h.id===menu.value),email=ownerHouse?.label?.replace(/ — shared house$/,'');if(ownerHouse&&email)peopleChanged=ensurePerson(st,{id:ownerHouse.id,email,name:personName(email)})||peopleChanged}
 if(peopleChanged)changed();
 $('#currentHouseLabel').textContent='Current house: '+(data.houses.find(h=>h.id===menu.value)?.label||'My house');
 $('#houseMembers').replaceChildren();
 for(const member of data.members){
  const row=document.createElement('p'),remove=document.createElement('button');
  row.append(document.createTextNode(member.email+' '));remove.type='button';remove.textContent='Remove access';
  remove.onclick=()=>runSharing(async()=>{if(!confirm('Remove '+member.email+' from your house?'))return;await sharingCall('remove-member',{target_member:member.id});await refreshHouses();return 'Access removed. Previously downloaded copies cannot be erased remotely.'});
  row.append(remove);$('#houseMembers').append(row);
 }
 if(!data.members.length)$('#houseMembers').textContent='No one else has access yet.';
}
async function switchHouse(houseId){
 const session=await sharingSession(),owner=cfg.url+'/'+session.user.id,currentHouse=meta.houseId||session.user.id;
 if(!houseId||houseId===currentHouse)return;
 // Keep pending changes in a separate local snapshot even if access was revoked.
 const cacheKey=id=>'mc-house-copy:'+owner+'/'+id;
 localStorage.setItem(cacheKey(currentHouse),JSON.stringify({state:st,meta:{...meta,owner,houseId:currentHouse}}));
 const {data:remote,error}=await db.from('mission_boards').select('payload,revision').eq('user_id',houseId).maybeSingle();
 if(error)throw error;
 if(!remote&&houseId!==session.user.id)throw new Error('House unavailable. Ask its owner to check your invitation.');
 const cached=JSON.parse(localStorage.getItem(cacheKey(houseId))||'null');
 const next=openHouseState(remote?.payload||empty(),cached,owner,houseId);
 const nextMeta={owner,houseId,base:remote?.payload||empty(),actor:meta.actor};
 ensurePerson(next,meta.actor);
 const oldState=localStorage.getItem(S),oldMeta=localStorage.getItem(M);
 try{localStorage.setItem(S,JSON.stringify(next));localStorage.setItem(M,JSON.stringify(nextMeta))}
 catch(error){if(oldState!==null)localStorage.setItem(S,oldState);if(oldMeta!==null)localStorage.setItem(M,oldMeta);throw error}
 st=next;meta=nextMeta;categoryFilter='';shownCurrent=null;
 render();navigate('house');
}
async function runSharing(action){
 if(sharingBusy)return;
 let ownsBusy=false;
 sharingBusy=true;$('#sharingStatus').textContent=busy?'Waiting for sync…':'Working…';clearTimeout(timer);
 try{
  const deadline=Date.now()+15000;
  while(busy){if(Date.now()>deadline)throw new Error('Sync is taking longer than expected. Please try again shortly.');await new Promise(resolve=>setTimeout(resolve,100))}
  await sharingSession();
  await push(true); // Best effort: switching also preserves unsynced data per house.
  busy=true;ownsBusy=true;
  const message=await action();$('#sharingStatus').textContent=message||'Houses refreshed.';
 }catch(error){$('#sharingStatus').textContent=error.message}
 finally{sharingBusy=false;if(ownsBusy)busy=false;void push()}
}
$('#loadHouses').onclick=()=>runSharing(refreshHouses);
$('#openSharedHouse').onclick=()=>runSharing(async()=>{await switchHouse($('#sharedHouseChoice').value);await refreshHouses();return 'House opened. Changes sync while you are online.'});
$('#createHouseInvite').onclick=()=>runSharing(async()=>{
 const data=await sharingCall('invite');
 if(!data?.code)throw new Error('No invite code was returned. Please try again.');
 $('#houseInviteCode').value=data.code;$('#houseInviteResult').hidden=false;
 $('#sharingSetupHelp').hidden=true;$('#houseInviteResult').scrollIntoView({block:'center',behavior:'smooth'});$('#houseInviteCode').select();
 return 'Invite created for your own house. Share the code privately; it can be used once within 7 days.';
});
$('#cancelHouseInvite').onclick=()=>runSharing(async()=>{await sharingCall('cancel-invite');$('#houseInviteCode').value='';$('#houseInviteResult').hidden=true;return 'Unused invite cancelled.'});
$('#joinHouse').onclick=()=>runSharing(async()=>{
 const code=$('#joinHouseCode').value.trim();if(!code)throw new Error('Paste the invite code first.');
 const data=await sharingCall('join',{invite_code:code});
 $('#joinHouseCode').value='';await switchHouse(data.houseId);await refreshHouses();
 return 'Shared house joined. Your previous house is saved separately.';
});

$("#export").onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(st,null,2)],{type:"application/json"}));

  const a=document.createElement("a");
a.href=url;
a.download="mission-control-backup.json";
a.click();
setTimeout(()=>URL.revokeObjectURL(url),1000);

};

$("#import").onchange=async e=>{
  try{
    const file=e.target.files[0];
if(!file)return;

    if(file.size>5000000)throw new Error("That backup is too large.");

    const board=JSON.parse(await file.text());

    for(const key of ["tasks","side","wins"]){
      if(!Array.isArray(board[key])||board[key].some(t=>!t||typeof t.id!=="string"||typeof t.text!=="string"))throw new Error("Choose a Mission Control backup file.");

      if(new Set(board[key].map(t=>t.id)).size!==board[key].length)throw new Error("Backup contains duplicate entries.");

    }
    if(board.rewards!==undefined&&(!Array.isArray(board.rewards)||board.rewards.some(r=>!r||typeof r.id!=="string"||!Number.isInteger(r.prizeIndex)||!prizes[r.prizeIndex])))throw new Error("Backup contains invalid rewards.");

    if(board.wins.some(t=>typeof t.at!=="string"))throw new Error("Backup contains invalid Wins.");

    validateV2(board);

    st=merge(empty(),board,st);
const removedDuplicates=applyBackupCleanup(st,board.duplicateCleanup);
const removedTests=applyBackupTestCleanup(st,board.duplicateCleanup);
activateDue(st);
categoryFilter="";$('#recurringRoom').value="";
changed();
const unfinished=board.tasks.filter(t=>!t.done).length;
$("#backupStatus").textContent=`Imported ${board.tasks.length} task records: ${unfinished} unfinished and ${board.tasks.length-unfinished} completed, plus ${board.side.length} Side Quests and ${(board.templates||[]).length} reusable templates. View tasks in More → Active tasks and templates in More → Recurring & reusable tasks. ${removedDuplicates?`Removed ${removedDuplicates} duplicate unfinished tasks from this cleaned backup. `:''}${removedTests?`Removed ${removedTests} labelled test records. `:''}Matching IDs use this backup; other existing items are kept.`;

  }catch(error){$("#backupStatus").textContent=error.message}
  e.target.value="";

};

st=normalize(st);
activateDue(st);
local();

setInterval(()=>{if(activateDue(st))changed();else render()},60000);


$("#moreNav").onclick=()=>$("#moreMenu").showModal();

$$("[data-open]").forEach(b=>b.onclick=()=>{$("#moreMenu").close();
showPage(b.dataset.open)});

for(const tab of document.querySelectorAll('[data-edit-tab]'))tab.onclick=()=>{const page=tab.dataset.editTab;showPage(page);for(const b of document.querySelectorAll('[data-edit-tab]'))b.setAttribute('aria-pressed',String(b.dataset.editTab===page))};
$('#backupShortcut').onclick=()=>{$('#moreMenu').close();showPage('preferences')};
$('#connectionShortcut').onclick=()=>{$('#moreMenu').close();$('#settings').click()};

initFeatures({card:mk,get:()=>st,save:changed,actor:currentActor,complete:t=>finish(t,'task'),edit:editTask,openPage:showPage,openCalendar:date=>{calendarMonth=new Date(date);showPage('calendar')}});
initV2(()=>st,changed,mk,{notificationTarget,notifyTasks:notifyAboutTasks,complete:t=>finish(t,'task')});

if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js?v=laundry-20261010-v2").catch(console.error);
updateSignInUI(false);render();
renderCalendar();
const savedView=localStorage.getItem("mc-view-v2"),lastView=savedView==='later'?'now':savedView;
initNavigation(renderRoute,lastView&&document.querySelector('nav button[data-tab="'+lastView+'"]')?lastView:"house");
connect();

function fitDialogs(){document.documentElement.style.setProperty('--dialog-height',`${window.visualViewport?.height||window.innerHeight}px`);document.documentElement.style.setProperty('--dialog-offset',`${window.visualViewport?.offsetTop||0}px`);const field=document.activeElement;if(field?.matches('dialog input,dialog textarea'))requestAnimationFrame(()=>field.scrollIntoView({block:'nearest'}))}fitDialogs();window.visualViewport?.addEventListener('resize',fitDialogs);document.addEventListener('focusin',event=>{if(event.target.matches('dialog input,dialog textarea'))requestAnimationFrame(()=>event.target.scrollIntoView({block:'nearest'}))});
