import test from 'node:test';
import assert from 'node:assert/strict';
import {livingMoodProfile} from '../living-mood.js';
import {createBehaviour} from '../creature-behaviour.js';

test('the four canonical moods share expression, pace, decision weights and voice identity',()=>{
 const states=['SPOTLESS','CLEAN','MESSY','DISASTER'];
 assert.deepEqual(states.map(s=>livingMoodProfile(s).speed),[1,.9,.75,.6]);
 for(const state of states){const profile=livingMoodProfile(state);assert.equal(profile.expression,state);assert.equal(profile.voice,state)}
 assert.ok(livingMoodProfile('DISASTER').restWeight>livingMoodProfile('SPOTLESS').restWeight);
 const objects=[{id:'plant'}],rests=[{id:'sofa'}];
 let roll=.4;const behavior=createBehaviour({now:()=>0,random:()=>roll});
 assert.equal(behavior.choose(objects,rests,livingMoodProfile('SPOTLESS')).kind,'object');
 assert.equal(behavior.choose(objects,rests,livingMoodProfile('DISASTER')).kind,'rest');
});
