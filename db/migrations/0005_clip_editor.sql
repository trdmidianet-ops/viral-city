-- Editor de clipes: ajustes por corte. null = usa o que foi escolhido para o vídeo longo.
alter table vc_clips
  add column framing text check (framing in ('center','blur','split')),
  add column captions boolean,
  add column caption_color text not null default 'orange' check (caption_color in ('orange','yellow','green','cyan','pink','white')),
  add column speed numeric not null default 1 check (speed between 0.5 and 2),
  add column hook_position text not null default 'top' check (hook_position in ('top','middle','none'));
