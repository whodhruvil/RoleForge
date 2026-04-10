alter table public.generations
add column if not exists matched_skills text[] default '{}',
add column if not exists new_skills_added text[] default '{}',
add column if not exists resume_changes text[] default '{}',
add column if not exists resume_before_summary text,
add column if not exists resume_after_summary text;
