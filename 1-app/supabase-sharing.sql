-- Run AFTER supabase-setup.sql in the existing project's SQL Editor.
-- Additive migration: existing boards and the original save RPC are retained.
begin;
create table if not exists public.mission_house_members (
 owner_id uuid not null references public.mission_boards(user_id) on delete cascade,
 member_id uuid not null references auth.users(id) on delete cascade,
 primary key(owner_id,member_id), check(owner_id<>member_id)
);
create table if not exists public.mission_house_invites (
 owner_id uuid primary key references public.mission_boards(user_id) on delete cascade,
 code text not null unique,
 expires_at timestamptz not null
);
alter table public.mission_house_members enable row level security;
alter table public.mission_house_invites enable row level security;
revoke all on public.mission_house_members,public.mission_house_invites from public,anon,authenticated;

create or replace function public.can_use_mission_house(house_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (house_id=auth.uid() or exists(
  select 1 from public.mission_house_members where owner_id=house_id and member_id=auth.uid()
 ));
$$;
revoke all on function public.can_use_mission_house(uuid) from public,anon;
grant execute on function public.can_use_mission_house(uuid) to authenticated;
drop policy if exists "Shared house read" on public.mission_boards;
create policy "Shared house read" on public.mission_boards for select to authenticated
 using(public.can_use_mission_house(user_id));

create or replace function public.save_shared_mission_board(house_id uuid,expected_revision bigint,new_payload jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
 if not public.can_use_mission_house(house_id) then raise exception 'House access denied'; end if;
 if jsonb_typeof(new_payload->'tasks') is distinct from 'array'
 or jsonb_typeof(new_payload->'side') is distinct from 'array'
 or jsonb_typeof(new_payload->'wins') is distinct from 'array' then raise exception 'Invalid board'; end if;
 update public.mission_boards set payload=new_payload,revision=revision+1,updated_at=now()
 where user_id=house_id and revision=expected_revision;
 get diagnostics affected=row_count;
 return affected=1;
end;
$$;
revoke all on function public.save_shared_mission_board(uuid,bigint,jsonb) from public,anon;
grant execute on function public.save_shared_mission_board(uuid,bigint,jsonb) to authenticated;

create or replace function public.mission_house_sharing(action text,invite_code text default null,target_member uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); owner uuid; token text; result jsonb;
begin
 if me is null then raise exception 'Sign in first'; end if;
 if action='invite' then
  if not exists(select 1 from public.mission_boards where user_id=me) then raise exception 'Open and sync your own house first'; end if;
  token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.mission_house_invites values(me,token,now()+interval '7 days')
  on conflict(owner_id) do update set code=excluded.code,expires_at=excluded.expires_at;
  return jsonb_build_object('code',token,'expiresAt',now()+interval '7 days');
 elsif action='cancel-invite' then
  delete from public.mission_house_invites where owner_id=me;
  return '{}'::jsonb;
 elsif action='join' then
  select owner_id into owner from public.mission_house_invites
  where code=trim(invite_code) and expires_at>now() for update;
  if owner is null then raise exception 'This invite is invalid or expired'; end if;
  if owner=me then raise exception 'This is your own house'; end if;
  insert into public.mission_house_members values(owner,me) on conflict do nothing;
  -- Single-use invitation: mint another code to invite another person.
  delete from public.mission_house_invites where owner_id=owner;
  return jsonb_build_object('houseId',owner);
 elsif action='remove-member' then
  delete from public.mission_house_members where owner_id=me and member_id=target_member;
  return '{}'::jsonb;
 elsif action='list' then
  select jsonb_build_object(
   'houses',coalesce((select jsonb_agg(jsonb_build_object('id',b.user_id,'own',b.user_id=me,'label',case when b.user_id=me then 'My house' else coalesce(u.email,'Shared house')||' — shared house' end))
    from public.mission_boards b join auth.users u on u.id=b.user_id where public.can_use_mission_house(b.user_id)),'[]'::jsonb),
   'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.member_id,'email',u.email)) from public.mission_house_members m join auth.users u on u.id=m.member_id where m.owner_id=me),'[]'::jsonb)
  ) into result;
  return result;
 else raise exception 'Unknown sharing action';
 end if;
end;
$$;
revoke all on function public.mission_house_sharing(text,text,uuid) from public,anon;
grant execute on function public.mission_house_sharing(text,text,uuid) to authenticated;
commit;
