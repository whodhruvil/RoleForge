-- Required for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  claude_api_key text,
  base_resume_url text,
  created_at timestamptz default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  job_url text not null,
  status text default 'processing',
  download_url text,
  created_at timestamptz default now()
);

-- Helpful index for per-user queries and policy checks
create index if not exists generations_user_id_idx on public.generations(user_id);

alter table public.users enable row level security;
alter table public.generations enable row level security;

-- users can only read/write their own generation rows
drop policy if exists "Users can read own generations" on public.generations;
create policy "Users can read own generations"
  on public.generations
  for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own generations" on public.generations;
create policy "Users can insert own generations"
  on public.generations
  for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own generations" on public.generations;
create policy "Users can update own generations"
  on public.generations
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own generations" on public.generations;
create policy "Users can delete own generations"
  on public.generations
  for delete
  using (user_id = auth.uid());

-- Enable Realtime for generations
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'generations'
  ) then
    alter publication supabase_realtime add table public.generations;
  end if;
end
$$;
