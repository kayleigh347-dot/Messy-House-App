// Turns a room's mess percentage into a short phrase. Mess runs 0 (spotless) to 100 (disaster);
// the meter reads the other way round, as cleanliness.
export function cleanPercent(messPercent){
 const mess=Math.max(0,Math.min(100,Number(messPercent)||0));
 return (1000-Math.round(mess*10))/10;
}
export function messPhrase(messPercent){
 const clean=cleanPercent(messPercent);
 if(clean>=100)return '✨Spotless✨';
 if(clean>=95)return 'Tidy-no-ish';
 if(clean>=90)return 'Tidy-ish!🥳';
 if(clean>=80)return 'Lived in';
 if(clean>=60)return 'slipping-ish';
 if(clean>=50)return 'whoah Halfway there';
 if(clean>=40)return 'Messy-ish';
 if(clean>=20)return 'Messy-no-ish';
 if(clean>=15)return 'chaos close';
 if(clean>=5)return 'Chaos-ish 👻';
 if(clean>0)return 'only way is up';
 return '';
}
export function isSparkling(messPercent){return cleanPercent(messPercent)>=95}

export function barState(messPercent,state){
 const clean=cleanPercent(messPercent);
 if(clean<25)return 'DISASTER';
 if(clean<50)return 'MESSY';
 return state==='SPOTLESS'?'SPOTLESS':'CLEAN';
}
