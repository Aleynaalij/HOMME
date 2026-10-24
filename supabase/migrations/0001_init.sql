-- HOMME LLC booking schema
create extension if not exists pgcrypto;

-- ---------- settings ----------
create table public.settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'America/New_York',
  slot_step_min int not null default 15,
  min_lead_min int not null default 60,
  max_days_ahead int not null default 60,
  cancel_cutoff_min int not null default 120,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

-- ---------- admins ----------
create table public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- ---------- services ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  duration_min int not null check (duration_min > 0),
  price_is_starting boolean not null default false,
  is_addon boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- hours (0 = Sunday) ----------
create table public.business_hours (
  weekday int primary key check (weekday between 0 and 6),
  is_open boolean not null default false,
  open_time time,
  close_time time,
  check (not is_open or (open_time is not null and close_time is not null and close_time > open_time))
);

-- ---------- time off ----------
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  reason text,
  created_at timestamptz not null default now()
);

-- ---------- appointments ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  manage_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  services jsonb not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  notes text,
  amount_cents int not null,
  status text not null default 'confirmed'
    check (status in ('pending_payment','confirmed','completed','cancelled','no_show')),
  payment_method text not null default 'in_shop' check (payment_method in ('in_shop','card')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  stripe_session_id text,
  created_at timestamptz not null default now()
);
create index appointments_starts_at_idx on public.appointments (starts_at);

-- ---------- reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.settings enable row level security;
alter table public.admins enable row level security;
alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.reviews enable row level security;

create policy "public read settings" on public.settings for select using (true);
create policy "admin write settings" on public.settings for update using (public.is_admin()) with check (public.is_admin());

create policy "admin read admins" on public.admins for select using (public.is_admin());

create policy "public read active services" on public.services for select using (active or public.is_admin());
create policy "admin insert services" on public.services for insert with check (public.is_admin());
create policy "admin update services" on public.services for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete services" on public.services for delete using (public.is_admin());

create policy "public read hours" on public.business_hours for select using (true);
create policy "admin update hours" on public.business_hours for update using (public.is_admin()) with check (public.is_admin());

create policy "admin read time off" on public.time_off for select using (public.is_admin());
create policy "admin insert time off" on public.time_off for insert with check (public.is_admin());
create policy "admin delete time off" on public.time_off for delete using (public.is_admin());

create policy "admin read appointments" on public.appointments for select using (public.is_admin());
create policy "admin update appointments" on public.appointments for update using (public.is_admin()) with check (public.is_admin());

create policy "public read published reviews" on public.reviews for select using (published or public.is_admin());
create policy "admin update reviews" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy "admin delete reviews" on public.reviews for delete using (public.is_admin());

-- ---------- booking logic ----------
-- An appointment blocks time if it is confirmed/completed, or awaiting card payment for < 35 min.
create or replace function public._is_blocking(a public.appointments) returns boolean
language sql stable as $$
  select a.status in ('confirmed','completed')
      or (a.status = 'pending_payment' and a.created_at > now() - interval '35 minutes');
$$;

create or replace function public.get_available_slots(p_date date, p_duration_min int)
returns setof timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  s public.settings;
  h public.business_hours;
  day_open timestamptz;
  day_close timestamptz;
  slot timestamptz;
  slot_end timestamptz;
begin
  select * into s from public.settings where id = 1;
  if p_duration_min is null or p_duration_min <= 0 or p_duration_min > 480 then return; end if;
  if p_date < (now() at time zone s.timezone)::date
     or p_date > (now() at time zone s.timezone)::date + s.max_days_ahead then return; end if;

  select * into h from public.business_hours where weekday = extract(dow from p_date)::int;
  if not found or not h.is_open then return; end if;

  day_open := (p_date + h.open_time) at time zone s.timezone;
  day_close := (p_date + h.close_time) at time zone s.timezone;
  slot := day_open;
  while slot + make_interval(mins => p_duration_min) <= day_close loop
    slot_end := slot + make_interval(mins => p_duration_min);
    if slot >= now() + make_interval(mins => s.min_lead_min)
       and not exists (select 1 from public.appointments a
                       where public._is_blocking(a) and a.starts_at < slot_end and a.ends_at > slot)
       and not exists (select 1 from public.time_off t
                       where t.starts_at < slot_end and t.ends_at > slot) then
      return next slot;
    end if;
    slot := slot + make_interval(mins => s.slot_step_min);
  end loop;
