-- Additive private Go With the Flow storage. Install only with explicit approval;
-- never run live as a test. Requires existing supabase-sharing.sql.
-- No existing board, reward, schedule, save RPC or member data is modified.
begin;
create table if not exists public.mission_adaptive_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 mode text not null default 'routine' check(mode in ('routine','flow')),
 recommendation_preferences jsonb not null default '{}' check(jsonb_typeof(recommendation_preferences)='object'),
 intro_acknowledged_at timestamptz,
 revision bigint not null default 0 check(revision>=0),
 intro_claim_token uuid,
 intro_claim_expires_at timestamptz
);
create table if not exists public.mission_adaptive_rooms (
 user_id uuid primary key references auth.users(id) on delete cascade,
 configuration jsonb not null default '{"setups":[],"drafts":[],"areas":[],"assignments":[],"routineVariations":[],"routineVisibility":[]}' check(jsonb_typeof(configuration)='object'),
 revision bigint not null default 0 check(revision>=0)
);
alter table public.mission_adaptive_preferences enable row level security;
alter table public.mission_adaptive_rooms enable row level security;
revoke all on public.mission_adaptive_preferences,public.mission_adaptive_rooms from public,anon,authenticated;
grant select on public.mission_adaptive_preferences,public.mission_adaptive_rooms to authenticated;
drop policy if exists "Own adaptive preferences" on public.mission_adaptive_preferences;
create policy "Own adaptive preferences" on public.mission_adaptive_preferences for select to authenticated using(user_id=auth.uid());
drop policy if exists "Own adaptive rooms" on public.mission_adaptive_rooms;
create policy "Own adaptive rooms" on public.mission_adaptive_rooms for select to authenticated using(user_id=auth.uid());

create or replace function public.adaptive_assert_user(expected_user_id uuid)
returns void language plpgsql set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from expected_user_id then raise exception 'Personal settings access denied'; end if;
end;
$$;
create or replace function public.adaptive_preferences_json(person uuid)
returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('userId',user_id,'mode',mode,'recommendationPreferences',recommendation_preferences,'introAcknowledgedAt',intro_acknowledged_at,'revision',revision)
 from public.mission_adaptive_preferences where user_id=person;
