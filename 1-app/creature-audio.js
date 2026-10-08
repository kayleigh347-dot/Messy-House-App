// Short, local synth voices. Rendering and remote updates never start audio.
export const voices={
 SPOTLESS:{notes:[620,830,1040],duration:.12,wave:'sine'},
 CLEAN:{notes:[460,610],duration:.17,wave:'sine'},
 MESSY:{notes:[260,210,240],duration:.16,wave:'triangle'},
 DISASTER:{notes:[180,140],duration:.26,wave:'triangle'}
};
const priorities={rest:0,inspect:0,completion:1,greeting:2};
const clamp=value=>Math.max(0,Math.min(100,Number.isFinite(Number(value))?Number(value):35));
export function createCreatureAudio({now=()=>performance.now(),Audio=()=>globalThis.window?.AudioContext||globalThis.window?.webkitAudioContext,storage=()=>globalThis.localStorage,hidden=()=>globalThis.document?.hidden||false}={}){
 let context,master,mutedOverride,volumeOverride,version=0,unlocked=false,activePriority=-1,lastAuto=-Infinity;
 const active=new Set(),objectTimes=new Map();
 const read=key=>{try{return storage()?.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{storage()?.setItem(key,String(value))}catch{}};
 function isMuted(){return mutedOverride??(read('mc-creature-muted')==='true')}
 function getVolume(){return volumeOverride??clamp(read('mc-creature-volume')??35)}
 function rampVolume(){if(!master||!context)return;const gain=master.gain,t=context.currentTime;gain.cancelScheduledValues?.(t);gain.setValueAtTime(gain.value??0,t);gain.linearRampToValueAtTime(isMuted()?0:getVolume()/100,t+.04)}
 function stop(){version++;activePriority=-1;for(const {osc,gain} of active){try{osc.stop()}catch{}osc.disconnect();gain.disconnect()}active.clear()}
 function setMuted(value){mutedOverride=Boolean(value);write('mc-creature-muted',mutedOverride);if(mutedOverride)stop();rampVolume()}
 function setVolume(value){volumeOverride=clamp(value);write('mc-creature-volume',volumeOverride);if(volumeOverride===0)stop();rampVolume();return volumeOverride}
 function voiceFor({creatureId='',mood='CLEAN',event='greeting'}){
  const base=voices[mood]||voices.CLEAN;
  const tint=1+([...creatureId].reduce((n,c)=>n+c.charCodeAt(0),0)%5-2)*.065;
  const patterns={greeting:base.notes,completion:[base.notes[0],base.notes.at(-1),Math.min(1200,base.notes.at(-1)*1.12)],inspect:[base.notes[0],base.notes.at(-1)],rest:[base.notes.at(-1),base.notes[0]]};
  return {...base,notes:(patterns[event]||base.notes).map(n=>n*tint),peak:event==='greeting'?.045:event==='completion'?.038:.025};
 }
 async function request({creatureId,mood,event='greeting',generation,userInitiated=false,objectId}={}){
  if(isMuted()||getVolume()===0||hidden()||!creatureId)return false;
  const priority=priorities[event];if(priority===undefined)return false;
  if(!userInitiated){if(!unlocked||priority<activePriority||now()-lastAuto<15000||objectId&&now()-(objectTimes.get(objectId)??-Infinity)<30000)return false}
  if(userInitiated&&priority<activePriority)return false;
  stop();activePriority=priority;const current=version;
  const AudioClass=Audio();if(!AudioClass){activePriority=-1;return false}
  try{
   context ||= new AudioClass();if(context.state==='suspended')await context.resume();
   if(current!==version||context.state!=='running'||isMuted()||getVolume()===0||hidden())return false;
   if(userInitiated)unlocked=true;
   master ||= context.createGain();if(!master.connected){master.connect(context.destination);master.connected=true}rampVolume();
   const voice=voiceFor({creatureId,mood,event}),start=context.currentTime;
   voice.notes.forEach((frequency,i)=>{
    const osc=context.createOscillator(),gain=context.createGain(),t=start+i*voice.duration;
    osc.type=voice.wave;osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.86,t+voice.duration*.85);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(voice.peak,t+.02);gain.gain.exponentialRampToValueAtTime(.001,t+voice.duration*.9);
    osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+voice.duration);
    const item={osc,gain};active.add(item);osc.onended=()=>{osc.disconnect();gain.disconnect();active.delete(item);if(!active.size&&current===version)activePriority=-1};
   });
   if(!userInitiated){lastAuto=now();if(objectId)objectTimes.set(objectId,now())}return true;
  }catch{if(current===version)activePriority=-1;return false}
 }
 return {request,stop,isMuted,setMuted,getVolume,setVolume,voiceFor};
}
const player=createCreatureAudio();
export const requestCreatureSound=event=>player.request(event);
export const stopCreatureVoice=()=>player.stop();
export const isCreatureMuted=()=>player.isMuted();
export const setCreatureMuted=value=>player.setMuted(value);
export const getCreatureVolume=()=>player.getVolume();
export const setCreatureVolume=value=>player.setVolume(value);
export const playCreatureVoice=(state,room)=>player.request({creatureId:room,mood:state,event:'greeting',userInitiated:true});
