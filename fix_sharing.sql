-- Run this in your Supabase SQL Editor to fix the share mission issues

-- 1. Ensure missions shared policy exists
drop policy if exists "missions: public read shared" on public.missions;
create policy "missions: public read shared" on public.missions for select using (is_shared = true);

-- 2. Make profiles public for reading (so display names show up)
drop policy if exists "profiles: owner read" on public.profiles;
drop policy if exists "profiles: public read" on public.profiles;
create policy "profiles: public read" on public.profiles for select using (true);

-- 3. Fix foreign key so PostgREST can join missions to profiles (avoids the relation cache error)
alter table public.missions drop constraint if exists missions_user_id_fkey;
alter table public.missions add constraint missions_user_id_fkey foreign key (user_id) references public.profiles(user_id) on delete cascade;

-- 4. Reload PostgREST schema cache
notify pgrst, 'reload schema';
