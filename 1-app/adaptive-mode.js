import {localStorage} from './safe-storage.js';
import {FLOW_DESCRIPTION,FLOW_INTRO_TITLE,FLOW_INTRO_PARAGRAPHS,FLOW_INTRO_CONFIRM,adaptiveCacheKey,validateAdaptiveRecord} from './adaptive-state.js';
import {createAdaptiveSync} from './adaptive-sync.js';
import {defaultFlowPolicy} from './flow-recommendations.js';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node};
const introduction=()=>{const body=el('div');for(const paragraph of FLOW_INTRO_PARAGRAPHS)body.append(el('p',paragraph));return body};
export function initAdaptiveMode(options){
 const sync=createAdaptiveSync(options),controls=[],pendingAcknowledgements=new Set();
 let current=null,ready=false,loading=false,saving=false,opening=false,popup=null,lastView='',message='Sign in to save your personal planning mode.';
 const visible=()=>controls.some(({root})=>!root.closest('.page')?.classList.contains('hide'));
 const key=context=>adaptiveCacheKey(context.project,context.userId);
 const pending=context=>pendingAcknowledgements.has(key(context))||localStorage.readJSON(key(context)+':ack-pending',false,v=>typeof v==='boolean');
 function paint(){for(const {check,status} of controls){check.checked=current?.record.mode==='flow';check.disabled=!ready||saving||loading;status.textContent=message;status.hidden=!message}const view=JSON.stringify([ready,current?.context.key,current?.record]);if(view!==lastView){lastView=view;document.dispatchEvent(new Event('adaptive-mode-changed'))}}
 function accept(result){if(current?.context.key===result.context.key&&current.record.revision>result.record.revision)return;current=result}
 function closeInternally(){if(!popup)return;popup.ignore=true;clearTimeout(popup.timer);popup.dialog.close();popup.dialog.remove();popup=null}
 function remember(result){localStorage.setItem(key(result.context),JSON.stringify(result.record))}
 async function refresh(){
  if(loading||saving)return;
  loading=true;paint();
  try{
   const result=await sync.read();
   if(current&&result.context.key!==current.context.key)closeInternally();
   accept(result);ready=true;message='';
   if(pending(result.context)){
    try{accept(await sync.acknowledge(result.context));pendingAcknowledgements.delete(key(result.context));localStorage.setItem(key(result.context)+':ack-pending','false')}
    catch{message='Your explanation acknowledgement is waiting to sync.'}
   }
   remember(current);
   if(current.record.introAcknowledgedAt||current.record.mode!=='flow')closeInternally();
  }catch(error){
   ready=false;
   if(['signed-out','account-changed'].includes(error.kind)){current=null;closeInternally();message='Sign in to save your personal planning mode.'}
   else{closeInternally();try{const context=await sync.identity();if(current?.context.key!==context.key)current=null;if(error.kind!=='unavailable'){const cached=localStorage.readJSON(key(context),null,value=>!!value);if(cached)current={context,record:validateAdaptiveRecord(cached,context.userId)};}}catch{current=null;}message=error.kind==='unavailable'?'Personal planning preferences are not connected yet.':'Personal planning preferences are unavailable. Please try again when connected.'}
  }finally{loading=false;paint()}
  if(ready&&visible())void introduce();
 }
 async function acknowledge(context){
  pendingAcknowledgements.add(key(context));localStorage.setItem(key(context)+':ack-pending','true');
  try{
   const result=await sync.acknowledge(context);
   pendingAcknowledgements.delete(key(context));localStorage.setItem(key(context)+':ack-pending','false');
   if(current?.context.key===context.key){accept(result);remember(current);message='';paint()}
  }catch{if(current?.context.key===context.key){message='Your explanation acknowledgement is waiting to sync.';paint()}}
 }
 async function renew(active){
  if(popup!==active)return;
  try{
   const lease=await sync.renew(active.context,active.token);
   if(popup!==active)return;
   if(lease.introAcknowledgedAt||Date.parse(lease.expiresAt)<=Date.now()){closeInternally();void refresh();return}
   active.expiresAt=Date.parse(lease.expiresAt);scheduleRenew(active);
  }catch{if(popup===active){closeInternally();message='The explanation will be available when connected.';paint()}}
 }
 function scheduleRenew(active){clearTimeout(active.timer);active.timer=setTimeout(()=>void renew(active),Math.max(100,Math.floor((active.expiresAt-Date.now())/3)))}
 async function introduce(){
  if(opening||popup||!ready||!current||current.record.mode!=='flow'||current.record.introAcknowledgedAt||pending(current.context)||!visible())return;
  opening=true;
  const context=current.context;
  try{
   const {claim}=await sync.claim(context);
   if(!claim||!ready||current?.context.key!==context.key||current.record.mode!=='flow'||current.record.introAcknowledgedAt||pending(context)||!visible())return;
   const dialog=el('dialog'),title=el('h2',FLOW_INTRO_TITLE),description=introduction(),actions=el('div');
   dialog.className='adaptive-introduction';dialog.id='adaptiveIntroduction';title.id='adaptiveIntroductionTitle';description.id='adaptiveIntroductionDescription';dialog.setAttribute('aria-labelledby',title.id);dialog.setAttribute('aria-describedby',description.id);actions.className='dialog-actions';
   for(const label of [FLOW_INTRO_CONFIRM,'Close']){const button=el('button',label);button.type='button';button.onclick=()=>dialog.close();actions.append(button)}
   dialog.append(title,description,actions);document.body.append(dialog);
   const active={dialog,context,token:claim.token,expiresAt:Date.parse(claim.expiresAt),ignore:false,timer:null};popup=active;
   dialog.addEventListener('close',()=>{
    clearTimeout(active.timer);dialog.remove();if(popup===active)popup=null;
    if(!active.ignore)void acknowledge(context);
   },{once:true});
   dialog.showModal();scheduleRenew(active);
  }catch{if(current?.context.key===context.key){message='The explanation will be available when connected.';paint()}}
  finally{opening=false}
 }
 async function change(enabled){
  if(!ready||saving||loading||!current){paint();return}
  const previous=current;let failureMessage='';saving=true;message='Saving your personal mode…';paint();
  try{
   const patch={mode:enabled?'flow':'routine'};
   const houseKey=options.getHouseKey?.();if(enabled&&houseKey){const preferences=previous.record.recommendationPreferences,house=preferences.flowHouses?.[houseKey]||{};patch.recommendationPreferences={...preferences,flowHouses:{...preferences.flowHouses,[houseKey]:{...house,...(!house.policy?{configurationReady:false}:{}),policy:house.policy||{...defaultFlowPolicy,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone},learningEnabled:house.learningEnabled!==false}}};}
   const result=await sync.patch(previous.context,patch,previous.record.revision);
   if(current?.context.key!==previous.context.key)return;
   accept(result);remember(current);message='';if(!enabled)closeInternally();
  }catch(error){failureMessage=message=error.kind==='conflict'?'Your mode changed on another device. Please choose again.':'Your personal mode was not saved. Please try again when connected.'}
  finally{saving=false;paint()}
  await refresh();
  if(failureMessage&&current?.context.key===previous.context.key){message=failureMessage;paint()}
 }
 const help=document.querySelector('#helpSettings');
 if(help){const details=el('details');details.className='optional-section';details.dataset.adaptiveHelp='true';details.append(el('summary','Go With the Flow'),el('h3',FLOW_INTRO_TITLE),introduction());help.append(details)}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeInternally();else void refresh()});
 window.addEventListener('online',()=>void refresh());
 setInterval(()=>{if(document.visibilityState==='visible'&&(visible()||popup))void refresh()},10000);
 return {
  refresh,
  view(){return {ready,mode:current?.record.mode||'routine',context:current?{key:current.context.key,userId:current.context.userId}:null,preferences:current?structuredClone(current.record.recommendationPreferences):{}}},
  async verifyContext(){const context=await sync.identity();if(context.key!==current?.context.key)throw Error('The account changed. Reopen this view.');return context.key;},
  async updatePreferences(update){
   if(!ready||!current||saving||loading)throw Error('Connect your personal settings before saving.');
   const previous=current,preferences=update(structuredClone(current.record.recommendationPreferences));saving=true;paint();
   try{const result=await sync.patch(previous.context,{recommendationPreferences:preferences},previous.record.revision);if(current?.context.key!==previous.context.key)throw Error('The account changed.');accept(result);remember(current);message='';return structuredClone(result.record.recommendationPreferences);}
   catch(error){if(error.kind==='conflict')message='Personal settings changed on another device. Reopen and try again.';throw error;}
   finally{saving=false;paint();}
  },
  mount(root,pageId){
   const group=el('div'),label=el('label'),check=el('input'),description=el('p',FLOW_DESCRIPTION),status=el('p');
   group.className='adaptive-mode-setting';label.className='checkbox-label';check.type='checkbox';check.id='adaptiveMode-'+pageId;check.disabled=true;description.id=check.id+'-description';description.className='meta';check.setAttribute('aria-describedby',description.id);label.append(check,document.createTextNode('Go With the Flow'));status.className='meta';status.setAttribute('role','status');check.onchange=()=>void change(check.checked);group.append(label,description,status);root.append(group);controls.push({root:group,check,status});paint();
  }
 };
}
