-- Viral City — esquema base (Postgres puro, roda no Neon ou em qualquer Postgres).
-- Cada dado tem dono (user_id → "user", do login). O banco só é acessado pelo servidor e
-- pelo worker; o app filtra sempre por user_id.

create table vc_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  platform text not null check (platform in ('youtube','tiktok','instagram')),
  external_id text not null,
  name text not null,
  handle text,
  avatar_url text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  tokens text not null,
  niche text,
  logo text,
  connected_at timestamptz not null default now(),
  -- um canal só pode estar em uma conta da Viral City
  unique (platform, external_id)
);

create table vc_posting_slots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references vc_accounts on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  post_time time not null,
  timezone text not null default 'America/Sao_Paulo',
  last_run_on date,
  created_at timestamptz not null default now(),
  unique (account_id, weekday, post_time)
);

create table vc_videos (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  account_id uuid references vc_accounts on delete set null,
  reference jsonb,
  title text not null,
  description text not null default '',
  script text not null default '',
  voice text not null default '',
  status text not null default 'queued'
    check (status in ('queued','rendering','ready','publishing','published','failed')),
  error text,
  local_path text,
  duration_seconds numeric,
  external_post_id text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vc_sources (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  kind text not null check (kind in ('channel','file','link')),
  account_id uuid references vc_accounts on delete set null,
  youtube_video_id text,
  source_url text,
  upload_name text,
  title text not null default '',
  language text not null default 'portuguese' check (language in ('portuguese','english','spanish')),
  framing text not null default 'blur' check (framing in ('center','blur','split')),
  captions boolean not null default true,
  use_logo boolean not null default true,
  niche text,
  reference_title text,
  status text not null default 'queued'
    check (status in ('queued','downloading','transcribing','analyzing','rendering','ready','failed')),
  progress text,
  error text,
  local_path text,
  duration_seconds numeric,
  transcript jsonb,
  ai_used boolean,
  -- CityCoins cobrados por esta fonte (null = ainda não cobrou); evita cobrar duas vezes
  charged_coins integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vc_clips (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references vc_sources on delete cascade,
  position smallint not null,
  start_seconds numeric not null,
  end_seconds numeric not null,
  score smallint not null default 0 check (score between 0 and 100),
  hook text not null default '',
  reason text not null default '',
  is_best boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending','rendering','rendered','approved','failed')),
  error text,
  local_path text,
  video_id uuid references vc_videos on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vc_accounts_user_idx on vc_accounts (user_id);
create index vc_posting_slots_account_idx on vc_posting_slots (account_id);
create index vc_videos_user_idx on vc_videos (user_id, created_at desc);
create index vc_videos_status_idx on vc_videos (status, created_at);
create index vc_sources_user_idx on vc_sources (user_id, created_at desc);
create index vc_sources_status_idx on vc_sources (status, created_at);
create index vc_clips_source_idx on vc_clips (source_id, position);
create index vc_clips_status_idx on vc_clips (status);
