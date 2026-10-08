-- Run in the SQL Editor of your Mission Control Supabase project.
-- New authenticated board storage; the downloaded legacy table is not deleted.
begin;
create table if not exists public.mission_boards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.mission_boards enable row level security;
revoke all on public.mission_boards from anon;
grant select, insert, update on public.mission_boards to authenticated;
drop policy if exists "Own board read" on public.mission_boards;
drop policy if exists "Own board insert" on public.mission_boards;
drop policy if exists "Own board update" on public.mission_boards;
create policy "Own board read" on public.mission_boards for select to authenticated using ((select auth.uid())=user_id);
create policy "Own board insert" on public.mission_boards for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Own board update" on public.mission_boards for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.save_mission_board(expected_revision bigint,new_payload jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare affected integer;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(new_payload->'tasks') is distinct from 'array'
     or jsonb_typeof(new_payload->'side') is distinct from 'array'
     or jsonb_typeof(new_payload->'wins') is distinct from 'array'
  then raise exception 'Invalid board'; end if;
  if expected_revision=0 then
    insert into public.mission_boards(user_id,payload) values(auth.uid(),new_payload) on conflict(user_id) do nothing;
  else
    update public.mission_boards set payload=new_payload,revision=revision+1,updated_at=now()
    where user_id=auth.uid() and revision=expected_revision;
  end if;
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;
revoke all on function public.save_mission_board(bigint,jsonb) from public,anon;
grant execute on function public.save_mission_board(bigint,jsonb) to authenticated;
-- Close the original public-access rules, if that old setup was run.
do $$ begin
  if to_regclass('public.mission_state') is not null then
    execute 'revoke all on public.mission_state from anon, authenticated';
    execute 'drop policy if exists "mission read" on public.mission_state';
    execute 'drop policy if exists "mission insert" on public.mission_state';
    execute 'drop policy if exists "mission update" on public.mission_state';
  end if;
end $$;
commit;
