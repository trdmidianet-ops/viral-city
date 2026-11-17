-- Agenda sem conta conectada: o usuário marca dias e horários e recebe o lembrete
-- "seu corte está pronto para postar". Horário sem conta (account_id nulo) = lembrete;
-- horário com conta continua sendo a postagem automática do worker no PC.

alter table vc_posting_slots add column user_id text references "user" ("id") on delete cascade;
update vc_posting_slots s set user_id = a.user_id from vc_accounts a where a.id = s.account_id;
alter table vc_posting_slots alter column user_id set not null;
alter table vc_posting_slots alter column account_id drop not null;

create unique index vc_posting_slots_reminder_uidx on vc_posting_slots (user_id, weekday, post_time) where account_id is null;
create index vc_posting_slots_user_idx on vc_posting_slots (user_id);
