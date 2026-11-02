-- CityCoins: o combustível da Viral City. 1 CityCoin = US$ 0,01.
-- Saldo em vc_wallets, extrato imutável em vc_coin_ledger, compras da Stripe em vc_purchases.
-- Todo movimento passa pelas funções abaixo (atômicas e idempotentes), chamadas só pelo servidor e pelo worker.

create table vc_wallets (
  user_id text primary key references "user" ("id") on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table vc_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  stripe_session_id text not null unique,
  currency text not null check (currency in ('usd','brl','eur','gbp')),
  amount_minor integer not null check (amount_minor > 0),
  usd_cents integer not null check (usd_cents > 0),
  coins integer not null check (coins > 0),
  usd_rate numeric not null, -- quanto 1 USD valia na moeda da compra, no momento do checkout
  status text not null default 'pending' check (status in ('pending','paid','expired')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table vc_coin_ledger (
  id bigint generated always as identity primary key,
  user_id text not null references "user" ("id") on delete cascade,
  amount bigint not null check (amount <> 0), -- positivo entra, negativo sai
  balance_after bigint not null,
  kind text not null check (kind in ('purchase','spend','refund','bonus','adjust')),
  description text not null default '',
  purchase_id uuid unique references vc_purchases on delete set null,
  source_id uuid references vc_sources on delete set null,
  created_at timestamptz not null default now()
);

create index vc_purchases_user_idx on vc_purchases (user_id, created_at desc);
create index vc_coin_ledger_user_idx on vc_coin_ledger (user_id, created_at desc);

-- A carteira é criada no primeiro movimento (vc_move_coins); sem carteira, o saldo é zero.

-- Movimento interno: soma (ou subtrai) do saldo e registra no extrato. Nunca deixa o saldo negativo.
create function vc_move_coins(
  p_user text, p_amount bigint, p_kind text, p_description text,
  p_purchase uuid default null, p_source uuid default null
) returns bigint
language plpgsql as $$
declare
  new_balance bigint;
begin
  if p_amount = 0 then
    raise exception 'valor inválido';
  end if;
  insert into vc_wallets (user_id) values (p_user) on conflict do nothing;
  update vc_wallets
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user and balance + p_amount >= 0
    returning balance into new_balance;
  if not found then
    raise exception 'saldo_insuficiente';
  end if;
  insert into vc_coin_ledger (user_id, amount, balance_after, kind, description, purchase_id, source_id)
    values (p_user, p_amount, new_balance, p_kind, coalesce(p_description, ''), p_purchase, p_source);
  return new_balance;
end;
$$;

-- Credita uma compra paga. Idempotente: webhook e tela de sucesso podem chamar ao mesmo tempo.
-- Devolve o novo saldo, ou null se a compra não existe ou já foi creditada.
create function vc_credit_purchase(p_session text) returns bigint
language plpgsql as $$
declare
  p vc_purchases;
begin
  update vc_purchases
    set status = 'paid', paid_at = now()
    where stripe_session_id = p_session and status <> 'paid'
    returning * into p;
  if not found then
    return null;
  end if;
  return vc_move_coins(p.user_id, p.coins, 'purchase', format('Compra de %s CityCoins', p.coins), p.id, null);
end;
$$;

-- Cobra uma fonte (vídeo longo) uma única vez. Sem saldo: lança 'saldo_insuficiente' e nada muda.
-- Devolve o novo saldo, ou null se esta fonte já tinha sido cobrada.
create function vc_charge_source(p_source uuid, p_amount integer, p_description text) returns bigint
language plpgsql as $$
declare
  owner text;
begin
  if p_amount <= 0 then
    raise exception 'valor inválido';
  end if;
  update vc_sources set charged_coins = p_amount
    where id = p_source and charged_coins is null
    returning user_id into owner;
  if not found then
    return null;
  end if;
  return vc_move_coins(owner, -p_amount, 'spend', p_description, null, p_source);
end;
$$;

-- Devolve o que foi cobrado de uma fonte que falhou. Idempotente.
create function vc_refund_source(p_source uuid, p_description text) returns bigint
language plpgsql as $$
declare
  owner text;
  charged integer;
begin
  select user_id, charged_coins into owner, charged
    from vc_sources where id = p_source for update;
  if charged is null then
    return null;
  end if;
  update vc_sources set charged_coins = null where id = p_source;
  return vc_move_coins(owner, charged, 'refund', p_description, null, p_source);
end;
$$;
