-- Viral City — esquema inicial (fase 1). Já prevê contas, vídeos e agenda das próximas fases.

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create type public.platform as enum ('youtube', 'tiktok', 'instagram');

-- Contas de redes sociais conectadas (tokens OAuth ficam criptografados no backend, fase 3)
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform public.platform not null,
  external_id text not null,
  handle text,
  avatar_url text,
  niche text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

-- Grade semanal de postagem por conta (fase 5). weekday: 0 = domingo
create table public.posting_slots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  post_time time not null,
  timezone text not null default 'America/Sao_Paulo',
  unique (account_id, weekday, post_time)
);

-- Vídeos gerados pela IA (fase 4) e sua publicação (fase 5)
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  account_id uuid references public.social_accounts on delete set null,
  reference_url text,
  title text,
  script text,
  storage_path text,
  status text not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  external_post_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posting_slots enable row level security;
alter table public.videos enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own accounts" on public.social_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own slots" on public.posting_slots
  for all using (
    exists (select 1 from public.social_accounts a where a.id = account_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.social_accounts a where a.id = account_id and a.user_id = auth.uid())
  );

create policy "own videos" on public.videos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cria o perfil automaticamente no cadastro
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
