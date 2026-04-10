alter table public.generations
add column if not exists jd_url text,
add column if not exists jd_title text,
add column if not exists jd_excerpt text,
add column if not exists ats_score int,
add column if not exists matched_tags text[] default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'generations_ats_score_range'
      and conrelid = 'public.generations'::regclass
  ) then
    alter table public.generations
      add constraint generations_ats_score_range
      check (ats_score is null or (ats_score >= 0 and ats_score <= 100));
  end if;
end
$$;