$$;
create or replace function public.adaptive_preferences_read(expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.adaptive_assert_user(expected_user_id);
 insert into public.mission_adaptive_preferences(user_id) values(auth.uid()) on conflict do nothing;
 return public.adaptive_preferences_json(auth.uid());
end;
$$;
create or replace function public.adaptive_preferences_patch(expected_user_id uuid,patch jsonb,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare current_revision bigint;
begin
 perform public.adaptive_assert_user(expected_user_id);
 if jsonb_typeof(patch) is distinct from 'object' or patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(patch) as keys(key) where key not in ('mode','recommendationPreferences')) then raise exception 'Invalid personal preference patch'; end if;
 if patch ? 'mode' and (jsonb_typeof(patch->'mode') is distinct from 'string' or patch->>'mode' not in ('routine','flow')) then raise exception 'Invalid mode'; end if;
 if patch ? 'recommendationPreferences' and jsonb_typeof(patch->'recommendationPreferences') is distinct from 'object' then raise exception 'Invalid recommendation preferences'; end if;
 insert into public.mission_adaptive_preferences(user_id) values(auth.uid()) on conflict do nothing;
 select revision into current_revision from public.mission_adaptive_preferences where user_id=auth.uid() for update;
 if expected_revision is null or current_revision<>expected_revision then raise exception using errcode='40001',message='Adaptive revision conflict'; end if;
 update public.mission_adaptive_preferences set mode=case when patch ? 'mode' then patch->>'mode' else mode end,
 recommendation_preferences=case when patch ? 'recommendationPreferences' then patch->'recommendationPreferences' else recommendation_preferences end,revision=revision+1 where user_id=auth.uid();
 return public.adaptive_preferences_json(auth.uid());
end;
$$;
create or replace function public.adaptive_intro_claim(expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row public.mission_adaptive_preferences%rowtype; token uuid:=gen_random_uuid(); expires timestamptz:=now()+interval '120 seconds';
begin
 perform public.adaptive_assert_user(expected_user_id);
 insert into public.mission_adaptive_preferences(user_id) values(auth.uid()) on conflict do nothing;
 select * into row from public.mission_adaptive_preferences where user_id=auth.uid() for update;
 if row.intro_acknowledged_at is not null or row.mode<>'flow' or row.intro_claim_expires_at>now() then return null; end if;
 update public.mission_adaptive_preferences set intro_claim_token=token,intro_claim_expires_at=expires where user_id=auth.uid();
 return jsonb_build_object('userId',auth.uid(),'token',token,'expiresAt',expires);
end;
$$;
create or replace function public.adaptive_intro_renew(expected_user_id uuid,claim_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare expires timestamptz:=now()+interval '120 seconds'; ack timestamptz;
begin
 perform public.adaptive_assert_user(expected_user_id);
 update public.mission_adaptive_preferences set intro_claim_expires_at=expires where user_id=auth.uid() and intro_claim_token=claim_token and intro_claim_expires_at>now() and intro_acknowledged_at is null returning intro_acknowledged_at into ack;
 if not found then raise exception 'Introduction lease expired'; end if;
 return jsonb_build_object('userId',auth.uid(),'expiresAt',expires,'introAcknowledgedAt',ack);
end;
$$;
create or replace function public.adaptive_intro_ack(expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.adaptive_assert_user(expected_user_id);
 insert into public.mission_adaptive_preferences(user_id) values(auth.uid()) on conflict do nothing;
 update public.mission_adaptive_preferences set intro_acknowledged_at=coalesce(intro_acknowledged_at,now()),intro_claim_token=null,intro_claim_expires_at=null,revision=revision+1 where user_id=auth.uid();
 return public.adaptive_preferences_json(auth.uid());
end;
$$;

create or replace function public.adaptive_room_json(person uuid)
returns jsonb language sql stable set search_path='' as $$
 select configuration||jsonb_build_object('userId',user_id,'revision',revision) from public.mission_adaptive_rooms where user_id=person;
$$;
create or replace function public.adaptive_room_configuration_read(expected_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.adaptive_assert_user(expected_user_id);
 insert into public.mission_adaptive_rooms(user_id) values(auth.uid()) on conflict do nothing;
 return public.adaptive_room_json(auth.uid());
end;
$$;
create or replace function public.adaptive_room_configuration_patch(expected_user_id uuid,changes jsonb,expected_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb; current_revision bigint; change jsonb; collection text; item_id text; values_patch jsonb; old jsonb; merged jsonb; items jsonb; allowed text[]; checked jsonb; field_name text;
begin
 perform public.adaptive_assert_user(expected_user_id);
 if jsonb_typeof(changes) is distinct from 'array' or jsonb_array_length(changes)=0 then raise exception 'Invalid room changes'; end if;
 insert into public.mission_adaptive_rooms(user_id) values(auth.uid()) on conflict do nothing;
 select configuration,revision into payload,current_revision from public.mission_adaptive_rooms where user_id=auth.uid() for update;
 if expected_revision is null or current_revision<>expected_revision then raise exception using errcode='40001',message='Adaptive revision conflict'; end if;
 if exists(select 1 from jsonb_array_elements(changes) as entries(value) group by value->>'collection',value->>'id' having count(*)>1) then raise exception 'Duplicate room changes'; end if;
 for change in select value from jsonb_array_elements(changes) loop
  collection:=change->>'collection';item_id:=change->>'id';values_patch:=change->'values';
  if jsonb_typeof(change) is distinct from 'object' or item_id is null or item_id='' or jsonb_typeof(values_patch) is distinct from 'object' or values_patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(change) as keys(key) where key not in ('collection','id','values')) then raise exception 'Invalid room patch'; end if;
  allowed:=case collection
   when 'setups' then array['houseId','roomId','name','draft','deletedAt']
   when 'drafts' then array['houseId','roomId','name','draft','setupId','updatedAt','deletedAt']
   when 'areas' then array['houseId','roomId','name','sortIndex','deletedAt']
   when 'assignments' then array['houseId','roomId','taskId','areaId']
   when 'routineVariations' then array['houseId','roomId','name','steps','baseRoutineId','deletedAt']
   when 'routineVisibility' then array['houseId','roomId','routineId','hidden'] else null end;
  if allowed is null or exists(select 1 from jsonb_object_keys(values_patch) as keys(key) where not(key=any(allowed))) then raise exception 'Unknown room field'; end if;
  select value into old from jsonb_array_elements(payload->collection) where value->>'id'=item_id;
  merged:=coalesce(old,'{}'::jsonb)||values_patch||jsonb_build_object('id',item_id);
  if nullif(merged->>'roomId','') is null or nullif(merged->>'houseId','') is null or not public.can_use_mission_house((merged->>'houseId')::uuid) then raise exception 'House access denied'; end if;
  for field_name in select unnest(array['deletedAt','updatedAt']) loop
   if merged ? field_name and merged->field_name<>'null'::jsonb then perform (merged->>field_name)::timestamptz; end if;
  end loop;
  if collection in ('setups','drafts','areas','routineVariations') and (jsonb_typeof(merged->'name') is distinct from 'string' or length(btrim(merged->>'name'))=0 or length(merged->>'name')>100) then raise exception 'Invalid name'; end if;
  if collection in ('setups','drafts') and (jsonb_typeof(merged->'draft') is distinct from 'object' or merged->'draft'->>'roomId' is distinct from merged->>'roomId' or merged->'draft'->>'version'<>'1' or jsonb_typeof(merged->'draft'->'tasks') is distinct from 'array') then raise exception 'Invalid room setup'; end if;
  if collection='areas' and (jsonb_typeof(merged->'sortIndex') is distinct from 'number' or (merged->>'sortIndex')::numeric<0 or (merged->>'sortIndex')::numeric<>trunc((merged->>'sortIndex')::numeric)) then raise exception 'Invalid area order'; end if;
  if collection='assignments' and (nullif(merged->>'taskId','') is null or not(merged ? 'areaId') or jsonb_typeof(merged->'areaId') not in ('null','string')) then raise exception 'Invalid assignment'; end if;
  if collection='routineVisibility' and (nullif(merged->>'routineId','') is null or jsonb_typeof(merged->'hidden') is distinct from 'boolean') then raise exception 'Invalid visibility'; end if;
  if collection='routineVariations' then
   if nullif(merged->>'baseRoutineId','') is null or jsonb_typeof(merged->'steps') is distinct from 'array' or jsonb_array_length(merged->'steps')=0 then raise exception 'Invalid routine'; end if;
   for checked in select value from jsonb_array_elements(merged->'steps') loop
    if nullif(checked->>'id','') is null or nullif(btrim(checked->>'label'),'') is null or jsonb_typeof(checked->'pickup') is distinct from 'boolean' or jsonb_typeof(checked->'important') is distinct from 'boolean' or jsonb_typeof(checked->'optional') is distinct from 'boolean' or (checked->>'pickup')::boolean and nullif(btrim(checked->>'followUpText'),'') is null then raise exception 'Invalid routine step'; end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(merged->'steps') as steps(value) group by value->>'id' having count(*)>1) then raise exception 'Duplicate routine steps'; end if;
  end if;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into items from jsonb_array_elements(payload->collection) where value->>'id'<>item_id;
  payload:=jsonb_set(payload,array[collection],items||jsonb_build_array(merged));
 end loop;
 if exists(select 1 from jsonb_array_elements(payload->'assignments') as entries(value) group by value->>'houseId',value->>'roomId',value->>'taskId' having count(*)>1) then raise exception 'Duplicate area assignment'; end if;
 for checked in select value from jsonb_array_elements(payload->'assignments') loop
  if checked->>'areaId' is not null and not exists(select 1 from jsonb_array_elements(payload->'areas') as areas(value) where value->>'id'=checked->>'areaId' and value->>'houseId'=checked->>'houseId' and value->>'roomId'=checked->>'roomId' and value->>'deletedAt' is null) then raise exception 'Unknown area'; end if;
 end loop;
 update public.mission_adaptive_rooms set configuration=payload,revision=revision+1 where user_id=auth.uid();
 return public.adaptive_room_json(auth.uid());
end;
$$;
revoke all on function public.adaptive_assert_user(uuid),public.adaptive_preferences_json(uuid),public.adaptive_room_json(uuid) from public,anon,authenticated;
revoke all on function public.adaptive_preferences_read(uuid),public.adaptive_preferences_patch(uuid,jsonb,bigint),public.adaptive_intro_claim(uuid),public.adaptive_intro_renew(uuid,uuid),public.adaptive_intro_ack(uuid),public.adaptive_room_configuration_read(uuid),public.adaptive_room_configuration_patch(uuid,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.adaptive_preferences_read(uuid),public.adaptive_preferences_patch(uuid,jsonb,bigint),public.adaptive_intro_claim(uuid),public.adaptive_intro_renew(uuid,uuid),public.adaptive_intro_ack(uuid),public.adaptive_room_configuration_read(uuid),public.adaptive_room_configuration_patch(uuid,jsonb,bigint) to authenticated;
commit;
