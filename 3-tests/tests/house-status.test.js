import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);

test('house hotspots show the live room mess state without replacing painted room names',()=>{
 const ui=readFileSync(new URL('v2-ui.js',root),'utf8');
 const css=readFileSync(new URL('stage-one.css',root),'utf8');
 assert.doesNotMatch(ui,/houseStatusIcons|✨|🌿|🧺|🚨/);
 assert.match(ui,/status=el\('span',m\.percent\+'%'\)/);
 assert.match(ui,/status\.className='house-status'/);
 assert.match(ui,/status\.setAttribute\('aria-hidden','true'\)/);
 assert.match(ui,/b\.dataset\.state=m\.state/);
 assert.match(css,/\.house-status\{/);
 assert.match(css,/\.house-status\{width:86%;max-width:110px/);
 assert.match(css,/\.house-hotspot\[data-state=MESSY\] \.house-status\{background:#f2c66d/);
 assert.match(css,/\.house-hotspot\[data-state=DISASTER\] \.house-status\{background:#d87968/);
});
