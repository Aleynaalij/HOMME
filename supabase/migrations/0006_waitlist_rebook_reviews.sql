-- Waitlist, rebooking reminders and review requests (all toggleable in the dashboard).

alter table public.settings
  add column rebook_reminder_days int not null default 14 check (rebook_reminder_days between 0 and 120),
  add column review_requests boolean not null default true,
  add column waitlist_enabled boolean not null default true;

alter table public.appointments add column review_requested_at timestamptz;
update public.appointments set review_requested_at = now() where status = 'completed';

alter table public.clients add column rebook_reminded_at timestamptz;

-- ---------- waitlist ----------
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  desired_date date,              -- null = any day
  service_names text,
  notes text,
  status text not null default 'active' check (status in ('active','booked','removed')),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index waitlist_active_idx on public.waitlist (desired_date) where status = 'active';
alter table public.waitlist enable row level security;
create policy "admin all waitlist" on public.waitlist for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.join_waitlist(
  p_name text, p_phone text, p_email text, p_date date, p_service_names text default null, p_notes text default null
) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare tz text;
begin
  if not (select waitlist_enabled from public.settings where id = 1) then raise exception 'The waitlist is closed right now'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Name is required'; end if;
  if public.normalize_phone(p_phone) is null and coalesce(trim(p_email), '') = '' then
    raise exception 'Add a phone number or email so we can reach you';
  end if;
  if p_email is not null and trim(p_email) <> '' and p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
  select timezone into tz from public.settings where id = 1;
  if p_date is not null and p_date < (now() at time zone tz)::date then raise exception 'Pick a future date'; end if;
  if length(p_name) > 120 or length(coalesce(p_notes, '')) > 500 or length(coalesce(p_service_names, '')) > 300 then raise exception 'Input too long'; end if;
  if exists (select 1 from public.waitlist w where w.status = 'active' and w.desired_date is not distinct from p_date
             and ((public.normalize_phone(p_phone) is not null and w.phone = public.normalize_phone(p_phone))
               or (nullif(lower(trim(p_email)), '') is not null and lower(w.email) = lower(trim(p_email))))) then
    return true;
  end if;
  insert into public.waitlist (name, phone, email, desired_date, service_names, notes)
  values (trim(p_name), public.normalize_phone(p_phone), nullif(lower(trim(p_email)), ''), p_date,
          nullif(trim(coalesce(p_service_names, '')), ''), nullif(trim(coalesce(p_notes, '')), ''));
  perform public.upsert_client(p_name, p_phone, p_email, 'booking');
  return true;
end;
$$;
grant execute on function public.join_waitlist(text, text, text, date, text, text) to anon, authenticated;

create or replace function public._expire_waitlist() returns void
language sql security definer set search_path = public as $$
  update public.waitlist set status = 'removed'
   where status = 'active' and desired_date < (now() at time zone (select timezone from public.settings where id = 1))::date;
$$;
revoke all on function public._expire_waitlist() from public, anon, authenticated;

-- When a slot opens: waitlisters for that day (or any day) with email, not notified in the last 6h.
create or replace function public.claim_waitlist_for_opening(p_secret text, p_token text)
returns table (name text, email text, opening timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare a public.appointments; tz text;
begin
  perform public._check_notify_secret(p_secret);
  perform public._expire_waitlist();
  select * into a from public.appointments where manage_token = p_token and status = 'cancelled';
  if not found or a.starts_at < now() then return; end if;
  select timezone into tz from public.settings where id = 1;
  return query
    update public.waitlist w set notified_at = now()
     where w.status = 'active' and w.email is not null
       and (w.desired_date is null or w.desired_date = (a.starts_at at time zone tz)::date)
       and (w.notified_at is null or w.notified_at < now() - interval '6 hours')
    returning w.name, w.email, a.starts_at;
end;
$$;

-- ---------- review requests ----------
create or replace function public.claim_review_request(p_secret text, p_token text)
returns table (manage_token text, customer_name text, customer_email text, services jsonb, starts_at timestamptz,
               ends_at timestamptz, amount_cents int, payment_status text)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public._check_notify_secret(p_secret);
  if not (select review_requests from public.settings where id = 1) then return; end if;
  return query
    update public.appointments a set review_requested_at = now()
     where a.manage_token = p_token and a.status = 'completed' and a.review_requested_at is null
       and coalesce(a.customer_email, '') <> ''
       and not exists (select 1 from public.reviews r where r.appointment_id = a.id)
    returning a.manage_token, a.customer_name, a.customer_email, a.services, a.starts_at, a.ends_at, a.amount_cents, a.payment_status;
end;
$$;

create or replace function public.claim_due_review_requests(p_secret text)
returns table (manage_token text, customer_name text, customer_email text, services jsonb, starts_at timestamptz,
               ends_at timestamptz, amount_cents int, payment_status text)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public._check_notify_secret(p_secret);
  if not (select review_requests from public.settings where id = 1) then return; end if;
  return query
    update public.appointments a set review_requested_at = now()
     where a.status = 'completed' and a.review_requested_at is null
       and a.starts_at > now() - interval '3 days'
       and coalesce(a.customer_email, '') <> ''
       and not exists (select 1 from public.reviews r where r.appointment_id = a.id)
    returning a.manage_token, a.customer_name, a.customer_email, a.services, a.starts_at, a.ends_at, a.amount_cents, a.payment_status;
end;
$$;

-- ---------- rebooking reminders ----------
create or replace function public.claim_rebook_reminders(p_secret text)
returns table (name text, email text, unsubscribe_token text, last_visit timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare n int;
begin
  perform public._check_notify_secret(p_secret);
  select rebook_reminder_days into n from public.settings where id = 1;
  if n = 0 then return; end if;
  return query
    with due as (
      select c.id, max(a.starts_at) filter (where a.status = 'completed') as lv
        from public.clients c join public.appointments a on a.client_id = c.id
       where c.email is not null and not c.email_opt_out
       group by c.id
      having max(a.starts_at) filter (where a.status = 'completed') between now() - make_interval(days => n + 14) and now() - make_interval(days => n)
         and not bool_or(a.status in ('confirmed','pending_payment') and a.starts_at > now())
    )
    update public.clients c set rebook_reminded_at = now()
      from due
     where c.id = due.id and (c.rebook_reminded_at is null or c.rebook_reminded_at < due.lv)
    returning c.name, c.email, c.unsubscribe_token, due.lv;
end;
$$;

revoke all on function public.claim_waitlist_for_opening(text, text) from public;
revoke all on function public.claim_review_request(text, text) from public;
revoke all on function public.claim_due_review_requests(text) from public;
revoke all on function public.claim_rebook_reminders(text) from public;
grant execute on function public.claim_waitlist_for_opening(text, text) to anon, authenticated;
grant execute on function public.claim_review_request(text, text) to anon, authenticated;
grant execute on function public.claim_due_review_requests(text) to anon, authenticated;
grant execute on function public.claim_rebook_reminders(text) to anon, authenticated;
