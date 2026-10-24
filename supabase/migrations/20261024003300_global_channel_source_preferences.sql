create table if not exists public.tv_channel_source_preferences (
  channel_id text primary key
    check (char_length(btrim(channel_id)) between 1 and 200),
  source_url text not null
    check (char_length(source_url) <= 2048 and source_url ~* '^https?://')
);

alter table public.tv_channel_source_preferences enable row level security;

revoke all on public.tv_channel_source_preferences from public;
grant select on public.tv_channel_source_preferences to anon, authenticated;
grant insert, update on public.tv_channel_source_preferences to authenticated;

create policy "Anyone can read shared channel sources"
  on public.tv_channel_source_preferences for select
  to anon, authenticated
  using (true);

create policy "Signed-in users can submit a working channel source"
  on public.tv_channel_source_preferences for insert
  to authenticated
  with check (true);

create policy "Signed-in users can update a working channel source"
  on public.tv_channel_source_preferences for update
  to authenticated
  using (true)
  with check (true);
