export const EVERY=5;
import {archivedCompletionCount} from './completion-history.js';
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
export function migrateRewards(state){
 state.settings ||= [];state.rewards ||= [];
 let policy=state.settings.find(x=>x.id==='reward-policy');
 if(!policy){const wins=new Set(state.wins.map(w=>w.id)).size+archivedCompletionCount(state);policy={id:'reward-policy',baselineWins:wins,baselineEarned:Math.max(Math.floor(wins/3),0,...state.rewards.map(r=>r.index||0))};state.settings.push(policy)}
 const progress=rewardProgress(state);
 for(const index of progress.available)state.rewards.push({id:'reward-'+index,index,prizeIndex:((index-1)*7)%prizes.length,edition:Math.floor((index-1)/prizes.length)+1,at:state.wins[0]?.at||new Date(0).toISOString()});
}
export function rewardProgress(state){
 const wins=new Set(state.wins.map(w=>w.id)).size+archivedCompletionCount(state),policy=state.settings?.find(x=>x.id==='reward-policy');
 const baseline=policy?.baselineWins||0,earned=(policy?.baselineEarned||0)+Math.floor(Math.max(0,wins-baseline)/EVERY);
 const claimed=new Set((state.rewards||[]).map(r=>r.id));
 const available=Array.from({length:earned},(_,i)=>i+1).filter(n=>!claimed.has('reward-'+n));
 return {wins,earned,available,remaining:EVERY-Math.max(0,wins-baseline)%EVERY};
}
export function revealReward(state){
 const index=rewardProgress(state).available[0];if(!index)return null;
 return {id:'reward-'+index,index,prizeIndex:((index-1)*7)%prizes.length,edition:Math.floor((index-1)/prizes.length)+1,at:new Date().toISOString()};
}
