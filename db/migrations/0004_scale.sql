-- Scale e Templates: um vídeo base (corte pronto ou clipe enviado) vira várias versões,
-- cada uma com um template de layout e uma manchete. Cobrado em CityCoins por versão.

create table vc_scale_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  account_id uuid references vc_accounts on delete set null,
  base_kind text not null check (base_kind in ('clip','file')),
  clip_id uuid references vc_clips on delete set null,
  base_path text,
  base_name text,
  topic text not null default '',
  templates text[] not null,
  headlines text[] not null default '{}',
  use_ai boolean not null default false,
  count smallint not null check (count between 1 and 30),
  handle text not null default '',
  status text not null default 'queued'
    check (status in ('queued','writing','rendering','ready','failed')),
  progress text,
  error text,
  ai_used boolean,
  -- CityCoins cobrados (null = ainda não cobrou); evita cobrar duas vezes
  charged_coins integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vc_variations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references vc_scale_jobs on delete cascade,
  position smallint not null,
  template text not null,
  headline text not null default '',
  -- pequenas diferenças de edição entre as versões (zoom, velocidade, início)
  params jsonb not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','rendering','rendered','approved','failed')),
  error text,
  local_path text,
  duration_seconds numeric,
  video_id uuid references vc_videos on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vc_scale_jobs_user_idx on vc_scale_jobs (user_id, created_at desc);
create index vc_scale_jobs_status_idx on vc_scale_jobs (status, created_at);
create index vc_variations_job_idx on vc_variations (job_id, position);
create index vc_variations_status_idx on vc_variations (status);

-- Cobra um job de Scale uma única vez. Sem saldo: lança 'saldo_insuficiente' e nada muda.
create function vc_charge_scale(p_job uuid, p_amount integer, p_description text) returns bigint
language plpgsql as $$
declare
  owner text;
begin
  if p_amount <= 0 then
    raise exception 'valor inválido';
  end if;
  update vc_scale_jobs set charged_coins = p_amount
    where id = p_job and charged_coins is null
    returning user_id into owner;
  if not found then
    return null;
  end if;
  return vc_move_coins(owner, -p_amount, 'spend', p_description, null, null);
end;
$$;

-- Devolve parte (ou tudo) do que foi cobrado de um job: versões que falharam. Idempotente por valor:
-- nunca devolve mais do que ainda está cobrado.
create function vc_refund_scale(p_job uuid, p_amount integer, p_description text) returns bigint
language plpgsql as $$
declare
  owner text;
  charged integer;
  give integer;
begin
  select user_id, charged_coins into owner, charged
    from vc_scale_jobs where id = p_job for update;
  if charged is null or charged <= 0 then
    return null;
  end if;
  give := least(charged, coalesce(p_amount, charged));
  if give <= 0 then
    return null;
  end if;
  update vc_scale_jobs set charged_coins = charged - give where id = p_job;
  return vc_move_coins(owner, give, 'refund', p_description, null, null);
end;
$$;
