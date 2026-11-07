-- Indique e Ganhe: cada usuário tem um cupom (ex.: TORRES10).
-- Quem entra com o cupom ganha um bônus no cadastro e +10% na primeira compra;
-- quem indicou ganha 10% em CityCoins de cada compra do indicado.

create table vc_referral_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  user_id text not null unique references "user" ("id") on delete cascade,
  created_at timestamptz not null default now()
);

create table vc_referrals (
  referred_user_id text primary key references "user" ("id") on delete cascade,
  referrer_user_id text not null references "user" ("id") on delete cascade,
  code text not null,
  signup_bonus integer not null default 0,
  first_purchase_bonus integer,
  created_at timestamptz not null default now(),
  check (referred_user_id <> referrer_user_id)
);

-- Comissão de cada compra (uma por compra: a compra só é creditada uma vez)
create table vc_referral_earnings (
  purchase_id uuid primary key references vc_purchases on delete cascade,
  referrer_user_id text not null references "user" ("id") on delete cascade,
  referred_user_id text not null references "user" ("id") on delete cascade,
  coins integer not null check (coins > 0),
  usd_cents integer not null,
  created_at timestamptz not null default now()
);

create index vc_referrals_referrer_idx on vc_referrals (referrer_user_id, created_at desc);
create index vc_referral_earnings_referrer_idx on vc_referral_earnings (referrer_user_id, created_at desc);

-- Liga um usuário novo ao cupom e dá o bônus de cadastro. Recusa (devolve o motivo) se:
-- cupom não existe, é o próprio cupom, já foi indicado, já comprou ou a conta é antiga.
-- p_daily_cap limita quantos bônus de cadastro um mesmo cupom dá por dia (contra contas falsas).
create function vc_apply_referral(p_user text, p_code text, p_bonus integer, p_max_age_days integer, p_daily_cap integer)
returns text
language plpgsql as $$
declare
  referrer text;
  created timestamptz;
  today_count integer;
  bonus integer := greatest(coalesce(p_bonus, 0), 0);
begin
  select user_id into referrer from vc_referral_codes where code = upper(trim(p_code));
  if referrer is null then return 'cupom_invalido'; end if;
  if referrer = p_user then return 'proprio_cupom'; end if;
  if exists (select 1 from vc_referrals where referred_user_id = p_user) then return 'ja_indicado'; end if;
  if exists (select 1 from vc_purchases where user_id = p_user and status = 'paid') then return 'ja_comprou'; end if;
  select "createdAt" into created from "user" where "id" = p_user;
  if created is null or created < now() - make_interval(days => p_max_age_days) then return 'conta_antiga'; end if;

  select count(*) into today_count from vc_referrals
    where referrer_user_id = referrer and signup_bonus > 0 and created_at > now() - interval '1 day';
  if today_count >= p_daily_cap then bonus := 0; end if;

  insert into vc_referrals (referred_user_id, referrer_user_id, code, signup_bonus)
    values (p_user, referrer, upper(trim(p_code)), bonus);
  if bonus > 0 then
    perform vc_move_coins(p_user, bonus, 'bonus', format('Bônus de cadastro com o cupom %s', upper(trim(p_code))));
  end if;
  return 'ok';
end;
$$;

-- Crédito de compra com Indique e Ganhe: mesma regra de antes (idempotente) e, se o comprador
-- foi indicado, +10% para ele na primeira compra e 10% de comissão para quem indicou.
create or replace function vc_credit_purchase(p_session text) returns bigint
language plpgsql as $$
declare
  p vc_purchases;
  r vc_referrals;
  new_balance bigint;
  extra integer;
begin
  update vc_purchases
    set status = 'paid', paid_at = now()
    where stripe_session_id = p_session and status <> 'paid'
    returning * into p;
  if not found then
    return null;
  end if;
  new_balance := vc_move_coins(p.user_id, p.coins, 'purchase', format('Compra de %s CityCoins', p.coins), p.id, null);

  select * into r from vc_referrals where referred_user_id = p.user_id for update;
  if found then
    extra := floor(p.coins * 0.10);
    if r.first_purchase_bonus is null and extra > 0 then
      new_balance := vc_move_coins(p.user_id, extra, 'bonus', format('+10%% na primeira compra (cupom %s)', r.code));
      update vc_referrals set first_purchase_bonus = extra where referred_user_id = p.user_id;
    end if;
    if extra > 0 then
      insert into vc_referral_earnings (purchase_id, referrer_user_id, referred_user_id, coins, usd_cents)
        values (p.id, r.referrer_user_id, p.user_id, extra, p.usd_cents)
        on conflict do nothing;
      if found then
        perform vc_move_coins(r.referrer_user_id, extra, 'bonus', format('Comissão de indicação (cupom %s)', r.code));
      end if;
    end if;
  end if;
  return new_balance;
end;
$$;
