-- Chaves para o Claude (MCP) agir em nome do usuário. Guardamos só o hash; a chave aparece uma vez.
create table vc_api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  name text not null default 'Claude',
  token_hash text not null unique,
  last4 text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index vc_api_tokens_user_idx on vc_api_tokens (user_id, created_at desc);
