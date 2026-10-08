export function allowedPushEndpoint(endpoint){
 try{const url=new URL(endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
 /^(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com)$/.test(url.hostname)}catch{return false}
}
export async function deliverPushQueue({request,send,now=()=>new Date()}){
 const jobs=await request('rpc/claim_mission_push','POST',{});
 const results=await Promise.all(jobs.map(async job=>{
  let patch;
  try{
   if(!allowedPushEndpoint(job.subscription.endpoint))throw Object.assign(new Error('Unsupported endpoint'),{statusCode:400});
   await send(job.subscription,JSON.stringify(job.payload));
   patch={delivered_at:now().toISOString()};
  }catch(error){
   if([404,410].includes(error.statusCode)){
    await request(`mission_push_subscriptions?id=eq.${job.subscription_id}`,'DELETE');return 'expired';
   }
   const permanent=error.statusCode===400||job.attempts>=8;
   patch={failed:permanent,next_attempt:new Date(+now()+Math.min(60,2**job.attempts)*60000).toISOString()};
  }
  await request(`mission_push_queue?id=eq.${job.id}`,'PATCH',patch);
  return patch.delivered_at?'sent':patch.failed?'failed':'retry';
 }));
 return results.reduce((counts,result)=>(counts[result]=(counts[result]||0)+1,counts),{});
}
