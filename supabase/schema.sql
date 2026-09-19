-- ============================================================
-- GoalAscent — Full Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null default '',
  handle         text unique,
  avatar_url     text,
  timezone       text not null default 'UTC',
  current_streak_days integer not null default 0,
  last_active_date    date,
  notification_prefs  jsonb not null default '{"push": false, "email": false, "quiet_hours": null}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read"   on public.profiles for select using (auth.uid() = user_id);
create policy "profiles: owner insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles: owner update" on public.profiles for update using (auth.uid() = user_id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Missions ────────────────────────────────────────────────
create table if not exists public.missions (
  mission_id              uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  title                   text not null,
  description             text,
  duration_days           integer not null,
  baseline_rating         integer,
  target_rating           integer,
  daily_time_budget       text,
  start_date              date not null,
  rest_days               integer[] not null default '{}',
  status                  text not null default 'Active' check (status in ('Active','Archived','Completed')),
  forked_from_mission_id  uuid references public.missions(mission_id),
  forked_from_template_id uuid,
  share_token             text not null default encode(gen_random_bytes(16), 'hex'),
  created_at              timestamptz not null default now()
);

alter table public.missions enable row level security;

create policy "missions: owner read"   on public.missions for select using (auth.uid() = user_id);
create policy "missions: owner insert" on public.missions for insert with check (auth.uid() = user_id);
create policy "missions: owner update" on public.missions for update using (auth.uid() = user_id);
create policy "missions: owner delete" on public.missions for delete using (auth.uid() = user_id);

-- ─── Day Tasks ───────────────────────────────────────────────
create table if not exists public.day_tasks (
  day_task_id  uuid primary key default gen_random_uuid(),
  mission_id   uuid not null references public.missions(mission_id) on delete cascade,
  day_number   integer not null,
  stage        text,
  topic        text,
  primary_skill text,
  time_target  text,
  checkpoint   text,
  drill_type   text,
  is_completed boolean not null default false,
  unique (mission_id, day_number)
);

alter table public.day_tasks enable row level security;

create policy "day_tasks: mission owner read" on public.day_tasks for select
  using (exists (select 1 from public.missions m where m.mission_id = day_tasks.mission_id and m.user_id = auth.uid()));
create policy "day_tasks: mission owner insert" on public.day_tasks for insert
  with check (exists (select 1 from public.missions m where m.mission_id = day_tasks.mission_id and m.user_id = auth.uid()));
create policy "day_tasks: mission owner update" on public.day_tasks for update
  using (exists (select 1 from public.missions m where m.mission_id = day_tasks.mission_id and m.user_id = auth.uid()));
create policy "day_tasks: mission owner delete" on public.day_tasks for delete
  using (exists (select 1 from public.missions m where m.mission_id = day_tasks.mission_id and m.user_id = auth.uid()));

-- ─── Problem Items ───────────────────────────────────────────
create table if not exists public.problem_items (
  problem_id        uuid primary key default gen_random_uuid(),
  day_task_id       uuid not null references public.day_tasks(day_task_id) on delete cascade,
  mission_id        uuid not null references public.missions(mission_id) on delete cascade,
  slot              text,
  platform          text not null default 'Codeforces',
  title             text not null,
  problem_number    text,
  difficulty_rating integer,
  url               text not null,
  rationale         text,
  topic_tags        text[] not null default '{}',
  status            text not null default 'Pending' check (status in ('Pending','In Progress','Done','Skipped')),
  tag               text check (tag in ('GREEN','YELLOW','RED')),
  struggle_time_mins integer not null default 0,
  bottleneck_note   text,
  viewed_editorial  boolean not null default false,
  solved_at         timestamptz,
  notes             text
);

alter table public.problem_items enable row level security;

create policy "problem_items: mission owner read" on public.problem_items for select
  using (exists (select 1 from public.missions m where m.mission_id = problem_items.mission_id and m.user_id = auth.uid()));
create policy "problem_items: mission owner insert" on public.problem_items for insert
  with check (exists (select 1 from public.missions m where m.mission_id = problem_items.mission_id and m.user_id = auth.uid()));
create policy "problem_items: mission owner update" on public.problem_items for update
  using (exists (select 1 from public.missions m where m.mission_id = problem_items.mission_id and m.user_id = auth.uid()));
create policy "problem_items: mission owner delete" on public.problem_items for delete
  using (exists (select 1 from public.missions m where m.mission_id = problem_items.mission_id and m.user_id = auth.uid()));

-- ─── Contest Logs ────────────────────────────────────────────
create table if not exists public.contest_logs (
  log_id            uuid primary key default gen_random_uuid(),
  mission_id        uuid not null references public.missions(mission_id) on delete cascade,
  platform          text not null default 'Codeforces',
  contest_date      date not null,
  contest_name      text,
  problems_solved   integer,
  total_time_mins   integer,
  penalties         integer not null default 0,
  rank_percentile   text,
  rating_delta      integer,
  new_rating        integer,
  error_entries     jsonb not null default '[]'::jsonb
);

alter table public.contest_logs enable row level security;

create policy "contest_logs: mission owner read" on public.contest_logs for select
  using (exists (select 1 from public.missions m where m.mission_id = contest_logs.mission_id and m.user_id = auth.uid()));
create policy "contest_logs: mission owner insert" on public.contest_logs for insert
  with check (exists (select 1 from public.missions m where m.mission_id = contest_logs.mission_id and m.user_id = auth.uid()));
create policy "contest_logs: mission owner update" on public.contest_logs for update
  using (exists (select 1 from public.missions m where m.mission_id = contest_logs.mission_id and m.user_id = auth.uid()));
create policy "contest_logs: mission owner delete" on public.contest_logs for delete
  using (exists (select 1 from public.missions m where m.mission_id = contest_logs.mission_id and m.user_id = auth.uid()));

-- ─── Review Queue ────────────────────────────────────────────
create table if not exists public.review_queue (
  review_id      uuid primary key default gen_random_uuid(),
  problem_id     uuid not null references public.problem_items(problem_id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  due_date       date not null,
  origin_tag     text not null check (origin_tag in ('RED','YELLOW')),
  attempt_number integer not null default 1,
  resolved       boolean not null default false,
  resolved_tag   text check (resolved_tag in ('GREEN','YELLOW','RED'))
);

alter table public.review_queue enable row level security;

create policy "review_queue: owner read"   on public.review_queue for select using (auth.uid() = user_id);
create policy "review_queue: owner insert" on public.review_queue for insert with check (auth.uid() = user_id);
create policy "review_queue: owner update" on public.review_queue for update using (auth.uid() = user_id);
create policy "review_queue: owner delete" on public.review_queue for delete using (auth.uid() = user_id);

-- Trigger: auto-enqueue review when problem gets RED or YELLOW tag
create or replace function public.enqueue_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_due_date date;
  v_attempt  integer;
begin
  -- Only act when tag changes to RED or YELLOW
  if new.tag is null or new.tag = 'GREEN' then
    return new;
  end if;
  if old.tag = new.tag then
    return new;
  end if;

  -- Resolve owner
  select m.user_id into v_user_id
  from public.missions m where m.mission_id = new.mission_id;

  -- Due date: RED → 3 days, YELLOW → 7 days
  v_due_date := current_date + case when new.tag = 'RED' then 3 else 7 end;

  -- Attempt number = count of prior unresolved + 1
  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.review_queue
  where problem_id = new.problem_id and user_id = v_user_id;

  insert into public.review_queue (problem_id, user_id, due_date, origin_tag, attempt_number)
  values (new.problem_id, v_user_id, v_due_date, new.tag, v_attempt)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_review on public.problem_items;
create trigger trg_enqueue_review
  after update of tag on public.problem_items
  for each row execute procedure public.enqueue_review();

-- ─── Profile Stats View ──────────────────────────────────────
create or replace view public.profile_stats as
select
  m.user_id,
  count(distinct pi.problem_id) filter (where pi.status = 'Done')  as total_solved,
  coalesce(sum(pi.struggle_time_mins) filter (where pi.status = 'Done'), 0) / 60.0 as total_struggle_hours,
  count(distinct pi.problem_id) filter (where pi.tag = 'GREEN')    as flawless_solves,
  count(distinct cl.log_id)                                         as contest_count
from public.missions m
left join public.problem_items pi on pi.mission_id = m.mission_id
left join public.contest_logs  cl on cl.mission_id = m.mission_id
where m.user_id = auth.uid()
group by m.user_id;

-- Grant read on the view
grant select on public.profile_stats to authenticated;

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists idx_missions_user_id       on public.missions(user_id);
create index if not exists idx_day_tasks_mission_id   on public.day_tasks(mission_id);
create index if not exists idx_problem_items_mission  on public.problem_items(mission_id);
create index if not exists idx_problem_items_day_task on public.problem_items(day_task_id);
create index if not exists idx_contest_logs_mission   on public.contest_logs(mission_id);
create index if not exists idx_review_queue_user_due  on public.review_queue(user_id, due_date) where resolved = false;
