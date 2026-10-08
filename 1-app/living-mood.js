// One profile drives the mapped creature's look, travel, choices and voice.
const profiles=Object.freeze({
 SPOTLESS:Object.freeze({expression:'SPOTLESS',speed:1,restWeight:1,inspectWeight:2,voice:'SPOTLESS'}),
 CLEAN:Object.freeze({expression:'CLEAN',speed:.9,restWeight:2,inspectWeight:2,voice:'CLEAN'}),
 MESSY:Object.freeze({expression:'MESSY',speed:.75,restWeight:3,inspectWeight:1,voice:'MESSY'}),
 DISASTER:Object.freeze({expression:'DISASTER',speed:.6,restWeight:4,inspectWeight:.5,voice:'DISASTER'})
});
export function livingMoodProfile(state){return profiles[state]||profiles.CLEAN}
