import test from 'node:test';
import assert from 'node:assert/strict';
import {navigate,initNavigation,setBackHandler} from '../navigation.js';
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

test('wizard Back intercepts a page exit; ordinary Back still renders its route',()=>{
 let pop,route,calls=0;globalThis.window={addEventListener:(name,fn)=>pop=fn};globalThis.document={body:{dataset:{view:'scheduleMaker'}},querySelectorAll:()=>[]};globalThis.history={state:{mc:true,page:'scheduleMaker',room:null},pushState:r=>route=r};
 initNavigation(r=>route=r);setBackHandler(()=>{calls++;return true});pop({state:{mc:true,page:'house'}});assert.equal(calls,1);assert.equal(route.page,'scheduleMaker');
 setBackHandler(()=>false);pop({state:{mc:true,page:'calendar'}});assert.equal(route.page,'calendar');setBackHandler(null);for(const key of ['window','document','history'])delete globalThis[key];
});
