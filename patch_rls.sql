-- Run this in Supabase SQL Editor to drop and recreate the updated RLS policies

drop policy if exists "day_tasks: mission owner read" on public.day_tasks;
create policy "day_tasks: mission owner read" on public.day_tasks for select
  using (exists (select 1 from public.missions m where m.mission_id = day_tasks.mission_id and (m.user_id = auth.uid() or m.is_shared = true)));

drop policy if exists "problem_items: mission owner read" on public.problem_items;
create policy "problem_items: mission owner read" on public.problem_items for select
  using (exists (select 1 from public.missions m where m.mission_id = problem_items.mission_id and (m.user_id = auth.uid() or m.is_shared = true)));
