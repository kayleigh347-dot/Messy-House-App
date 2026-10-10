// Original arrangements rendered from sampled acoustic instruments. See audio credits.
export const alarmSongs=[
 {id:'calm',name:'Calm piano',instrument:'piano',description:'Warm sampled piano',bpm:72},
 {id:'morning',name:'Marimba morning',instrument:'marimba',description:'Soft wooden mallets',bpm:96},
 {id:'waltz',name:'Cello waltz',instrument:'cello',description:'Low bowed strings',bpm:84},
 {id:'steps',name:'Guitar steps',instrument:'guitar',description:'Gentle nylon strings',bpm:108},
 {id:'dubstep',name:'Deep bass drop',instrument:'bass',description:'Half-time bass, cello and drums; no sharp synths',bpm:140}
];
export const songById=id=>alarmSongs.find(song=>song.id===id)||alarmSongs[0];
const audioPath=id=>'assets/audio/'+songById(id).id+'.wav';
const loaded=new Map(),pending=new Map();
export async function prepareAlarm(id){
 id=songById(id).id;if(loaded.has(id))return loaded.get(id);
 if(!pending.has(id))pending.set(id,fetch(audioPath(id)).then(response=>{if(!response.ok)throw new Error('Tune unavailable');return response.arrayBuffer()}).then(buffer=>{const data=parseTune(buffer);loaded.set(id,data);pending.delete(id);return data}).catch(error=>{pending.delete(id);throw error}));
 return pending.get(id);
}
export function parseTune(buffer){
 const view=new DataView(buffer);if(view.getUint16(22,true)!==1||view.getUint16(34,true)!==8)throw new Error('Unsupported tune format');
 let offset=12;
 while(offset+8<=buffer.byteLength){const name=String.fromCharCode(...new Uint8Array(buffer,offset,4)),size=view.getUint32(offset+4,true);if(name==='data')return {rate:view.getUint32(24,true),samples:new Uint8Array(buffer,offset+8,size)};offset+=8+size+(size%2)}
 throw new Error('Missing tune audio');
}
function wavHeader(size,rate){const buffer=new ArrayBuffer(44),view=new DataView(buffer);for(const [at,text] of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<text.length;i++)view.setUint8(at+i,text.charCodeAt(i));view.setUint32(4,size+36,true);view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate,true);view.setUint16(32,1,true);view.setUint16(34,8,true);view.setUint32(40,size,true);return buffer}
// A single media track carries the countdown and alarm. No background JS is needed
// to reach the alarm, and repeated Blob parts avoid allocating a whole long PCM array.
export function countdownTrack(seconds,alarm,calm){
 if(alarm.rate!==calm.rate)throw new Error('Tune rates must match');
 const countdown=Math.max(0,Math.ceil(seconds*alarm.rate)),alarmLength=alarm.rate*600,parts=[wavHeader(countdown+alarmLength,alarm.rate)];
 const quiet=Uint8Array.from(calm.samples,value=>128+Math.round((value-128)*.08));
 const append=(samples,length)=>{while(length>0){const take=Math.min(length,samples.length);parts.push(take===samples.length?samples:samples.subarray(0,take));length-=take}};
 append(quiet,countdown);append(alarm.samples,alarmLength);
 return new Blob(parts,{type:'audio/wav'});
}
export function createAlarmPlayer(_context,{makeAudio=()=>new Audio(),makeURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url)}={}){
 const audio=makeAudio();audio.preload='auto';let activeId=null,blobURL=null,playing=false,countdown=false,startedAt=0;
 function stop(){audio.pause();audio.removeAttribute('src');audio.load();if(blobURL)revokeURL(blobURL);blobURL=null;activeId=null;playing=false;countdown=false}
 function play(id,volume=.65,{seconds=0}={}){
 stop();activeId=songById(id).id;audio.volume=Math.max(0,Math.min(1,volume));
 countdown=seconds>0;startedAt=Date.now();
 if(countdown){const alarm=loaded.get(activeId),calm=loaded.get('calm');if(!alarm||!calm)throw new Error('Wait for the tunes to load');blobURL=makeURL(countdownTrack(seconds,alarm,calm));audio.src=blobURL;audio.loop=false}
 else{audio.src=audioPath(activeId);audio.loop=true}
 audio.onended=()=>{if(countdown)play(activeId,volume)};
 playing=true;return Promise.resolve(audio.play()).catch(error=>{playing=false;throw error});
 }
 return {play,stop,get songId(){return activeId},get playing(){return playing&&!audio.paused},get startedAt(){return startedAt},get countingDown(){return countdown},get audio(){return audio}};
}
