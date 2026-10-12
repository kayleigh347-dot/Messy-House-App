import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
test('all navigation consumers use one versioned module and fresh startup entry points',()=>{
 const root=new URL('../',import.meta.url),imports=[];
 for(const name of readdirSync(root).filter(n=>n.endsWith('.js'))){const source=readFileSync(new URL(name,root),'utf8');for(const match of source.matchAll(/from\s+['"](\.\/navigation\.js[^'"]*)['"]/g))imports.push({name,url:match[1]});}
 assert.deepEqual(imports.map(x=>x.name).sort(),['app.js','home-management.js','schedule-maker-ui.js','v2-ui.js']);assert.equal(new Set(imports.map(x=>x.url)).size,1);assert.match(imports[0].url,/\?v=.+/);
 const version=imports[0].url.split('?v=')[1],app=readFileSync(new URL('app.js',root),'utf8'),html=readFileSync(new URL('index.html',root),'utf8'),sw=readFileSync(new URL('sw.js',root),'utf8');
 for(const name of ['home-management.js','schedule-maker-ui.js','v2-ui.js'])assert.match(app,new RegExp(name.replaceAll('.','\\.')+'\\?v=[^\"\']+'),name+' must have a cache version');const release=html.match(/src="app\.js\?v=([^"]+)/)?.[1];assert.ok(release);assert.ok(app.includes(`sw.js?v=${release}`));assert.ok(sw.includes(`mission-control-${release}`));
});
