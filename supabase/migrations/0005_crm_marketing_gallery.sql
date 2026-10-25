-- Clients (CRM), contact import, announcements log, manual booking, site banner, photo gallery.

-- ---------- phone normalization ----------
create or replace function public.normalize_phone(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) = 10 then '+1' || regexp_replace(p, '\D', '', 'g')
    when length(regexp_replace(p, '\D', '', 'g')) = 11 and regexp_replace(p, '\D', '', 'g') like '1%' then '+' || regexp_replace(p, '\D', '', 'g')
    when length(regexp_replace(p, '\D', '', 'g')) between 7 and 15 then '+' || regexp_replace(p, '\D', '', 'g')
    else null
  end;
$$;

-- ---------- clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  notes text,
  tags text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual','import','booking')),
  email_opt_out boolean not null default false,
  sms_opt_out boolean not null default false,
  unsubscribe_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create unique index clients_phone_key on public.clients (phone) where phone is not null;
create unique index clients_email_key on public.clients (lower(email)) where email is not null;

alter table public.clients enable row level security;
create policy "admin all clients" on public.clients for all using (public.is_admin()) with check (public.is_admin());

alter table public.appointments add column client_id uuid references public.clients(id) on delete set null;
create index appointments_client_idx on public.appointments (client_id);

-- Find-or-create a client by phone/email. Fills in missing fields, never overwrites what's there.
create or replace function public.upsert_client(p_name text, p_phone text, p_email text, p_source text default 'manual')
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_id uuid;
begin
  if v_phone is null and v_email is null and v_name is null then return null; end if;
  select id into v_id from public.clients
   where (v_phone is not null and phone = v_phone) or (v_email is not null and lower(email) = v_email)
   order by (phone = v_phone) desc nulls last limit 1;
  if v_id is null then
    insert into public.clients (name, phone, email, source)
    values (coalesce(v_name, v_phone, v_email), v_phone, v_email, p_source)
    returning id into v_id;
  else
    update public.clients c set
      phone = coalesce(c.phone, case when not exists (select 1 from public.clients x where x.phone = v_phone) then v_phone end),
      email = coalesce(c.email, case when not exists (select 1 from public.clients x where lower(x.email) = v_email) then v_email end),
      name = case when c.name = coalesce(c.phone, '') or c.name = coalesce(c.email, '') then coalesce(v_name, c.name) else c.name end
    where c.id = v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.upsert_client(text, text, text, text) from public, anon, authenticated;

-- Every booking lands in the client list.
create or replace function public._appointment_client() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.client_id is null then
    new.client_id := public.upsert_client(new.customer_name, new.customer_phone, new.customer_email, 'booking');
  end if;
  return new;
end;
$$;
create trigger appointments_client before insert on public.appointments
  for each row execute function public._appointment_client();

update public.appointments set client_id = public.upsert_client(customer_name, customer_phone, customer_email, 'booking') where client_id is null;

-- Bulk import (admin only). Rows: [{name, phone, email}]
create or replace function public.import_clients(p_rows jsonb)
returns table (added int, matched int, skipped int)
language plpgsql volatile security definer set search_path = public as $$
declare
  r jsonb;
  before_count int;
  v_id uuid;
  a int := 0; m int := 0; s int := 0;
begin
  if not public.is_admin() then raise exception 'unauthorized'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if public.normalize_phone(r->>'phone') is null and nullif(trim(coalesce(r->>'email','')), '') is null then
      s := s + 1; continue;
    end if;
    select count(*) into before_count from public.clients;
    v_id := public.upsert_client(left(r->>'name', 120), r->>'phone', left(r->>'email', 200), 'import');
    if v_id is null then s := s + 1;
    elsif (select count(*) from public.clients) > before_count then a := a + 1;
    else m := m + 1; end if;
  end loop;
  return query select a, m, s;
end;
$$;
grant execute on function public.import_clients(jsonb) to authenticated;

-- Per-client stats (RLS of the caller applies)
create view public.client_stats with (security_invoker = true) as
select c.*,
  count(a.*) filter (where a.status = 'completed')::int as visits,
  coalesce(sum(a.amount_cents) filter (where a.status = 'completed'), 0)::int as total_spent_cents,
  max(a.starts_at) filter (where a.status = 'completed') as last_visit,
  min(a.starts_at) filter (where a.status in ('confirmed','pending_payment') and a.starts_at > now()) as next_visit,
  count(a.*) filter (where a.status = 'no_show')::int as no_shows
from public.clients c
left join public.appointments a on a.client_id = c.id
group by c.id;

-- ---------- unsubscribe ----------
create or replace function public.unsubscribe_client(p_token text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  update public.clients set email_opt_out = true where unsubscribe_token = p_token returning id into v;
  return v is not null;
end;
$$;
grant execute on function public.unsubscribe_client(text) to anon, authenticated;

-- ---------- broadcasts log ----------
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','sms')),
  subject text,
  message text not null,
  audience text,
  recipient_count int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.broadcasts enable row level security;
create policy "admin all broadcasts" on public.broadcasts for all using (public.is_admin()) with check (public.is_admin());

-- ---------- manual booking by Tash (ignores hours/lead time, still prevents overlaps) ----------
create or replace function public.admin_book_appointment(
  p_service_ids uuid[], p_starts_at timestamptz, p_name text, p_phone text, p_email text, p_notes text default null
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_services jsonb; v_duration int; v_amount int; v_token text; v_end timestamptz;
begin
  if not public.is_admin() then raise exception 'unauthorized'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Client name is required'; end if;
  select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price_cents', price_cents,
                                      'duration_min', duration_min, 'price_is_starting', price_is_starting)
                   order by is_addon, sort_order),
         sum(duration_min), sum(price_cents)
    into v_services, v_duration, v_amount
    from public.services where id = any(p_service_ids);
  if v_services is null then raise exception 'Choose at least one service'; end if;
  v_end := p_starts_at + make_interval(mins => v_duration);

  perform pg_advisory_xact_lock(hashtext('homme_booking'));
  if exists (select 1 from public.appointments a where public._is_blocking(a) and a.starts_at < v_end and a.ends_at > p_starts_at) then
    raise exception 'You already have an appointment at that time';
  end if;

  insert into public.appointments (services, starts_at, ends_at, customer_name, customer_email, customer_phone,
                                   notes, amount_cents, status, payment_method)
  values (v_services, p_starts_at, v_end, trim(p_name), coalesce(nullif(lower(trim(p_email)), ''), ''),
          coalesce(nullif(trim(p_phone), ''), ''), nullif(trim(coalesce(p_notes, '')), ''), v_amount, 'confirmed', 'in_shop')
  returning manage_token into v_token;
  return v_token;
end;
$$;
grant execute on function public.admin_book_appointment(uuid[], timestamptz, text, text, text, text) to authenticated;

-- ---------- website banner ----------
alter table public.settings add column site_banner text;

-- ---------- gallery ----------
create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gallery_photos enable row level security;
create policy "public read gallery" on public.gallery_photos for select using (true);
create policy "admin write gallery" on public.gallery_photos for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "admin upload gallery" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_admin());
create policy "admin delete gallery" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and public.is_admin());

-- Admin-only functions: not callable while signed out (they also check is_admin() inside).
revoke execute on function public.admin_book_appointment(uuid[], timestamptz, text, text, text, text) from public, anon;
revoke execute on function public.import_clients(jsonb) from public, anon;
revoke execute on function public._appointment_client() from public, anon, authenticated;
