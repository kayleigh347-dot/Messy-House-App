export const EVERY=5;
import {completionPoints} from './completion-history.js?v=release-20261010-v3';
export const prizes=[
 {name:'Mooncat',icon:'🐈‍⬛',colour:'lavender',title:'A tiny guardian of unfinished things',treat:'The dust has filed a formal complaint. Excellent work.'},
 {name:'Pocket Dragon',icon:'🐉',colour:'peach',title:'Collector of small victories',treat:'A tiny dragon, an enormous fan of your competence.'},
 {name:'Space Otter',icon:'🦦',colour:'aqua',title:'Floating along at your pace',treat:'You did the thing. The otter is taking notes.'},
 {name:'Disco Mushroom',icon:'🍄',colour:'rose',title:'A very small celebration specialist',treat:'One less chore. One more reason to be insufferably pleased.'},
 {name:'Cloud Fox',icon:'🦊',colour:'peach',title:'Expert in finding another way',treat:'The fox inspected your work and found nothing to criticise. Outrageous.'},
 {name:'Velvet Moth',icon:'🦋',colour:'lavender',title:'Drawn to the little bright spots',treat:'Drawn to bright ideas. Apparently that includes you finishing things.'},
 {name:'Cosmic Capybara',icon:'🪐',colour:'aqua',title:'Calm looks good on you',treat:'Calm, capable, and suspiciously good at this.'},
 {name:'Starlight Frog',icon:'🐸',colour:'aqua',title:'One hop is still a hop',treat:'Another job crossed off. Ribbiting performance.'},
 {name:'Golden Goose',icon:'🪿',colour:'peach',title:'Officially impressed. Quietly honking.',treat:'The goose committee approves. Loudly.'},
 {name:'Rainbow Jellyfish',icon:'🪼',colour:'rose',title:'Making progress in its own direction',treat:'No spine, still impressed by your backbone.'},
 {name:'Craft Goblin',icon:'🧶',colour:'lavender',title:'Keeper of the good wool',treat:'The goblin has reluctantly admitted you are in charge.'},
 {name:'Sleepy Star',icon:'⭐',colour:'peach',title:'Rest is part of the story',treat:'A small victory with an unnecessarily large fan club.'}
];

