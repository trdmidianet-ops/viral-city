-- Roleta de CityCoins: giros que o usuário ganha (por uso ou por inatividade) e o prêmio de cada um.
-- O giro nunca é vendido. Um giro = uma linha; depois de usado, guarda o prêmio que saiu.
-- Conceder e girar passam pelas funções abaixo (atômicas e idempotentes), chamadas só pelo servidor e pelo worker.

create table vc_roulette_spins (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" ("id") on delete cascade,
  reason text not null check (reason in ('inactive_7','inactive_21','cuts','admin')),
  grant_key text not null, -- identifica o motivo exato (ex.: 'cuts:10'); o mesmo motivo não concede duas vezes
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  prize integer check (prize > 0),
  unique (user_id, grant_key),
  check ((used_at is null) = (prize is null))
);

create index vc_roulette_spins_user_idx on vc_roulette_spins (user_id, used_at, expires_at);

-- Concede um giro. Devolve 'ok' ou o motivo da recusa:
--   'ja_concedido'      este motivo (grant_key) já rendeu um giro
--   'inelegivel'        e-mail não verificado, ou a conta nunca pagou nem processou um vídeo
--   'limite_guardados'  já tem p_max_stored giros válidos sem usar
--   'limite_mensal'     já ganhou p_max_per_month giros nos últimos 30 dias
-- O motivo 'admin' ignora elegibilidade e limites (para suporte e testes).
create function vc_grant_spin(
  p_user text, p_reason text, p_key text,
  p_ttl_days integer, p_max_stored integer, p_max_per_month integer
) returns text
language plpgsql as $$
declare
  verified boolean;
begin
  if p_ttl_days <= 0 then
    raise exception 'valor inválido';
  end if;
  -- um usuário por vez: duas concessões simultâneas não furam os limites
  perform pg_advisory_xact_lock(hashtext('vc_roulette:' || p_user));

  if exists (select 1 from vc_roulette_spins where user_id = p_user and grant_key = p_key) then
    return 'ja_concedido';
  end if;

  if p_reason <> 'admin' then
    select "emailVerified" into verified from "user" where "id" = p_user;
    if not coalesce(verified, false) then
      return 'inelegivel';
    end if;
    if not exists (select 1 from vc_purchases where user_id = p_user and status = 'paid')
       and not exists (select 1 from vc_sources where user_id = p_user and charged_coins is not null)
       and not exists (select 1 from vc_scale_jobs where user_id = p_user and charged_coins is not null) then
      return 'inelegivel';
    end if;
    if (select count(*) from vc_roulette_spins
          where user_id = p_user and used_at is null and expires_at > now()) >= p_max_stored then
      return 'limite_guardados';
    end if;
    if (select count(*) from vc_roulette_spins
          where user_id = p_user and reason <> 'admin' and granted_at > now() - interval '30 days') >= p_max_per_month then
      return 'limite_mensal';
    end if;
  end if;

  insert into vc_roulette_spins (user_id, reason, grant_key, expires_at)
    values (p_user, p_reason, p_key, now() + make_interval(days => p_ttl_days));
  return 'ok';
end;
$$;

-- Usa o giro válido mais perto de vencer e credita o prêmio como bônus. O prêmio (p_prize) é sorteado
-- pelo servidor; aqui só se aplica a regra do prêmio máximo: se a conta já ganhou p_jackpot (ou mais)
-- nos últimos p_jackpot_cooldown_days, paga p_fallback no lugar.
-- Devolve o prêmio pago e o novo saldo, ou nenhuma linha se não há giro disponível.
create function vc_spin_roulette(
  p_user text, p_prize integer,
  p_jackpot integer, p_jackpot_cooldown_days integer, p_fallback integer
) returns table (won_prize integer, new_balance bigint)
language plpgsql as $$
declare
  spin_id uuid;
begin
  if p_prize is null or p_prize <= 0 or p_fallback is null or p_fallback <= 0 then
    raise exception 'valor inválido';
  end if;
  perform pg_advisory_xact_lock(hashtext('vc_roulette:' || p_user));

  select s.id into spin_id from vc_roulette_spins s
    where s.user_id = p_user and s.used_at is null and s.expires_at > now()
    order by s.expires_at, s.granted_at
    limit 1
    for update;
  if not found then
    return;
  end if;

  won_prize := p_prize;
  if p_prize >= p_jackpot and exists (
    select 1 from vc_roulette_spins s
      where s.user_id = p_user and s.prize >= p_jackpot
        and s.used_at > now() - make_interval(days => p_jackpot_cooldown_days)
  ) then
    won_prize := p_fallback;
  end if;

  update vc_roulette_spins s set used_at = now(), prize = won_prize where s.id = spin_id;
  new_balance := vc_move_coins(p_user, won_prize, 'bonus', format('Roleta: prêmio de %s CityCoins', won_prize));
  return next;
end;
$$;
