// Validate the static app, then assemble the exact files Netlify should publish.
import {readFileSync,existsSync,rmSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=new URL('./',import.meta.url);
const dist=new URL('./dist/',root);
const sw=readFileSync(new URL('./sw.js',root),'utf8');
const assets=JSON.parse(sw.match(/A=(\[[^;]+\])/)[1]);
const deployFiles=[...new Set([...assets,'./sw.js','./supabase-sharing.sql'])];
for(const asset of deployFiles){
 if(asset==='./')continue;
 const source=new URL(asset,root);
 if(!existsSync(source))throw new Error(`Missing offline asset: ${asset}`);
 if(asset.endsWith('.js'))execFileSync(process.execPath,['--check',fileURLToPath(source)]);
}

rmSync(dist,{recursive:true,force:true});
mkdirSync(dist,{recursive:true});
for(const asset of deployFiles){
 if(asset==='./')continue;
 const source=new URL(asset,root),target=new URL(asset,dist);
 mkdirSync(dirname(fileURLToPath(target)),{recursive:true});
 copyFileSync(source,target);
}
console.log(`Netlify dist created: ${deployFiles.length-1} production files; JavaScript syntax valid.`);

if(process.env.VAPID_PUBLIC_KEY){
 const key=process.env.VAPID_PUBLIC_KEY.trim();
 if(!/^[A-Za-z0-9_-]{87}$/.test(key))throw new Error('VAPID_PUBLIC_KEY must be a public P-256 Web Push key.');
 writeFileSync(new URL('push-config.js',dist),`export const pushPublicKey=${JSON.stringify(key)};\n`);
}
