import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../focus-timer.js',import.meta.url),'utf8');
function setup(fetchReply=async()=>({type:'opaque',status:0,ok:false})){
 const fields=new Map(),saved=new Map(),created=[];let request,submitted;
 const node=()=>({value:'',children:[],reportValidity:()=>true,append(...children){this.children.push(...children)},remove(){},submit(){submitted=this}});
 const panel=node();panel.querySelector=selector=>{if(!fields.has(selector))fields.set(selector,node());return fields.get(selector)};
 const context={document:{body:node(),createElement(tag){const element=created.length===0?panel:node();element.tag=tag;created.push(element);return element}},navigator:{userAgent:'Android'},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},URLSearchParams,stopPreview(){},window:{},fetch:async(url,options)=>{request={url,options};return fetchReply()}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function addPhoneTimer(')),context);
 context.addPhoneTimer({}, {children:[{}],insertBefore(){},elements:{minutes:{value:'5',reportValidity:()=>true}}});
 fields.get('[data-secret]').value=' dummy-secret ';fields.get('[data-account]').value=' nobody@example.invalid ';fields.get('[data-device]').value=' My phone ';
 return {fields,saved,created,request:()=>request,submitted:()=>submitted,status:()=>fields.get('[data-phone-status]').textContent};
}
test('Android request uses Automate exact content type and seconds without claiming delivery',async()=>{
 const app=setup();await app.fields.get('[data-phone-start]').onclick();const {url,options}=app.request();
 assert.equal(url,'https://llamalab.com/automate/cloud/message');assert.equal(new Request(url,options).headers.get('content-type'),'application/x-www-form-urlencoded');
 assert.equal(options.mode,'no-cors');assert.equal(options.body.get('payload'),'300');assert.equal(options.body.get('to'),'nobody@example.invalid');assert.equal(options.body.get('device'),'My phone');assert.equal(options.body.get('secret'),'dummy-secret');
 assert.match(app.status(),/delivery cannot be confirmed/);assert.doesNotMatch(app.status(),/Request sent\./);assert.equal(app.fields.get('[data-phone-start]').disabled,false);
});
test('Save connection persists trimmed settings without sending a timer',()=>{
 const app=setup();app.created.find(n=>n.textContent==='Save connection').onclick();
 assert.equal(app.saved.get('mc-phone-timer-automate-secret'),'dummy-secret');assert.equal(app.saved.get('mc-phone-timer-automate-account'),'nobody@example.invalid');assert.equal(app.saved.get('mc-phone-timer-automate-device'),'My phone');assert.equal(app.request(),undefined);assert.match(app.status(),/Connection saved/);
});
test('One-minute test opens a form response with the same destination and 60 seconds',()=>{
 const app=setup();app.created.find(n=>n.textContent==='Check connection response').onclick();const form=app.submitted();
 assert.equal(form.action,'https://llamalab.com/automate/cloud/message');assert.equal(form.method,'POST');assert.equal(form.enctype,'application/x-www-form-urlencoded');assert.equal(form.target,'_blank');assert.equal(form.rel,'noopener noreferrer');
 assert.deepEqual(Object.fromEntries(form.children.map(n=>[n.name,n.value])),{secret:'dummy-secret',to:'nobody@example.invalid',device:'My phone',priority:'normal',payload:'60'});
 assert.match(app.status(),/check it for an error/);
});
test('Invalid settings prevent requests and network failures restore the button',async()=>{
 const missing=setup();missing.fields.get('[data-secret]').value=' ';await missing.fields.get('[data-phone-start]').onclick();assert.equal(missing.request(),undefined);assert.equal(missing.fields.get('details').open,true);
 const failed=setup(async()=>{throw new Error('offline')});await failed.fields.get('[data-phone-start]').onclick();assert.match(failed.status(),/Could not send/);assert.equal(failed.fields.get('[data-phone-start]').disabled,false);
});

test('One-minute test sends 60 seconds while staying in the app',async()=>{
 const app=setup();await app.created.find(n=>n.textContent==='Test 1-minute timer').onclick();assert.equal(app.request().options.body.get('payload'),'60');assert.equal(app.submitted(),undefined);assert.match(app.status(),/Check your phone Clock/);
});
