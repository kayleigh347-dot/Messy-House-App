import {validateAdaptiveRecord,adaptivePatch,initialAdaptiveRecord} from './adaptive-state.js';
import {validateRoomConfiguration,roomConfigurationChanges,initialRoomConfiguration} from './room-configuration.js';
export class AdaptiveError extends Error{constructor(kind){super(kind);this.kind=kind}}
export function createAdaptiveSync({getClient,getProject}){
 async function identity(){
  const client=getClient(),project=getProject();
  if(!client)throw new AdaptiveError('signed-out');
  const {data,error}=await client.auth.getSession();
  if(error)throw new AdaptiveError('offline');
  const userId=data?.session?.user?.id;
  if(!userId)throw new AdaptiveError('signed-out');
  return {client,project,userId,key:project+':'+userId};
 }
 async function request(name,args={},expected){
  const context=await identity();
  if(expected&&context.key!==expected.key)throw new AdaptiveError('account-changed');
  const {data,error}=await context.client.rpc(name,{...args,expected_user_id:context.userId});
  const current=await identity();
  if(context.key!==current.key||context.client!==current.client)throw new AdaptiveError('account-changed');
  if(error)throw new AdaptiveError(['40001','ADAPTIVE_CONFLICT'].includes(error.code)?'conflict':error.code==='PGRST202'?'unavailable':'offline');
  return {context,data};
 }
 const record=result=>({context:result.context,record:validateAdaptiveRecord(result.data,result.context.userId)});
 return {
  identity,
  async read(){const result=await request('adaptive_preferences_read');if(result.data===null)result.data=initialAdaptiveRecord(result.context.userId);return record(result)},
  async patch(context,patch,revision){if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid revision');return record(await request('adaptive_preferences_patch',{patch:adaptivePatch(patch),expected_revision:revision},context))},
  async claim(context){
   const result=await request('adaptive_intro_claim',{},context),claim=result.data;
   if(claim===null)return {context:result.context,claim:null};
   if(!claim||claim.userId!==context.userId||typeof claim.token!=='string'||!claim.token||!Number.isFinite(Date.parse(claim.expiresAt))||Date.parse(claim.expiresAt)<=Date.now())throw Error('Invalid introduction lease');
   return {context:result.context,claim:structuredClone(claim)};
  },
  async renew(context,token){const result=await request('adaptive_intro_renew',{claim_token:token},context);if(!result.data||result.data.userId!==context.userId||typeof result.data.expiresAt!=='string'||!Number.isFinite(Date.parse(result.data.expiresAt)))throw Error('Invalid introduction lease');return result.data},
  async acknowledge(context){return record(await request('adaptive_intro_ack',{},context))}
  ,async readRoomConfiguration(){const result=await request('adaptive_room_configuration_read');return {context:result.context,record:validateRoomConfiguration(result.data??initialRoomConfiguration(result.context.userId),result.context.userId)}}
  ,async patchRoomConfiguration(context,changes,revision){if(!Number.isSafeInteger(revision)||revision<0)throw Error('Invalid revision');const result=await request('adaptive_room_configuration_patch',{changes:roomConfigurationChanges(changes),expected_revision:revision},context);return {context:result.context,record:validateRoomConfiguration(result.data,result.context.userId)}}
 };
}
