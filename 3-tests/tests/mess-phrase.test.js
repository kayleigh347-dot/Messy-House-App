import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {messPhrase,cleanPercent,isSparkling,barState} from '../mess-phrase.js';

const root=new URL('../',import.meta.url);

test('mess percent converts to clean percent',()=>{
 assert.equal(cleanPercent(0),100);
 assert.equal(cleanPercent(100),0);
 assert.equal(cleanPercent(29.6),70.4);
 assert.equal(cleanPercent(-5),100);
 assert.equal(cleanPercent(150),0);
 assert.equal(cleanPercent(undefined),100);
});

test('phrases follow the clean percentage bands',()=>{
 const at=clean=>messPhrase(100-clean);
 const bands=[[0,''],[0.1,'only way is up'],[4.9,'only way is up'],[5,'Chaos-ish 👻'],[14.9,'Chaos-ish 👻'],[15,'chaos close'],[19.9,'chaos close'],[20,'Messy-no-ish'],[39.9,'Messy-no-ish'],[40,'Messy-ish'],[49.9,'Messy-ish'],[50,'whoah Halfway there'],[59.9,'whoah Halfway there'],[60,'slipping-ish'],[79.9,'slipping-ish'],[80,'Lived in'],[89.9,'Lived in'],[90,'Tidy-ish!🥳'],[94.9,'Tidy-ish!🥳'],[95,'Tidy-no-ish'],[99.9,'Tidy-no-ish'],[100,'✨Spotless✨']];
 for(const [clean,phrase] of bands)assert.equal(at(clean),phrase,`${clean}% clean`);
});

test('every phrase is short enough for the small house-map pill',()=>{
 for(let mess=0;mess<=100;mess+=0.1)assert.ok((messPhrase(mess)??'').length<=20,messPhrase(mess));
});

test('sparkle starts at 95% clean',()=>{
 assert.equal(isSparkling(5.1),false);
 assert.equal(isSparkling(5),true);
 assert.equal(isSparkling(0),true);
});

test('the UI shows phrases, not mess percentages, and the bar fills as the room gets cleaner',()=>{
 const ui=readFileSync(new URL('v2-ui.js',root),'utf8');
 assert.doesNotMatch(ui,/Mess level/);
 assert.match(ui,/#roomMessBar'\)\.value=cleanPercent\(mess\.percent\)/);
 assert.match(ui,/function messLabel\(m\)\{return messPhrase\(m\.percent\)\}/);
});

test('orange bars switch to blue at 50% cleanliness without changing extreme states',()=>{
 assert.equal(barState(50.1,'MESSY'),'MESSY');
 assert.equal(barState(50,'MESSY'),'CLEAN');
 assert.equal(barState(40,'MESSY'),'CLEAN');
 assert.equal(barState(100,'DISASTER'),'DISASTER');
 assert.equal(barState(0,'SPOTLESS'),'SPOTLESS');
});

test('bar colours change at 25% and 50% cleanliness independently of artwork state',()=>{
 for(const [clean,colour] of [[0,'DISASTER'],[24,'DISASTER'],[24.9,'DISASTER'],[25,'MESSY'],[49.9,'MESSY'],[50,'CLEAN']]){
  assert.equal(barState(100-clean,'MESSY'),colour,`${clean}% clean`);
 }
});
