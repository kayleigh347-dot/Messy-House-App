import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const names=['cats','entrance','hall','master','penny','print','craft','kitchen','bathroom','living'];

test('every initial room guardian has a compact offline sprite strip',()=>{
 for(const name of names){
  const url=new URL(`assets/sprites/${name}-states.webp`,root);
  assert.equal(existsSync(url),true,`${name} sprite is missing`);
  assert.ok(statSync(fileURLToPath(url)).size<750_000,`${name} sprite is too large for mobile use`);
 }
});

test('four Mess Meter states select distinct sprite frames and motion',()=>{
 const css=readFileSync(new URL('styles.css',root),'utf8');
 assert.match(css,/data-state=CLEAN[^}]+background-position:33\.333%/);
 assert.match(css,/data-state=MESSY[^}]+background-position:66\.667%/);
 assert.match(css,/data-state=DISASTER[^}]+background-position:100%/);
 for(const animation of ['guardian-float','guardian-breathe','guardian-fidget','guardian-bothered'])assert.match(css,new RegExp(`@keyframes ${animation}`));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('all ten initial room ids map to sprites',()=>{
 const ui=readFileSync(new URL('v2-ui.js',root),'utf8');
 for(const room of ['cats','entrance','hall','master','penny','print','craft','kitchen','bathroom','living'])assert.match(ui,new RegExp(`'room-${room}'`));
});
