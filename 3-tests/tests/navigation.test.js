import test from 'node:test';
import assert from 'node:assert/strict';
import {navigate,initNavigation} from '../navigation.js';
test('Back restores page and room without exiting; reload restores the current route',()=>{
 const previous={history:globalThis.history,window:globalThis.window,document:globalThis.document};
 const entries=[null];let index=0,pop,shown;
 globalThis.history={get state(){return entries[index]},replaceState(r){entries[index]=r},pushState(r){entries.splice(++index);entries.push(r)}};
 globalThis.window={addEventListener(type,fn){if(type==='popstate')pop=fn}};
 globalThis.document={querySelectorAll(){return []},querySelector(){return null}};
 try{initNavigation(r=>shown=r);navigate('house','room-bathroom');navigate('now');
  pop({state:entries[--index]});assert.equal(shown.room,'room-bathroom');
  pop({state:entries[--index]});assert.equal(shown.page,'house');assert.equal(shown.room,null);
  navigate('side');initNavigation(r=>shown=r);assert.equal(shown.page,'side');
 }finally{Object.assign(globalThis,previous)}
});