end;
$$;

create or replace function public.book_appointment(
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text default null,
  p_payment_method text default 'in_shop'
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  s public.settings;
  v_services jsonb;
  v_duration int;
  v_amount int;
  v_count int;
  v_token text;
  v_local_date date;
begin
  select * into s from public.settings where id = 1;

  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'Name, email and phone are required';
  end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  if p_payment_method not in ('in_shop','card') then raise exception 'Invalid payment method'; end if;
  if length(p_name) > 120 or length(p_email) > 200 or length(p_phone) > 40 or length(coalesce(p_notes,'')) > 1000 then
    raise exception 'Input too long';
  end if;

  select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price_cents', price_cents,
                                      'duration_min', duration_min, 'price_is_starting', price_is_starting)
                   order by is_addon, sort_order),
         sum(duration_min), sum(price_cents), count(*)
    into v_services, v_duration, v_amount, v_count
    from public.services where id = any(p_service_ids) and active;

  if v_count is null or v_count = 0 or v_count <> cardinality(array(select distinct unnest(p_service_ids))) then
    raise exception 'Please choose valid services';
  end if;

  -- serialize bookings so two people can't grab the same slot
  perform pg_advisory_xact_lock(hashtext('homme_booking'));

  v_local_date := (p_starts_at at time zone s.timezone)::date;
  if not exists (select 1 from public.get_available_slots(v_local_date, v_duration) slot where slot = p_starts_at) then
    raise exception 'That time is no longer available. Please pick another slot.';
  end if;

  insert into public.appointments (services, starts_at, ends_at, customer_name, customer_email, customer_phone,
                                   notes, amount_cents, status, payment_method)
  values (v_services, p_starts_at, p_starts_at + make_interval(mins => v_duration), trim(p_name), lower(trim(p_email)),
          trim(p_phone), nullif(trim(coalesce(p_notes,'')), ''), v_amount,
          case when p_payment_method = 'card' then 'pending_payment' else 'confirmed' end, p_payment_method)
  returning manage_token into v_token;

  return v_token;
end;
$$;

create or replace function public.get_appointment_by_token(p_token text)
returns table (
  id uuid, services jsonb, starts_at timestamptz, ends_at timestamptz, customer_name text,
  amount_cents int, status text, payment_method text, payment_status text, can_cancel boolean, has_review boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.services, a.starts_at, a.ends_at, a.customer_name, a.amount_cents, a.status,
         a.payment_method, a.payment_status,
         a.status in ('confirmed','pending_payment')
           and a.starts_at > now() + make_interval(mins => (select cancel_cutoff_min from public.settings where id = 1)),
         exists (select 1 from public.reviews r where r.appointment_id = a.id)
  from public.appointments a where a.manage_token = p_token;
$$;

create or replace function public.cancel_appointment_by_token(p_token text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.appointments a set status = 'cancelled'
   where a.manage_token = p_token
     and a.status in ('confirmed','pending_payment')
     and a.starts_at > now() + make_interval(mins => (select cancel_cutoff_min from public.settings where id = 1))
  returning a.id into v_id;
  return v_id is not null;
end;
$$;

create or replace function public.submit_review(p_token text, p_rating int, p_body text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare a public.appointments;
begin
  select * into a from public.appointments where manage_token = p_token;
  if not found or a.status <> 'completed' then raise exception 'Reviews open after your appointment is completed'; end if;
  if exists (select 1 from public.reviews where appointment_id = a.id) then raise exception 'Review already submitted'; end if;
  if p_rating not between 1 and 5 then raise exception 'Invalid rating'; end if;
  insert into public.reviews (appointment_id, author_name, rating, body, published)
  values (a.id, a.customer_name, p_rating, nullif(trim(left(coalesce(p_body,''), 1000)), ''), false);
  return true;
end;
$$;

revoke all on function public._is_blocking(public.appointments) from public, anon, authenticated;
grant execute on function public.get_available_slots(date, int) to anon, authenticated;
grant execute on function public.book_appointment(uuid[], timestamptz, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_appointment_by_token(text) to anon, authenticated;
grant execute on function public.cancel_appointment_by_token(text) to anon, authenticated;
grant execute on function public.submit_review(text, int, text) to anon, authenticated;

alter function public._is_blocking(public.appointments) set search_path = public;
