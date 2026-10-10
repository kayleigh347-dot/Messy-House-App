import {laundryProgress} from './laundry.js?v=laundry-uniform-20261010-v1';
const TWO_HOURS=2*60*60*1000,HALF_HOUR=30*60*1000;
export function laundryReminder(state,cycle,now=Date.now()){
 const progress=laundryProgress(state,cycle);if(progress.index!==1)return null;
 const saved=state.settings?.find(item=>item.id===(cycle==='dryer'?'laundry-dryer-progress':'laundry-progress'));
 const win=state.wins?.find(item=>item.laundry&&(item.laundryCycle||'rail')===cycle&&item.laundrySequence===progress.completed);
 const startedAt=Date.parse(saved?.reminderStartedAt||win?.at);if(!Number.isFinite(startedAt))return null;
 const firstAt=startedAt+TWO_HOURS,due=now>=firstAt,slot=due?Math.floor((now-firstAt)/HALF_HOUR):-1;
 return {cycle,startedAt,firstAt,slot,due,nextAt:due?firstAt+(slot+1)*HALF_HOUR:firstAt,actorId:saved?.reminderActorId||win?.completedBy,text:cycle==='dryer'?'Put washing in the dryer':'Put out washing'};
}
export function initLaundryReminders({get,actor,house,show}){
 const audio=new Audio('assets/audio/calm.wav');audio.preload='auto';audio.volume=.5;
 const unlock=()=>{audio.play().then(()=>{audio.pause();audio.currentTime=0}).catch(()=>{});document.removeEventListener('pointerdown',unlock,true)};
 document.addEventListener('pointerdown',unlock,true);
 const tick=()=>{
  const state=get();let active=false;
  for(const cycle of ['rail','dryer']){
   const reminder=laundryReminder(state,cycle);if(!reminder||reminder.actorId!==actor().id||!reminder.due)continue;active=true;
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
