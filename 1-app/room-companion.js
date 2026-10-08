import {createMasterAnimator} from './master-animation.js';
// Small scene interactions; this module never changes task or sync data.
import {companionLayouts,nearestCompanionSpot} from './companion-layouts.js?v=mobile-1';
import {livingRoomMap,imageToScene,sceneToImage,hitInteraction} from './room-navigation.js';
import {createNavigation,findPath} from './creature-pathfinding.js';
import {createRouteMotion} from './creature-motion.js';
import {createBehaviour} from './creature-behaviour.js';
import {createLivingAnimator,livingAnimationManifest} from './living-animation.js';
import {messGeometrySignature,positionRoomMess,solidMessObstacles} from './room-mess.js';
import {livingMoodProfile} from './living-mood.js';
const masterInteractions=[
 {id:'cat',label:'♡ Stroke the cat',action:'petting',duration:6200,target:{id:'bed',x:22,y:21}},
 {id:'stretch',label:'☀ Sleepy stretch',action:'stretching',duration:2600},
 {id:'sigh',label:'☁ Sigh at the mess',action:'sighing',duration:3500,moods:['MESSY','DISASTER']},
 {id:'complain',label:'☞ Look at this mess',action:'displeased',duration:4500,moods:['MESSY','DISASTER']}
];
// The manager owns at most one controller; all room activity lives inside it.
let activeController,pausedOverride;
export function leaveCompanion(){activeController?.destroy();activeController=null}
export function updateCompanion(id,mess,clutter=[]){
 const scene=document.querySelector('#roomScene'),actor=document.querySelector('#guardianArea');
 if(scene.closest('.hide')){leaveCompanion();return}
 if(activeController?.roomId!==id){
  leaveCompanion();
  activeController=createCompanionController({scene,actor});
  activeController.enter({roomId:id,mess,clutter});
 }else activeController.updateRoom({mess,clutter});
}
export function notifyCompanionTaskCompleted(event){return activeController?.taskCompleted(event)||false}
export function createCompanionController({scene,actor,clock=()=>performance.now(),random=()=>Math.random(),audio={play:()=>false,request:()=>false,stop(){}},requestFrame=cb=>window.requestAnimationFrame?.(cb),cancelFrame=id=>window.cancelAnimationFrame?.(id)}){
let room=null,state='SPOTLESS',spot='sofa',paused=false,controls,bubble,menu;
 let active=false,destroyed=false,generation=0;
let greetingTimer,movementTimer,celebrationTimer,interval,attentionUntil=0,mapped=false,navigation,motion,frameId,lastFrame=null;
let clutter=[],solidSignature='',suppressed=new Set(),resizeObserver,pointerStart,manualSpotIndex=0,objectButtons=[];
let masterAction='idle',masterPendingAction=null,masterActionTimer,masterActionDeadline=0,masterMovementGeneration=0,masterActionGeneration=0;
let behaviour=createBehaviour({now:clock,random}),pending=null,effect=null,animator=null,completionIds=new Set(),lastCompletion=-Infinity;
// Give a deliberate interaction a full rest before automatic wandering resumes.
function attend(){attentionUntil=clock()+14000}
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fit=()=>window.getComputedStyle(scene).backgroundSize==='contain'?'contain':'cover';
function renderMapped(){
 if(!mapped||!motion)return;
 const rect=scene.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const point=imageToScene(motion.position,livingRoomMap.image,rect,{fit:fit()});
 actor.style.left='0';actor.style.top='0';
 actor.style.transform=`translate3d(${point.x*rect.width}px,${point.y*rect.height}px,0) translate(-50%,-${livingAnimationManifest.anchor.y*100}%)`;
 actor.dataset.x=motion.position.x.toFixed(5);actor.dataset.y=motion.position.y.toFixed(5);
 actor.dataset.motion=motion.moving?'moving':'idle';
}
function clearEffect(){effect?.remove();effect=null;actor.classList.remove('companion-interacting')}
function cancelAction(){pending=null;clearEffect();if(mapped)behaviour.idle()}
function objectAvailable(object){return object.allowedMoods.includes(state)&&object.availableWhen({clutter,state})}
function routeToObject(object){
 if(!objectAvailable(object))return null;
 return object.approachPoints.map(point=>({point,route:findPath({navigation,start:motion.position,target:point})}))
  .filter(item=>item.route.status==='ok'&&item.route.points.length).sort((a,b)=>a.route.points.length-b.route.points.length)[0]||null;
}
function beginObject(){
 const object=pending?.object;if(!object||!objectAvailable(object)){cancelAction();return}
 actor.dataset.facing=object.facing;behaviour.set('interacting',object.durationMs);actor.classList.add('companion-interacting');
 effect=document.createElement('span');effect.className='companion-effect '+object.effectId;effect.setAttribute('aria-hidden','true');
 const rect=scene.getBoundingClientRect(),point=imageToScene(pending.point,livingRoomMap.image,rect,{fit:fit()});
 effect.style.left=(point.x*100)+'%';effect.style.top=(point.y*100)+'%';scene.append(effect);
 if(mapped&&audio.request)void audio.request({creatureId:room,mood:livingMoodProfile(state).voice,event:object.id==='rug'?'rest':'inspect',generation,userInitiated:pending.manual,objectId:object.id});
}
function finishArrival(){
 if(pending?.object){
  if(navigation.metric(motion.position,pending.point)>.018){cancelAction();return}
  beginObject();return;
 }
 pending=null;behaviour.set('resting',3000);
}
function requestObject(object,{manual=true}={}){
 if(!active||!mapped||document.hidden)return false;
 if(pending?.object?.id===object.id)return true;
 if(!objectAvailable(object)){if(manual)announce('That spot is not available just now.');return false}
 if(!behaviour.ready(object)){if(manual)announce('A little rest before visiting there again.');return false}
 const choice=routeToObject(object);
 if(!choice){if(manual)announce('I cannot reach that spot just now.');return false}
 motion.stop();cancelAction();pending={object,point:choice.point,manual};
 if(manual)attend();behaviour.set('walking');
 if(reduced()||choice.route.points.length<2){motion.relocate(choice.point);renderMapped();finishArrival()}
 else{motion.setRoute(choice.route.points);renderMapped()}
 return true;
}
function autonomous(){
 const objects=livingRoomMap.interactions.filter(o=>objectAvailable(o)&&routeToObject(o));
 const rests=livingRoomMap.restingSpots.filter(s=>findPath({navigation,start:motion.position,target:s.point}).status==='ok');
 const choice=behaviour.choose(objects,rests,livingMoodProfile(state));
 if(!choice)return;
 if(choice.kind==='object')requestObject(choice.value,{manual:false});
 else if(mappedInvite(choice.value.point,{manual:false,quiet:true})){spot=choice.value.id;actor.dataset.spot=spot}
 else behaviour.idle();
}
function nearFootprint(point,polygon){
 const xs=polygon.map(p=>p.x),ys=polygon.map(p=>p.y),marginX=livingRoomMap.footprintPx/livingRoomMap.image.width,marginY=livingRoomMap.footprintPx/livingRoomMap.image.height;
 return point.x>=Math.min(...xs)-marginX&&point.x<=Math.max(...xs)+marginX&&point.y>=Math.min(...ys)-marginY&&point.y<=Math.max(...ys)+marginY;
}
function rebuildNavigation(){
 const solids=solidMessObstacles(clutter),current=motion.position;
 suppressed=new Set(solids.filter(item=>nearFootprint(current,item.polygon)).map(item=>item.id));
 const obstacles=[...livingRoomMap.obstacles,...solids.filter(item=>!suppressed.has(item.id))];
 const map={...livingRoomMap,spawn:null,refuge:null,restingSpots:[],interactions:[]};
 const next=createNavigation(map,{obstacles});if(!next.valid)return false;
 navigation=next;motion.setNavigation(next);
 if(!navigation.safe(current,current)){
  const refuge=[livingRoomMap.refuge,livingRoomMap.spawn,...livingRoomMap.restingSpots.map(s=>s.point)].find(p=>navigation.safe(p,p));
  if(refuge){motion.relocate(refuge);actor.classList.add('companion-relocate');renderMapped()}
 }
 const remaining=motion.remaining;
 if(remaining.length>1&&remaining.some((p,i)=>i&&!navigation.safe(remaining[i-1],p))){
  const destination=motion.destination;motion.stop();
  if(destination){const route=findPath({navigation,start:motion.position,target:destination});if(route.points.length>1)motion.setRoute(route.points)}
 }
 renderMapped();return true;
}
function updateGeometry(next){
 clutter=next||[];const signature=messGeometrySignature(clutter);
 if(signature===solidSignature)return;
 solidSignature=signature;rebuildNavigation();
}
function releaseSuppressed(){
 if(!suppressed.size)return;
 const solids=solidMessObstacles(clutter),ready=[...suppressed].filter(id=>{const item=solids.find(p=>p.id===id);return !item||!nearFootprint(motion.position,item.polygon)});
 if(ready.length){for(const id of ready)suppressed.delete(id);rebuildNavigation()}
}
function frame(now){
 frameId=null;if(!active||document.hidden)return;
 if(room==='room-master'){
  animator?.update({mood:state,action:masterAction==='idle'&&actor.dataset.motion==='moving'?'walking':masterAction,reduced:reduced()});
  frameId=requestFrame(frame);return;
 }
 if(!mapped)return;
 const elapsed=lastFrame===null?0:Math.max(0,now-lastFrame);lastFrame=now;
 if(reduced()&&motion.moving)motion.stop();
 if(motion.moving){
  const result=motion.step(elapsed,.14*livingMoodProfile(state).speed);
  if(result.direction)actor.dataset.facing=result.direction.x<-.00001?'left':result.direction.x>.00001?'right':actor.dataset.facing||'front';
  renderMapped();releaseSuppressed();
 }
 if(behaviour.action==='walking'&&!motion.moving)finishArrival();
 if(behaviour.action==='interacting'&&clock()>=behaviour.deadline){
  const finished=pending;clearEffect();pending=null;
  if(finished){behaviour.finishObject(finished.object);if(finished.manual)announce(finished.object.id==='rug'?'That was a cosy rest.':'The plant looks lovely.');}
 }
 if((behaviour.action==='resting'||behaviour.action==='greeting'||behaviour.action==='celebrating')&&clock()>=behaviour.deadline)behaviour.idle();
 if(behaviour.canAuto({paused,hidden:document.hidden,reduced:reduced(),attentionUntil}))autonomous();
 animator?.update({mood:livingMoodProfile(state).expression,action:behaviour.action,objectId:pending?.object?.id,reduced:reduced()});
 frameId=requestFrame(frame);
}
function startFrames(){if((!mapped&&room!=='room-master')||frameId!==null&&frameId!==undefined||document.hidden)return;lastFrame=null;frameId=requestFrame(frame)}
function announce(){clearTimeout(greetingTimer);if(bubble)bubble.hidden=true}
function mappedInvite(target,{manual=true,quiet=false}={}){
 if(!active||!mapped||document.hidden)return false;
 const result=findPath({navigation,start:motion.position,target});
 if(result.status==='invalid')return false;
 const last=result.points.at(-1);
 if(!last||navigation.metric(last,motion.position)<.002){if(manual&&!quiet)announce('I can stay close by here.');return false}
 if(manual)attend();
 cancelAction();pending={object:null,point:last,manual};behaviour.set('walking');
 actor.classList.remove('companion-relocate');
 if(reduced()){motion.relocate(last);renderMapped();finishArrival()}
 else{motion.setRoute(result.points);renderMapped()}
 if(manual&&!quiet&&result.status==='unreachable')announce('I can come to the nearest clear spot.');
 return true;
}
function mappedWander(manual){
 const spots=livingRoomMap.restingSpots;
 if(manual){for(let i=0;i<spots.length;i++){manualSpotIndex=(manualSpotIndex+1)%spots.length;const next=spots[manualSpotIndex];if(mappedInvite(next.point,{quiet:true})){spot=next.id;actor.dataset.spot=spot;return}}return}
 const candidates=spots.filter(s=>s.id!==spot&&findPath({navigation,start:motion.position,target:s.point}).status==='ok');
 if(!candidates.length)return;
 const next=candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
 if(mappedInvite(next.point,{manual:false,quiet:true})){spot=next.id;actor.dataset.spot=spot}
}
function cancelMasterAction(){masterActionGeneration++;clearTimeout(masterActionTimer);masterActionTimer=null;masterPendingAction=null;masterAction='idle';masterActionDeadline=0;delete actor.dataset.interaction}
function stopMasterTravel(){
 masterMovementGeneration++;
 clearTimeout(movementTimer);movementTimer=null;
 if(actor.dataset.motion==='moving'){
  const position=window.getComputedStyle?.(actor);
  if(position){actor.style.transition='none';actor.style.left=position.left;actor.style.top=position.top;void actor.offsetWidth;actor.style.removeProperty('transition')}
 }
 actor.dataset.motion='idle';
}
function requestMasterAction(id,{manual=true}={}){
 const interaction=masterInteractions.find(item=>item.id===id);
 if(!interaction||!active||room!=='room-master'||document.hidden||!masterActionAvailable(interaction))return false;
 cancelMasterAction();stopMasterTravel();clearTimeout(greetingTimer);actor.classList.remove('greeting');clearTimeout(celebrationTimer);actor.classList.remove('companion-celebrating');
 const actionVersion=masterActionGeneration;
 if(manual)attend();masterPendingAction=id;masterActionDeadline=clock()+interaction.duration+2800;
 const begin=()=>{
  if(!active||masterPendingAction!==id||actionVersion!==masterActionGeneration||document.hidden)return;
  masterAction=interaction.action;masterActionDeadline=clock()+interaction.duration;actor.dataset.interaction=id;actor.dataset.facing='right';
  masterActionTimer=setTimeout(()=>{if(actionVersion!==masterActionGeneration)return;cancelMasterAction();attend();if(interaction.target&&spot==='bed')place('left')},interaction.duration);
 };
 if(interaction.target)place(interaction.target,true,begin);else begin();
 return true;
}
function masterActionAvailable(interaction){return (interaction?.moods||['SPOTLESS','CLEAN']).includes(state)}
function updateMasterButtons(){for(const button of objectButtons)if(button.dataset.masterAction)button.disabled=!masterActionAvailable(masterInteractions.find(item=>item.id===button.dataset.masterAction))}
function place(next,animate=true,onArrive){
 const previous=companionLayouts[room].spots[spot],destination=typeof next==='string'?companionLayouts[room].spots[next]||masterInteractions.find(item=>item.target?.id===next)?.target:next;
 if(!destination)return;
 if(room==='room-master'){
  const movementVersion=++masterMovementGeneration;
  clearTimeout(movementTimer);actor.dataset.facing=destination.x<(Number.parseFloat(actor.style.left)||previous?.x||destination.x)?'left':'right';
  actor.dataset.motion=animate&&!reduced()?'moving':'idle';
  if(actor.dataset.motion==='moving')movementTimer=setTimeout(()=>{if(movementVersion!==masterMovementGeneration||!active||document.hidden)return;actor.dataset.motion='idle';movementTimer=null;onArrive?.()},2800);
 }
 spot=typeof next==='string'?next:next.id;
 actor.style.left=destination.x+'%';actor.style.top=destination.y+'%';
 actor.dataset.spot=spot;
 if(room==='room-master'&&actor.dataset.motion!=='moving')onArrive?.();
}
function greet(){
 if(!active||document.hidden)return;
 if(room==='room-master'){cancelMasterAction();stopMasterTravel();masterAction='greeting';masterActionDeadline=clock()+4500}
 if(mapped){motion.stop();cancelAction();behaviour.set('greeting',4500);renderMapped()}
 attend();
 if(mapped&&audio.request)void audio.request({creatureId:room,mood:livingMoodProfile(state).voice,event:'greeting',generation,userInitiated:true});
 else void audio.play(state,room);
 clearTimeout(greetingTimer);if(bubble)bubble.hidden=true;actor.classList.remove('greeting');void actor.offsetWidth;actor.classList.add('greeting');
 greetingTimer=setTimeout(()=>{if(!active)return;actor.classList.remove('greeting');masterAction='idle'},4500);
}
function taskCompleted({id,roomId,fromMood,toMood,kind='task'}={}){
 if(!active||(!mapped&&room!=='room-master')||roomId!==room||document.hidden||scene.closest('.hide')||!id||completionIds.has(id))return false;
 completionIds.add(id);if(completionIds.size>64)completionIds.delete(completionIds.values().next().value);
 // A burst of completions makes one combined acknowledgement, not a stack of actions.
 if(clock()-lastCompletion<1200){lastCompletion=clock();return true}
 lastCompletion=clock();
 if(!mapped){
  cancelMasterAction();stopMasterTravel();
  masterAction='celebrating';
  masterActionDeadline=clock()+1400;
  clearTimeout(movementTimer);movementTimer=null;actor.dataset.motion='idle';
  clearTimeout(greetingTimer);actor.classList.remove('greeting');
  clearTimeout(celebrationTimer);actor.classList.remove('companion-celebrating');void actor.offsetWidth;actor.classList.add('companion-celebrating');attend();
  celebrationTimer=setTimeout(()=>{actor.classList.remove('companion-celebrating');celebrationTimer=null;masterAction='idle'},1400);
  return true;
 }
 motion.stop();cancelAction();behaviour.set('celebrating',2200);attend();renderMapped();
 const improved=fromMood!==toMood&&['SPOTLESS','CLEAN','MESSY','DISASTER'].indexOf(toMood)<['SPOTLESS','CLEAN','MESSY','DISASTER'].indexOf(fromMood);
 announce(kind==='sidequest'?'A little extra done. ♡':improved?'Thank you! The room feels calmer already. ♡':'Thank you for taking care of our room. ♡');
 if(audio.request)void audio.request({creatureId:room,mood:livingMoodProfile(state).voice,event:'completion',generation,userInitiated:true});
 return true;
}
function wander(manual=false){
 if(!active||!actor||!companionLayouts[room]||document.hidden||scene.closest('.hide')||(!manual&&(paused||reduced()||clock()<attentionUntil)))return;
 if(mapped){mappedWander(manual);return}
 if(room==='room-master'&&['MESSY','DISASTER'].includes(state)){if(masterPendingAction&&clock()<masterActionDeadline&&!manual)return;requestMasterAction(manual?'complain':random()<.5?'sigh':'complain',{manual});return}
 // A clutter-trapped guardian stays put, but still responds to a greeting.
 if(state==='DISASTER'){if(manual)greet();return}
 if(room==='room-master'){
  if((masterPendingAction||masterAction!=='idle')&&clock()>=masterActionDeadline)cancelMasterAction();
  if(!manual&&(masterPendingAction||masterAction!=='idle'))return;
  if(manual)cancelMasterAction();
  const chance=manual?0:random();
  if(chance>.15&&chance<.4&&requestMasterAction(chance<.32?'cat':'stretch',{manual:false}))return;
 }
 if(manual)attend();
 const spots=Object.keys(companionLayouts[room].spots);
 // Explore tours each safe spot in order; spontaneous visits vary without staying put.
 const alternatives=spots.filter(name=>name!==spot);
 const next=manual?spots[(spots.indexOf(spot)+1)%spots.length]:alternatives[Math.floor(random()*alternatives.length)];
 if(next)place(next);
}
const moodState=mess=>typeof mess==='string'?mess:mess?.state||'CLEAN';
function enter({roomId:id,mess,clutter:pieces=[]}){
 if(destroyed)return;
 if(active)leave();
 for(const button of objectButtons)button.remove();objectButtons=[];
 room=id;state=moodState(mess);active=true;actor.style.removeProperty('transition');
 mapped=id===livingRoomMap.id&&createNavigation(livingRoomMap).valid;
 actor.dataset.navigation=mapped?'map':'legacy';
 if(!mapped){actor.style.removeProperty('transform');delete actor.dataset.x;delete actor.dataset.y;delete actor.dataset.motion}
 if(!controls){
  try{paused=localStorage.getItem('mc-companion-paused')==='true'}catch{}
  if(pausedOverride!==undefined)paused=pausedOverride;
  controls=document.createElement('div');controls.className='companion-controls';controls.setAttribute('aria-label','Room companion');
  const hello=document.createElement('button');hello.type='button';hello.textContent='♡ Say hello';hello.onclick=greet;
  const explore=document.createElement('button');explore.type='button';explore.textContent='❧ Explore room';explore.onclick=()=>wander(true);
  const pause=document.createElement('button');pause.type='button';pause.textContent=paused?'Resume wandering':'Pause wandering';pause.setAttribute('aria-pressed',String(paused));pause.onclick=()=>{paused=!paused;pausedOverride=paused;pause.textContent=paused?'Resume wandering':'Pause wandering';pause.setAttribute('aria-pressed',String(paused));if(paused&&mapped&&pending&&!pending.manual){motion.stop();cancelAction();renderMapped()}try{localStorage.setItem('mc-companion-paused',String(paused))}catch{}};
  const sound=document.createElement('button');sound.type='button';sound.textContent='Sound off';sound.disabled=true;sound.hidden=true;sound.onclick=()=>{};
  controls.append(hello,explore,pause,sound);
  menu=document.createElement('details');menu.className='companion-menu';
  const summary=document.createElement('summary');summary.textContent='Creature';menu.append(summary,controls);
  document.querySelector('.room-toolbar').append(menu);
  bubble=document.createElement('p');bubble.className='companion-speech';bubble.setAttribute('role','status');bubble.hidden=true;scene.append(bubble);
  const hint=document.createElement('small');hint.textContent='Tap the room to invite your companion over.';controls.append(hint);
  scene.addEventListener('click',invite);
  scene.addEventListener('pointerdown',pointerDown);
  scene.addEventListener('pointermove',pointerMove);
  scene.addEventListener('pointerup',pointerUp);
  scene.addEventListener('pointercancel',pointerCancel);
  document.addEventListener('visibilitychange',visibilityChanged);
 }
 const living=!!companionLayouts[id];controls.hidden=!living;controls.parentElement.hidden=!living;
 if(mapped){
  behaviour.reset();pending=null;clearEffect();
  animator=createLivingAnimator({sprite:actor.querySelector('.guardian-sprite'),clock});animator.preload();
  clutter=pieces;solidSignature='';suppressed=new Set();navigation=createNavigation(livingRoomMap);motion=createRouteMotion({start:livingRoomMap.spawn,navigation});
  spot=livingRoomMap.restingSpots[0].id;manualSpotIndex=0;actor.dataset.spot=spot;actor.dataset.companionRoom=id;
  actor.tabIndex=0;actor.setAttribute('role','button');actor.setAttribute('aria-label','Say hello to the Nature Sprite');
  actor.onclick=greet;actor.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();greet()}};
  updateGeometry(clutter);renderMapped();startFrames();
  for(const object of livingRoomMap.interactions){const button=document.createElement('button');button.type='button';button.className='companion-object-control';button.textContent=object.label;button.setAttribute('aria-label',object.label);button.onclick=()=>requestObject(object);controls.append(button);objectButtons.push(button)}
  if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(()=>{renderMapped();positionRoomMess(scene,room,clutter)});resizeObserver.observe(scene)}
 }else if(living){
  animator=null;masterAction='idle';
  if(id==='room-master'){animator=createMasterAnimator({sprite:actor.querySelector?.('.guardian-sprite'),clock});animator.preload();startFrames()}
  spot=Object.keys(companionLayouts[id].spots)[0];
  actor.dataset.companionRoom=id;place(spot,false);actor.tabIndex=0;actor.setAttribute('role','button');actor.setAttribute('aria-label','Say hello to the '+companionLayouts[id].name);
  actor.onclick=greet;actor.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();greet()}};
  if(id==='room-master'){for(const interaction of masterInteractions){const button=document.createElement('button');button.type='button';button.className='companion-object-control';button.textContent=interaction.label;button.dataset.masterAction=interaction.id;button.onclick=()=>requestMasterAction(interaction.id);controls.append(button);objectButtons.push(button)}updateMasterButtons()}
 }else{
  animator=null;
  actor.dataset.companionRoom=id;actor.style.removeProperty('left');actor.style.removeProperty('top');actor.removeAttribute('tabindex');actor.removeAttribute('role');actor.removeAttribute('aria-label');actor.onclick=null;actor.onkeydown=null;bubble.hidden=true;
 }

 attend();
 if(!document.hidden&&living&&!mapped)interval=setInterval(()=>wander(),14000);
 actor.dataset.companionActive=String(!document.hidden);
}
function updateRoom({mess,clutter:pieces=[]}){if(!active)return;const previous=state;state=moodState(mess);if(room==='room-master'){if(masterPendingAction&&!masterActionAvailable(masterInteractions.find(item=>item.id===masterPendingAction))){cancelMasterAction();stopMasterTravel()}updateMasterButtons();animator?.update({mood:state,action:masterAction,reduced:reduced()})}if(mapped){updateGeometry(pieces);if(['SPOTLESS','CLEAN','MESSY','DISASTER'].indexOf(state)>['SPOTLESS','CLEAN','MESSY','DISASTER'].indexOf(previous)&&behaviour.action==='celebrating'){behaviour.idle();bubble.hidden=true}if(pending?.object&&(!objectAvailable(pending.object)||!routeToObject(pending.object)))cancelAction()}}
function invite(e){
 if(mapped)return;
 if(!active||document.hidden||!companionLayouts[room]||e.target.closest('#guardianArea,.room-sign,.companion-speech'))return;
 if(room==='room-master'&&['MESSY','DISASTER'].includes(state)){requestMasterAction('complain');return}
 if(state==='DISASTER'){greet();return}
 const rect=scene.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
 if(room==='room-master'&&x>=13&&x<=32&&y>=42&&y<=50&&requestMasterAction('cat'))return;
 const next=nearestCompanionSpot(room,x,y);
 if(next){if(room==='room-master')cancelMasterAction();attend();place(next)}
}
function pointerDown(e){
 if(!mapped||!active||document.hidden||e.target.closest('#guardianArea,.room-sign,.companion-speech'))return;
 pointerStart={id:e.pointerId,x:e.clientX,y:e.clientY,scrollY:window.scrollY,time:clock(),moved:false};
}
function pointerMove(e){if(pointerStart?.id===e.pointerId&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>10)pointerStart.moved=true}
function pointerCancel(){pointerStart=null}
function pointerUp(e){
 const start=pointerStart;pointerStart=null;
 if(!mapped||!start||start.id!==e.pointerId||start.moved||Math.hypot(e.clientX-start.x,e.clientY-start.y)>10||Math.abs(window.scrollY-start.scrollY)>4||clock()-start.time>500||new URLSearchParams(location.search).get('creatureDebug')==='1')return;
 if(e.target.closest('#guardianArea,.room-sign,.companion-speech'))return;
 const rect=scene.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const point=sceneToImage({x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height},livingRoomMap.image,rect,{fit:fit()});
 const object=livingRoomMap.interactions.find(item=>hitInteraction(point,item));if(object){requestObject(object);return}
 mappedInvite(point);
}
function stopActivity(){
 masterMovementGeneration++;
 cancelMasterAction();
 generation++;clearInterval(interval);interval=null;clearTimeout(greetingTimer);greetingTimer=null;
 clearTimeout(movementTimer);movementTimer=null;clearTimeout(celebrationTimer);celebrationTimer=null;actor.dataset.motion='idle';actor.classList.remove('companion-celebrating');
 if(bubble)bubble.hidden=true;
 actor.classList.remove('greeting');actor.dataset.companionActive='false';masterAction='idle';
 if(frameId!==null&&frameId!==undefined)cancelFrame(frameId);frameId=null;lastFrame=null;
 animator?.stop();
 // Freeze legacy CSS travel at its visible position before disabling transitions.
 if(mapped){if(frameId!==null&&frameId!==undefined)cancelFrame(frameId);frameId=null;lastFrame=null;motion?.stop();pointerStart=null;cancelAction();renderMapped()}
 else{const position=window.getComputedStyle?.(actor);if(position){actor.style.left=position.left;actor.style.top=position.top}actor.style.transition='none'}
 audio.stop();
}
function visibilityChanged(){
 if(!active)return;
 if(document.hidden)stopActivity();
 else{clearInterval(interval);attend();actor.style.removeProperty('transition');if(mapped){behaviour.reset();renderMapped();startFrames()}else if(companionLayouts[room]){place(spot,false);if(room==='room-master')startFrames()}if(companionLayouts[room]&&!mapped)interval=setInterval(()=>wander(),14000);actor.dataset.companionActive='true'}
}
function leave(){
 if(!active)return;
 stopActivity();active=false;
 actor.onclick=null;actor.onkeydown=null;
 actor.removeAttribute('tabindex');actor.removeAttribute('role');actor.removeAttribute('aria-label');
 if(menu)menu.hidden=true;
}
function destroy(){
 if(destroyed)return;
 leave();destroyed=true;
 scene.removeEventListener('click',invite);scene.removeEventListener('pointerdown',pointerDown);scene.removeEventListener('pointermove',pointerMove);scene.removeEventListener('pointerup',pointerUp);scene.removeEventListener('pointercancel',pointerCancel);document.removeEventListener('visibilitychange',visibilityChanged);resizeObserver?.disconnect();resizeObserver=null;
 menu?.remove();bubble?.remove();
}
return {get roomId(){return room},get position(){return motion?.position},get route(){return motion?.remaining},get navigation(){return navigation},get action(){return room==='room-master'?masterAction:behaviour.action},enter,updateRoom,taskCompleted,invite:point=>mappedInvite(point),interact:id=>{if(room==='room-master')return requestMasterAction(id);const object=livingRoomMap.interactions.find(o=>o.id===id);return object?requestObject(object):false},greet,leave,destroy};
}
