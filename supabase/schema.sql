create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dashboard text not null check (dashboard in ('personal', 'professional')),
  week_start date not null,
  selected_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dashboard, week_start)
);

create table if not exists public.day_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_id uuid not null references public.task_weeks(id) on delete cascade,
  task_date date not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sidebar_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dashboard text not null check (dashboard in ('personal', 'professional')),
  list_type text not null check (list_type in ('general', 'buy')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 140),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.future_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 140),
  target_date date,
  note text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.manifesting_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  tone text not null default 'Vision',
  note text not null default '',
  image_url text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_task_weeks_updated_at on public.task_weeks;
create trigger set_task_weeks_updated_at
before update on public.task_weeks
for each row execute function public.set_updated_at();

drop trigger if exists set_day_tasks_updated_at on public.day_tasks;
create trigger set_day_tasks_updated_at
before update on public.day_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_sidebar_tasks_updated_at on public.sidebar_tasks;
create trigger set_sidebar_tasks_updated_at
before update on public.sidebar_tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_intentions_updated_at on public.intentions;
create trigger set_intentions_updated_at
before update on public.intentions
for each row execute function public.set_updated_at();

drop trigger if exists set_future_goals_updated_at on public.future_goals;
create trigger set_future_goals_updated_at
before update on public.future_goals
for each row execute function public.set_updated_at();

drop trigger if exists set_manifesting_cards_updated_at on public.manifesting_cards;
create trigger set_manifesting_cards_updated_at
before update on public.manifesting_cards
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.task_weeks enable row level security;
alter table public.day_tasks enable row level security;
alter table public.sidebar_tasks enable row level security;
alter table public.intentions enable row level security;
alter table public.future_goals enable row level security;
alter table public.manifesting_cards enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "task_weeks_all_own"
on public.task_weeks
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "day_tasks_all_own"
on public.day_tasks
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "sidebar_tasks_all_own"
on public.sidebar_tasks
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "intentions_all_own"
on public.intentions
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "future_goals_all_own"
on public.future_goals
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "manifesting_cards_all_own"
on public.manifesting_cards
for all
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);
