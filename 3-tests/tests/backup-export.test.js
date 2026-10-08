import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalize} from '../v2-state.js';
test('actual export handler serializes all V2 state into a downloadable JSON backup',async()=>{
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const snippet=source.slice(source.indexOf('$("#export").onclick='),source.indexOf('$("#import").onchange='));
 const control={},a={click(){this.clicked=true}},st=normalize({tasks:[{id:'t',text:'Keep',created:'2026-01-01',order:12,allowanceDays:7,recurrence:{kind:'days',every:2},messImpact:'big'}],side:[],wins:[]});
 st.templates.push({id:'tpl',text:'Again'});let exported;
 new Function('$','URL','Blob','st','document','setTimeout',snippet)(()=>control,{createObjectURL(blob){exported=blob;return 'blob:test'},revokeObjectURL(){}},Blob,st,{createElement(){return a}},()=>{});
 control.onclick();assert.equal(a.clicked,true);assert.equal(a.download,'mission-control-backup.json');assert.equal(exported.type,'application/json');assert.deepEqual(JSON.parse(await exported.text()),st);
});
