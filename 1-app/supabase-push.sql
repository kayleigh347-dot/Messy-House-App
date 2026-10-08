-- Apply after supabase-sharing.sql in the EXISTING Supabase project.
begin;
create table if not exists public.mission_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 house_id uuid not null references public.mission_boards(user_id) on delete cascade,
 endpoint text not null unique,
 subscription jsonb not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.mission_push_queue (
 id bigint generated always as identity primary key,
 subscription_id uuid not null references public.mission_push_subscriptions(id) on delete cascade,
 house_id uuid not null references public.mission_boards(user_id) on delete cascade,
 notice_id text not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 next_attempt timestamptz not null default now(),
 attempts integer not null default 0,
 delivered_at timestamptz,
 failed boolean not null default false,
 unique(subscription_id,house_id,notice_id)
);
alter table public.mission_push_subscriptions enable row level security;
alter table public.mission_push_queue enable row level security;
revoke all on public.mission_push_subscriptions,public.mission_push_queue from public,anon,authenticated;
grant all on public.mission_push_subscriptions,public.mission_push_queue to service_role;
grant usage,select on sequence public.mission_push_queue_id_seq to service_role;
create index if not exists mission_push_pending on public.mission_push_queue(next_attempt) where delivered_at is null and not failed;

create or replace function public.register_mission_push(house_id uuid,subscription jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare endpoint_value text:=subscription->>'endpoint';
begin
 if not public.can_use_mission_house(house_id) then raise exception 'House access denied'; end if;
 if length(endpoint_value)>2048 or endpoint_value is null
 or endpoint_value !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)*push\.apple\.com|([a-z0-9-]+\.)*push\.services\.mozilla\.com)/'
 or coalesce(subscription->'keys'->>'p256dh','') !~ '^[A-Za-z0-9_-]{87}=?$'
 or coalesce(subscription->'keys'->>'auth','') !~ '^[A-Za-z0-9_-]{22}={0,2}$'
 then raise exception 'Invalid push subscription'; end if;
 insert into public.mission_push_subscriptions(user_id,house_id,endpoint,subscription)
 values(auth.uid(),house_id,endpoint_value,subscription)
 on conflict(endpoint) do update set user_id=excluded.user_id,house_id=excluded.house_id,subscription=excluded.subscription,updated_at=now();
end; $$;
create or replace function public.remove_mission_push(push_endpoint text)
returns void language sql security definer set search_path='' as $$
 delete from public.mission_push_subscriptions where endpoint=push_endpoint and user_id=auth.uid();
$$;
revoke all on function public.register_mission_push(uuid,jsonb),public.remove_mission_push(text) from public,anon;
grant execute on function public.register_mission_push(uuid,jsonb),public.remove_mission_push(text) to authenticated;

create or replace function public.queue_mission_push()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.mission_push_queue(subscription_id,house_id,notice_id,payload)
 select s.id,new.user_id,n->>'id',jsonb_build_object(
 'title','New shared task','body',left(coalesce(n->>'text','New task'),160)||' · '||left(coalesce(n->>'area','General'),80),
 'tag','mission-task-'||(n->>'id'),'url','./')
 from jsonb_array_elements(coalesce(new.payload->'notifications','[]'::jsonb)) n
 join public.mission_push_subscriptions s on s.house_id=new.user_id and s.user_id::text=n->>'recipientId'
 where n->>'id' is not null and not exists(
 select 1 from jsonb_array_elements(case when tg_op='INSERT' then '[]'::jsonb else coalesce(old.payload->'notifications','[]'::jsonb) end) previous
 where previous->>'id'=n->>'id')
 on conflict do nothing;
 return new;
end; $$;
revoke all on function public.queue_mission_push() from public,anon,authenticated;
drop trigger if exists mission_push_on_save on public.mission_boards;
create trigger mission_push_on_save after insert or update of payload on public.mission_boards for each row execute function public.queue_mission_push();

create or replace function public.claim_mission_push()
returns table(id bigint,attempts integer,subscription_id uuid,subscription jsonb,payload jsonb)
language sql security definer set search_path='' as $$
 with picked as (
 select q.id from public.mission_push_queue q
 join public.mission_push_subscriptions s on s.id=q.subscription_id and s.house_id=q.house_id
 where q.delivered_at is null and not q.failed and q.attempts<8 and q.next_attempt<=now()
 and q.created_at>now()-interval '1 day'
 and (s.user_id=q.house_id or exists(select 1 from public.mission_house_members m where m.owner_id=q.house_id and m.member_id=s.user_id))
 and exists(select 1 from public.mission_boards b,jsonb_array_elements(coalesce(b.payload->'notifications','[]'::jsonb)) n
 where b.user_id=q.house_id and n->>'id'=q.notice_id and n->>'recipientId'=s.user_id::text
 and not coalesce(n->'readBy','[]'::jsonb) ? s.user_id::text)
 order by q.id limit 20 for update of q skip locked
 ), claimed as (
 update public.mission_push_queue q set attempts=q.attempts+1,next_attempt=now()+interval '2 minutes'
 from picked where q.id=picked.id returning q.*
 ) select q.id,q.attempts,s.id,s.subscription,q.payload from claimed q join public.mission_push_subscriptions s on s.id=q.subscription_id;
$$;
revoke all on function public.claim_mission_push() from public,anon,authenticated;
grant execute on function public.claim_mission_push() to service_role;
commit;
