-- Templates estilo "post de página": perfil (foto, nome, selo e @) e texto de baixo.
alter table vc_scale_jobs
  add column profile_name text not null default '',
  add column avatar_url text,
  add column verified boolean not null default true,
  add column cta text not null default '';
