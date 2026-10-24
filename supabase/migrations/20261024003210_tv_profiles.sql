create table if not exists public.tv_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint tv_profiles_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.tv_profiles enable row level security;

-- Newer Supabase projects require explicit grants as well as RLS policies.
grant select, insert, update, delete on public.tv_profiles to authenticated;

drop policy if exists "Users can read their own TV profile" on public.tv_profiles;
drop policy if exists "Users can create their own TV profile" on public.tv_profiles;
drop policy if exists "Users can update their own TV profile" on public.tv_profiles;
drop policy if exists "Users can delete their own TV profile" on public.tv_profiles;

create policy "Users can read their own TV profile"
  on public.tv_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own TV profile"
  on public.tv_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own TV profile"
  on public.tv_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own TV profile"
  on public.tv_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);
