import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../push-client.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('export ','');
function fixture({saveError=null,oldKey=null}={}){
 const order=[],key=Buffer.alloc(65,1),sub={options:{applicationServerKey:oldKey},toJSON:()=>({endpoint:'https://web.push.apple.com/device'}),unsubscribe:async()=>order.push('unsubscribe')};
 const registration={pushManager:{getSubscription:async()=>oldKey?sub:null,subscribe:async()=>{order.push('subscribe');return sub}}};
 const navigator={serviceWorker:{ready:Promise.resolve(registration)}},window={PushManager:{},Notification:{}},Notification={permission:'default',requestPermission:async()=>{order.push('permission');return 'granted'}};
 const db={auth:{getSession:async()=>{order.push('session');return {data:{session:{user:{id:'person'}}}}}},rpc:async(name,args)=>{order.push([name,args]);return {error:saveError}}};
 const client=new Function('pushPublicKey','navigator','window','Notification',source+';return {enablePush,disablePush,pushAvailability}')(key.toString('base64url'),navigator,window,Notification);
 return {client,db,order};
}
test('permission is requested in the tap gesture and enabling stores the device for the current house',async()=>{
 const {client,db,order}=fixture();await client.enablePush(db,'house');
 assert.deepEqual(order.slice(0,3),['permission','session','subscribe']);assert.equal(order[3][0],'register_mission_push');assert.equal(order[3][1].house_id,'house');
});
test('failed subscription storage is not reported as enabled',async()=>{
 const {client,db}=fixture({saveError:{message:'missing migration'}});await assert.rejects(client.enablePush(db,'house'),/Could not enable/);
});
test('enabling after a VAPID rotation replaces the obsolete subscription',async()=>{
 const {client,db,order}=fixture({oldKey:new Uint8Array(65).buffer});await client.enablePush(db,'house');assert.deepEqual(order.slice(0,4),['permission','session','unsubscribe','subscribe']);
});
test('iPhone setup explains the phone Share menu before asking for permission',()=>{
 const navigator={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'},window={matchMedia:()=>({matches:false})};
 const client=new Function('pushPublicKey','navigator','window',source+';return {pushAvailability}')(Buffer.alloc(65,1).toString('base64url'),navigator,window);
 assert.match(client.pushAvailability(),/Safari.*Share.*Add to Home Screen/);
});
