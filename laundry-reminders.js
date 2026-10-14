import {localStorage} from './safe-storage.js';
import {laundryProgress,laundryLoadProgress} from './laundry.js?v=checklist-20261012-v3';
const TWO_HOURS=2*60*60*1000,HALF_HOUR=30*60*1000;
export function laundryReminder(state,cycle,now=Date.now()){
 const load=typeof cycle==='number',progress=load?laundryLoadProgress(state,cycle):laundryProgress(state,cycle);if(!progress)return null;if(load?!progress.needsTransfer:progress.index!==1)return null;
 const saved=state.settings?.find(item=>item.id===(load?'laundry-load-'+cycle:cycle==='dryer'?'laundry-dryer-progress':'laundry-progress'));
 const win=state.wins?.find(item=>item.laundry&&(load?item.laundryLoad===cycle:(item.laundryCycle||'rail')===cycle)&&item.laundrySequence===progress.completed);
 const startedAt=Date.parse(saved?.reminderStartedAt||win?.at);if(!Number.isFinite(startedAt))return null;
 const firstAt=startedAt+TWO_HOURS,due=now>=firstAt,slot=due?Math.floor((now-firstAt)/HALF_HOUR):-1;
 return {cycle,startedAt,firstAt,slot,due,nextAt:due?firstAt+(slot+1)*HALF_HOUR:firstAt,actorId:saved?.reminderActorId||win?.completedBy,text:load?'Put washing in the dryer or on the hanging rail':cycle==='dryer'?'Put washing in the dryer':'Put out washing'};
}
export function inactiveLaundryReminderCycles(state,actorId,now=Date.now()){
 const cycles=state.settings?.some(row=>row.id==='laundry-load-1')?[1,2]:['rail','dryer'];
 return cycles.filter(cycle=>{const reminder=laundryReminder(state,cycle,now);return !reminder||reminder.actorId!==actorId||!reminder.due});
}
export function initLaundryReminders({get,actor,house,show}){
 const audio=new Audio('assets/audio/calm.wav');audio.preload='auto';audio.volume=.5;
 const unlock=()=>{audio.play().then(()=>{audio.pause();audio.currentTime=0}).catch(()=>{});document.removeEventListener('pointerdown',unlock,true)};
 document.addEventListener('pointerdown',unlock,true);
 const dismiss=cycle=>{
  if(!('serviceWorker'in navigator))return;
  navigator.serviceWorker.ready.then(registration=>registration.getNotifications?.({tag:'laundry-'+cycle})).then(notifications=>notifications?.forEach(notification=>notification.close())).catch(()=>{});
 };
 const tick=()=>{
  const state=get();let active=false;
  for(const cycle of state.settings?.some(row=>row.id==='laundry-load-1')?[1,2]:['rail','dryer']){
   const reminder=laundryReminder(state,cycle);if(!reminder||reminder.actorId!==actor().id||!reminder.due){dismiss(cycle);continue}active=true;
   const key=`mc-laundry-reminder:${house()}:${cycle}:${reminder.startedAt}`;
   if(Number(localStorage.getItem(key)??-1)>=reminder.slot)continue;
   localStorage.setItem(key,String(reminder.slot));show(reminder.text);
   audio.currentTime=0;audio.play().catch(()=>show(reminder.text+' — tap the app to enable reminder sound.'));
   if('Notification' in window&&Notification.permission==='granted'&&document.hidden)navigator.serviceWorker.ready.then(registration=>registration.showNotification('Laundry reminder',{body:reminder.text,tag:'laundry-'+cycle,icon:'./icon-192.png',data:{laundry:true,url:'./'}})).catch(()=>{});
  }
  if(!active){audio.pause();audio.currentTime=0}
 };
 setInterval(tick,15000);document.addEventListener('visibilitychange',tick);window.addEventListener('pageshow',tick);
 return {tick};
}
