import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {livingAnimationManifest} from '../living-animation.js';

const root=new URL('../',import.meta.url);
const sw=readFileSync(new URL('sw.js',root),'utf8');
const assets=JSON.parse(sw.match(/A=(\[[^;]+\])/)[1]);
const cached=new Set(assets.map(path=>path.replace(/^\.\//,'')));

test('release package caches every local runtime import and Living Room animation frame',()=>{
 assert.match(sw,/const C="mission-control-[^"]+"/);
 const imports=/\b(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g;
 for(const asset of assets.filter(path=>path.endsWith('.js'))){
  const source=readFileSync(new URL(asset,root),'utf8');
  for(const match of source.matchAll(imports)){
   const dependency=new URL(match[1].split('?')[0],new URL(asset,root));
   const relative=decodeURIComponent(dependency.pathname.slice(root.pathname.length));
   assert.ok(cached.has(relative),`${asset} imports uncached ${relative}`);
  }
 }
 for(const path of [...Object.values(livingAnimationManifest.stills),...Object.values(livingAnimationManifest.frames)]){
  assert.ok(cached.has(path),`animation frame is not cached: ${path}`);
 }
});
