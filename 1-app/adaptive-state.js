export const FLOW_DESCRIPTION='Get cleaning recommendations without following a fixed schedule. Your calendar still updates automatically as you complete tasks.';
export const FLOW_INTRO_TITLE='Welcome to Go With the Flow';
export const FLOW_INTRO_PARAGRAPHS=[
 'No rigid schedules. No falling behind.',
 'Mission Control remembers what needs doing and recommends what deserves your attention.',
 'Choose a room whenever you feel ready, or pick your own tasks.',
 'Your calendar will keep adapting as you complete things, even if you never follow its recommendations.'
];
export const FLOW_INTRO_CONFIRM="Let's Go With the Flow!";
export const adaptiveCacheKey=(project,userId)=>'mc-adaptive-personal-v1:'+encodeURIComponent(project)+':'+encodeURIComponent(userId);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function validateAdaptiveRecord(value,userId){
 if(!object(value)||value.userId!==userId||!['routine','flow'].includes(value.mode)||!Number.isSafeInteger(value.revision)||value.revision<0||!object(value.recommendationPreferences)||!(value.introAcknowledgedAt===null||typeof value.introAcknowledgedAt==='string'&&Number.isFinite(Date.parse(value.introAcknowledgedAt))))throw Error('Invalid personal preferences');
 return structuredClone(value);
}
export function adaptivePatch(value){
 if(!object(value)||!Object.keys(value).length||Object.keys(value).some(k=>!['mode','recommendationPreferences'].includes(k)))throw Error('Invalid preference change');
 if('mode'in value&&!['routine','flow'].includes(value.mode)||'recommendationPreferences'in value&&!object(value.recommendationPreferences))throw Error('Invalid preference change');
 return structuredClone(value);
}
export const initialAdaptiveRecord=userId=>({userId,mode:'routine',recommendationPreferences:{},introAcknowledgedAt:null,revision:0});
