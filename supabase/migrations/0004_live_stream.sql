-- Live stream embed settings (public: the channel name is shown on the site anyway).
alter table public.settings
  add column stream_platform text not null default 'kick' check (stream_platform in ('kick','twitch','youtube')),
  add column stream_channel text,
  add column stream_manual_live boolean not null default false;
