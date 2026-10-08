import test from 'node:test';
import assert from 'node:assert/strict';
import {voices,createCreatureAudio} from '../creature-audio.js';
test('all mess states have distinct brief, bounded creature voices',()=>{
 assert.deepEqual(Object.keys(voices),['SPOTLESS','CLEAN','MESSY','DISASTER']);
 assert.equal(new Set(Object.values(voices).map(v=>v.notes.join(','))).size,4);
 for(const voice of Object.values(voices)){
  assert.ok(voice.duration*voice.notes.length<1);
  assert.ok(voice.notes.every(n=>Number.isFinite(n)&&n>=100&&n<=1200));
 }
});

test('event sound policy gates auto playback, enforces priority/cooldowns and clamps persisted volume',async()=>{
 let time=0,suspended=false,resume,created=0;const saved=new Map();
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
 class AudioContext{
  constructor(){this.state=suspended?'suspended':'running';this.currentTime=0;this.destination={}}
  resume(){return new Promise(resolve=>{resume=()=>{this.state='running';resolve()}})}
  createOscillator(){created++;return {frequency:param(),connect(){},disconnect(){},start(){},stop(){}}}
  createGain(){return {gain:param(),connect(){},disconnect(){}}}
 }
 const player=createCreatureAudio({now:()=>time,Audio:()=>AudioContext,storage:()=>({getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)}),hidden:()=>false});
 const event=(type,userInitiated=false,objectId)=>({creatureId:'room-living',mood:'CLEAN',event:type,userInitiated,objectId});
 assert.equal(await player.request(event('inspect',false,'plant')),false,'page load cannot unlock sound');
 assert.equal(player.setVolume(200),100);assert.equal(saved.get('mc-creature-volume'),'100');
 assert.equal(player.setVolume(-5),0);assert.equal(await player.request(event('greeting',true)),false);
 player.setVolume(35);assert.equal(await player.request(event('greeting',true)),true);
 assert.equal(await player.request(event('inspect',false,'plant')),false,'automatic sound cannot interrupt greeting');
 player.stop();assert.equal(await player.request(event('inspect',false,'plant')),true);
 const first=created;assert.equal(await player.request(event('rest',false,'rug')),false,'global automatic cooldown');
 time=16000;assert.equal(await player.request(event('inspect',false,'plant')),false,'object cooldown outlasts global cooldown');
 assert.equal(await player.request(event('rest',false,'rug')),true);assert.ok(created>first);
 player.stop();time=32000;assert.equal(await player.request(event('inspect',false,'plant')),true);
 player.setMuted(true);assert.equal(await player.request(event('greeting',true)),false);
 player.setMuted(false);player.stop();suspended=true;
 // A fresh player models a room whose first gesture is waiting for audio resume.
 const pendingPlayer=createCreatureAudio({now:()=>time,Audio:()=>AudioContext,storage:()=>({getItem:()=>null,setItem(){}}),hidden:()=>false});
  const pending=pendingPlayer.request(event('greeting',true));pendingPlayer.stop();resume();
  assert.equal(await pending,false,'room exit cancels a pending resume');
  const unavailable=createCreatureAudio({Audio:()=>undefined,storage:()=>{throw Error('blocked')}});
  assert.equal(unavailable.getVolume(),35);assert.equal(unavailable.setVolume(101),100);
  assert.equal(await unavailable.request(event('greeting',true)),false,'missing audio support leaves controls usable');
});

test('mute cancels active and pending greetings; rapid taps replace sounds',async()=>{
 const originalWindow=globalThis.window,originalStorage=globalThis.localStorage;
 const oscillators=[];let audio,finishResume;
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
 class AudioContext{
  constructor(){audio=this;this.state='running';this.currentTime=0;this.destination={}}
  resume(){return new Promise(resolve=>{finishResume=()=>{this.state='running';resolve()}})}
  createOscillator(){const osc={frequency:param(),connect(){},disconnect(){},start(){},stop(){this.stops=(this.stops||0)+1}};oscillators.push(osc);return osc}
  createGain(){return {gain:param(),connect(){},disconnect(){}}}
 }
 try{
  globalThis.window={AudioContext};
  globalThis.localStorage={getItem(){return null},setItem(){throw new Error('Storage unavailable')}};
  const {playCreatureVoice,setCreatureMuted,isCreatureMuted,stopCreatureVoice}=await import('../creature-audio.js?controls-test');
  assert.equal(await playCreatureVoice('SPOTLESS','room-living'),true);
  const first=oscillators.slice();
  await playCreatureVoice('CLEAN','room-living');
  assert.ok(first.every(o=>o.stops===2),'previous notes stopped early');
  setCreatureMuted(true);
  assert.equal(isCreatureMuted(),true,'mute works even when storage is blocked');
  assert.ok(oscillators.every(o=>o.stops===2));
  assert.equal(await playCreatureVoice('MESSY','room-living'),false);
  setCreatureMuted(false);audio.state='suspended';
  const pending=playCreatureVoice('DISASTER','room-living');
  const count=oscillators.length;setCreatureMuted(true);setCreatureMuted(false);finishResume();
  assert.equal(await pending,false,'cancelled greeting cannot resume after unmuting');
  assert.equal(oscillators.length,count);
  audio.state='suspended';const hiddenPending=playCreatureVoice('CLEAN','room-living');
  stopCreatureVoice();finishResume();
  assert.equal(await hiddenPending,false,'leaving cancels a pending audio resume');
  assert.equal(isCreatureMuted(),false,'stopping preserves sound preference');
  assert.equal(await playCreatureVoice('CLEAN','room-living'),true,'next greeting remains available');
  const current=oscillators.slice(count);stopCreatureVoice();
  assert.ok(current.every(o=>o.stops===2),'leaving stops active notes');
 }finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
 }
});