prizes.push(...[("Amber Badger", "🦡"), ("Tea Hedgehog", "🦔"), ("Moss Turtle", "🐢"), ("Garden Snail", "🐌"), ("Pearl Seal", "🦭"), ("Sunflower Bee", "🐝"), ("Fern Deer", "🦌"), ("Cocoa Bear", "🐻"), ("Willow Owl", "🦉"), ("Peach Penguin", "🐧"), ("Silver Wolf", "🐺"), ("Snow Rabbit", "🐇"), ("Bamboo Panda", "🐼"), ("Coral Crab", "🦀"), ("Copper Lobster", "🦞"), ("River Dolphin", "🐬"), ("Ocean Whale", "🐋"), ("Clover Ladybird", "🐞"), ("Firefly Lantern", "🏮"), ("Secret Garden", "🪴"), ("Lucky Bonsai", "🌳"), ("Crystal Castle", "🏰"), ("Moon Telescope", "🔭"), ("Tiny Sailboat", "⛵"), ("Starlight Train", "🚂"), ("Treasure Chest", "💎"), ("Golden Crown", "👑"), ("Magic Paintbrush", "🎨"), ("Velvet Violin", "🎻"), ("Pocket Piano", "🎹"), ("Golden Trumpet", "🎺"), ("Warm Guitar", "🎸"), ("Library Key", "🗝️"), ("Wishing Well", "⛲"), ("Rainbow Kite", "🪁"), ("Paper Crane", "🕊️"), ("Honey Pot", "🍯"), ("Berry Basket", "🧺"), ("Cloud Umbrella", "☂️"), ("Dream Balloon", "🎈"), ("Jade Teapot", "🫖"), ("Seashell Palace", "🐚"), ("Aurora Compass", "🧭"), ("Wildflower Crown", "🌼"), ("Rose Quartz", "🌹"), ("Lilac Unicorn", "🦄"), ("Night Peacock", "🦚"), ("Maple Squirrel", "🐿️")].map(([name,icon],i)=>({name,icon,colour:['lavender','peach','aqua','rose'][i%4],title:'A little treasure for your steady progress',treat:'Another little piece of your house cared for.'})));
export const taskRewardKey=text=>String(text||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
export const milestoneTargets=[5,15,30,50,80,120,175,250,350,500];
export function rewardCounts(state){
 const room=new Map(),task=new Map(),seen=new Set();let wins=0;
 for(const win of state.wins||[]){if(seen.has(win.id)||!completionPoints(win))continue;seen.add(win.id);wins++;if(win.roomId)room.set(win.roomId,(room.get(win.roomId)||0)+1);const key=taskRewardKey(win.text);if(key)task.set(key,(task.get(key)||0)+1)}
 for(const row of state.completionArchive||[]){wins+=Number(row.count)||0;room.set(row.roomId,(room.get(row.roomId)||0)+(Number(row.count)||0));for(const [key,count] of Object.entries(row.taskCounts||{}))task.set(key,(task.get(key)||0)+count)}
 return {wins,room,task};
}
function policyFor(state){return state.settings?.find(x=>x.id==='reward-policy')}
export function rewardProgress(state){
 const counts=rewardCounts(state),policy=policyFor(state),baseline=policy?.baselineWins||0,base=policy?.baselineEarned||0;
 let left=Math.max(0,counts.wins-baseline),level=0,cost=EVERY;
 while(left>=cost){left-=cost;level++;cost=EVERY+level*5}
 const goals=[];
 for(let i=1;i<=base+level;i++)goals.push({id:'reward-'+i,label:i<=base?'Earlier task milestone':`Overall progress · level ${i-base}`});
 const challenges=[];
 for(const [kind,values] of [['room',counts.room],['task',counts.task]])for(const [key,count] of values){
  const label=kind==='room'?(state.rooms||[]).find(r=>r.id===key)?.name||'Room':key;
  for(const target of milestoneTargets)if(count>=target)goals.push({id:`milestone:${kind}:${encodeURIComponent(key)}:${target}`,label:kind==='room'?`${target} ${label} tasks completed`:`${label} completed ${target} times`});
  const next=milestoneTargets.find(n=>n>count);if(next)challenges.push({label:kind==='room'?`${label} tasks`:`${label}`,count,target:next,remaining:next-count});
 }
 const claimed=new Set((state.rewards||[]).map(r=>r.id));
 return {wins:counts.wins,earned:goals.length,available:goals.filter(g=>!claimed.has(g.id)).map(g=>g.id),goals,remaining:cost-left,challenges:challenges.sort((a,b)=>a.remaining-b.remaining).slice(0,6)};
}
function makeReward(state,goal){
 const used=new Set((state.rewards||[]).map(r=>r.prizeIndex)),unused=prizes.map((_,i)=>i).filter(i=>!used.has(i)),index=Math.max(0,...(state.rewards||[]).map(r=>r.index||0))+1;
 const prizeIndex=unused[0]??((index-1)%prizes.length);
 return {id:goal.id,index,prizeIndex,edition:1+(state.rewards||[]).filter(r=>r.prizeIndex===prizeIndex).length,achievement:goal.label,at:new Date().toISOString()};
}
export function migrateRewards(state){
 state.settings ||= [];state.rewards ||= [];
 if(!policyFor(state))state.settings.push({id:'reward-policy',baselineWins:rewardCounts(state).wins,baselineEarned:Math.max(0,...state.rewards.filter(r=>r.id.startsWith('reward-')).map(r=>Number(r.id.slice(7))||0))});
 const progress=rewardProgress(state);
 for(const goal of progress.goals)if(progress.available.includes(goal.id))state.rewards.push(makeReward(state,goal));
}
export function revealReward(state){const progress=rewardProgress(state),goal=progress.goals.find(g=>g.id===progress.available[0]);return goal?makeReward(state,goal):null}
