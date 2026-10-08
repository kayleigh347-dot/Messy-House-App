import test from 'node:test';
import assert from 'node:assert/strict';

test('greetings and invitations hold attention; manual movement and room changes remain responsive',async()=>{
 const keys=['document','window','localStorage','performance','setInterval','setTimeout','clearTimeout','clearInterval'];
 const originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const originalRandom=Math.random;
 let now=0,tick,reduced=false,visibilityChanged,liveIntervals=new Set(),timeouts=new Map(),sequence=0;
 const element=()=>({children:[],dataset:{},style:{removeProperty(){}},classList:{values:new Set(),add(v){this.values.add(v)},remove(v){this.values.delete(v)}},hidden:false,
  setAttribute(){},removeAttribute(){},append(...nodes){for(const n of nodes){n.parentElement=this;this.children.push(n)}},
  insertBefore(n){this.append(n)},addEventListener(name,fn){this[name]=fn},removeEventListener(name){delete this[name]},remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this)},closest(){return null},
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}});
 const scene=element(),actor=element(),toolbar=element(),add=element();
 try{
  globalThis.performance={now:()=>now};globalThis.setInterval=fn=>{tick=fn;const id=++sequence;liveIntervals.add(id);return id};globalThis.clearInterval=id=>liveIntervals.delete(id);globalThis.setTimeout=fn=>{const id=++sequence;timeouts.set(id,fn);return id};globalThis.clearTimeout=id=>timeouts.delete(id);
  globalThis.window={matchMedia:()=>({matches:reduced})};globalThis.localStorage={getItem:()=>null,setItem(){}};
  globalThis.document={hidden:false,createElement:element,addEventListener(name,fn){if(name==='visibilitychange')visibilityChanged=fn},removeEventListener(name){if(name==='visibilitychange')visibilityChanged=null},querySelector:s=>({'#roomScene':scene,'#guardianArea':actor,'.room-toolbar':toolbar,'#roomQuickAdd':add}[s])};
  const {updateCompanion,leaveCompanion,notifyCompanionTaskCompleted}=await import('../room-companion.js?attention-test');
  updateCompanion('room-master','SPOTLESS');
  const controls=()=>toolbar.children[0].children[1];
  const initial=actor.dataset.spot;
  Math.random=()=>0;tick();assert.equal(actor.dataset.spot,initial,'entry holds attention');now=14000;tick();assert.equal(actor.dataset.spot,'left');assert.equal(actor.dataset.motion,'moving','Bigfoot walks while travelling');
  Math.random=()=>0.999999;tick();assert.equal(actor.dataset.spot,'right','automatic visits can skip the fixed tour');
  tick();assert.equal(actor.dataset.spot,'front','automatic visits exclude the current destination');
  controls().children[1].onclick();assert.equal(actor.dataset.spot,'right','Explore retains the ordered tour');
  updateCompanion('room-bathroom','SPOTLESS');updateCompanion('room-master','SPOTLESS');
  actor.onclick();tick();assert.equal(actor.dataset.spot,initial,'greeting holds destination');
  now+=13999;tick();assert.equal(actor.dataset.spot,initial);
  now+=1;tick();assert.notEqual(actor.dataset.spot,initial,'wandering resumes after attention');
  controls().children[1].onclick();const explored=actor.dataset.spot;
  tick();assert.equal(actor.dataset.spot,explored,'Explore also grants rest');
  scene.click({target:scene,clientX:90,clientY:90});const invited=actor.dataset.spot;
  now+=100;tick();assert.equal(actor.dataset.spot,invited,'invitation is not interrupted');
  updateCompanion('room-bathroom','CLEAN');const master=actor.dataset.spot;
  tick();assert.equal(actor.dataset.spot,master,'room entry grants fresh attention');now+=14000;tick();assert.notEqual(actor.dataset.spot,master);
  controls().children[2].onclick();now+=15000;const paused=actor.dataset.spot;tick();assert.equal(actor.dataset.spot,paused);
  controls().children[1].onclick();assert.notEqual(actor.dataset.spot,paused,'manual exploration works while paused');
  controls().children[2].onclick();now+=15000;reduced=true;const still=actor.dataset.spot;tick();assert.equal(actor.dataset.spot,still);
  reduced=false;actor.onclick();assert.ok(actor.classList.values.has('greeting'));
  document.hidden=true;visibilityChanged();
  assert.equal(scene.children[0].hidden,true,'leaving hides the greeting');assert.equal(liveIntervals.size,0,'hide cancels the loop');assert.equal(timeouts.size,0);
  assert.equal(actor.classList.values.has('greeting'),false,'leaving clears greeting animation');
  now+=60000;tick();assert.equal(actor.dataset.spot,still,'hidden page cannot wander');
  document.hidden=false;visibilityChanged();tick();assert.equal(actor.dataset.spot,still,'return grants a fresh rest');
  assert.match(actor.style.left,/%$/,'return restores normalized room coordinates');
  assert.match(actor.style.top,/%$/,'return restores normalized room coordinates');
  now+=13999;tick();assert.equal(actor.dataset.spot,still);
  now+=1;tick();assert.notEqual(actor.dataset.spot,still,'wandering resumes after return rest');
  controls().children[1].onclick();const returned=actor.dataset.spot;
  reduced=false;updateCompanion('room-bathroom','DISASTER');controls().children[1].onclick();assert.equal(actor.dataset.spot,returned,'Disaster stays put');

  const actorBefore=actor,spotBefore=actor.dataset.spot;
  updateCompanion('room-bathroom','CLEAN');updateCompanion('room-bathroom','MESSY');
  assert.equal(actor,actorBefore);assert.equal(actor.dataset.spot,spotBefore);
  assert.equal(toolbar.children.length,1);assert.equal(scene.children.length,1);assert.equal(liveIntervals.size,1);
  actor.onclick();const staleGreeting=[...timeouts.values()][0],staleTick=tick;
  updateCompanion('room-master','SPOTLESS');actor.onclick();staleGreeting();staleTick();
  assert.equal(scene.children[0].hidden,true,'greetings no longer create a text bubble');
  assert.equal(liveIntervals.size,1);assert.equal(timeouts.size,1);
  leaveCompanion();leaveCompanion();
  assert.equal(liveIntervals.size,0);assert.equal(timeouts.size,0);assert.equal(toolbar.children.length,0);assert.equal(scene.children.length,0);
  assert.equal(actor.onclick,null);assert.equal(scene.click,undefined);assert.equal(visibilityChanged,null);
  const stoppedSpot=actor.dataset.spot;staleTick();assert.equal(actor.dataset.spot,stoppedSpot);
  localStorage.getItem=()=>{throw Error('blocked')};localStorage.setItem=()=>{throw Error('blocked')};
  updateCompanion('room-master','CLEAN');
  assert.equal(notifyCompanionTaskCompleted({id:'bedroom-task',roomId:'room-master',fromMood:'MESSY',toMood:'CLEAN'}),true);
  assert.ok(actor.classList.values.has('companion-celebrating'));
  assert.equal(notifyCompanionTaskCompleted({id:'bedroom-task',roomId:'room-master',fromMood:'MESSY',toMood:'CLEAN'}),false,'one celebration per completed task');
  const cat=controls().children.find(button=>button.dataset.masterAction==='cat'),stretch=controls().children.find(button=>button.dataset.masterAction==='stretch');
  assert.ok(cat&&stretch,'bedroom offers both new actions');
  cat.onclick();assert.equal(actor.dataset.motion,'moving');assert.equal(actor.dataset.spot,'bed');assert.equal(actor.dataset.interaction,undefined,'cat stroke waits for arrival');
  const staleArrival=[...timeouts.values()][0];controls().children[1].onclick();staleArrival();assert.equal(actor.dataset.interaction,undefined,'rerouting cancels a pending cat stroke');
  cat.onclick();const [arrivalId,arrival]=[...timeouts.entries()][0];timeouts.delete(arrivalId);now+=2800;arrival();assert.equal(actor.dataset.interaction,'cat');assert.equal(actor.dataset.motion,'idle');
  stretch.onclick();assert.equal(actor.dataset.interaction,'stretch','stretch replaces petting without stacking timers');assert.equal(timeouts.size,1);
  actor.onclick();assert.equal(actor.dataset.interaction,undefined,'greeting interrupts a cute action');
  cat.onclick();updateCompanion('room-master','DISASTER');assert.equal(cat.disabled,true);assert.equal(stretch.disabled,true);assert.equal(actor.dataset.interaction,undefined);assert.equal(timeouts.size,0,'a cluttered state cancels pending travel and actions');
  assert.equal(cat.onclick(),false,'cluttered states reject cheerful actions');
  const sigh=controls().children.find(button=>button.dataset.masterAction==='sigh'),complain=controls().children.find(button=>button.dataset.masterAction==='complain');
  assert.equal(sigh.disabled,false);assert.equal(complain.disabled,false);sigh.onclick();assert.equal(actor.dataset.interaction,'sigh');assert.equal(actor.dataset.motion,'idle');
  controls().children[1].onclick();assert.equal(actor.dataset.interaction,'complain','exploring a disaster expresses displeasure instead of sliding through clutter');
  updateCompanion('room-master','CLEAN');assert.equal(cat.disabled,false);assert.equal(sigh.disabled,true);assert.equal(actor.dataset.interaction,undefined,'improvement cancels the sad action');
  scene.click({target:scene,clientX:26,clientY:46});assert.equal(actor.dataset.spot,'bed','tapping the pictured cat starts its interaction');
  document.hidden=true;visibilityChanged();assert.equal(timeouts.size,0,'hiding cancels the bed arrival');document.hidden=false;visibilityChanged();
  cat.onclick();const [nextArrivalId,nextArrival]=[...timeouts.entries()][0];timeouts.delete(nextArrivalId);nextArrival();
  const [strokeId,strokeEnd]=[...timeouts.entries()][0];timeouts.delete(strokeId);strokeEnd();assert.equal(actor.dataset.spot,'left','after petting he steps back onto the floor');assert.equal(actor.dataset.motion,'moving');
  controls().children[2].onclick();controls().children[3].onclick();
  leaveCompanion();
 }finally{Math.random=originalRandom;for(const [k,d] of originals){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k]}}
});
