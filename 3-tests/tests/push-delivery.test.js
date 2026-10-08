import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedPushEndpoint,deliverPushQueue} from '../server/push-delivery.js';
const job={id:1,attempts:1,subscription_id:'device',subscription:{endpoint:'https://web.push.apple.com/test'},payload:{body:'Bins'}};
test('push endpoints accept the phone providers and reject arbitrary hosts',()=>{
 for(const url of ['https://web.push.apple.com/x','https://fcm.googleapis.com/x','https://updates.push.services.mozilla.com/x'])assert.equal(allowedPushEndpoint(url),true);
 for(const url of ['http://web.push.apple.com/x','https://localhost/x','https://web.push.apple.com.evil.com/x','https://user@web.push.apple.com/x','https://web.push.apple.com:444/x'])assert.equal(allowedPushEndpoint(url),false);
});
async function run(send,jobs=[job]){const calls=[];const result=await deliverPushQueue({request:async(path,method,body)=>{calls.push({path,method,body});return path.startsWith('rpc/')?jobs:null},send,now:()=>new Date('2026-10-01T12:00:00Z')});return {calls,result}}
test('successful push is acknowledged only after sending',async()=>{
 let sent=0;const {calls,result}=await run(async(sub,payload)=>{sent++;assert.equal(JSON.parse(payload).body,'Bins')});
 assert.equal(sent,1);assert.deepEqual(result,{sent:1});assert.ok(calls[1].body.delivered_at);
});
test('expired subscriptions are removed and transient failures are retried',async()=>{
 const expired=await run(async()=>{throw {statusCode:410}});assert.equal(expired.calls[1].method,'DELETE');
 const retry=await run(async()=>{throw {statusCode:503}});assert.equal(retry.calls[1].body.failed,false);assert.equal(retry.calls[1].body.next_attempt,'2026-10-01T12:02:00.000Z');
 const exhausted=await run(async()=>{throw {statusCode:503}},[{...job,attempts:8}]);assert.equal(exhausted.calls[1].body.failed,true);
});
