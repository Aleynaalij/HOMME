-- Booking notifications: idempotent "claim" functions callable only by the app server (shared secret).
-- The secret lives in public.app_secrets (no RLS policies, so unreadable via the API) and must match
-- the CRON_SECRET env var in Vercel.
alter table public.settings add column notify_email text;

alter table public.appointments
  add column notified_booked_at timestamptz,
  add column notified_cancel_at timestamptz,
  add column reminder_sent_at timestamptz;

create table public.app_secrets (
  name text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
insert into public.app_secrets (name, value) values ('notify', encode(gen_random_bytes(24), 'hex'));

create or replace function public._check_notify_secret(p_secret text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_secret is null or not exists (select 1 from public.app_secrets where name = 'notify' and value = p_secret) then
    raise exception 'unauthorized';
  end if;
end;
$$;

-- Returns the appointment once per event (booked/cancelled), only when its status matches the event.
create or replace function public.claim_notification(p_secret text, p_token text, p_event text)
returns table (
  manage_token text, customer_name text, customer_email text, customer_phone text, notes text,
  services jsonb, starts_at timestamptz, ends_at timestamptz, amount_cents int,
  payment_method text, payment_status text, notify_email text
)
language plpgsql volatile security definer set search_path = public as $$
begin
  perform public._check_notify_secret(p_secret);
  if p_event = 'booked' then
    return query
      update public.appointments a set notified_booked_at = now()
       where a.manage_token = p_token and a.status = 'confirmed' and a.notified_booked_at is null
      returning a.manage_token, a.customer_name, a.customer_email, a.customer_phone, a.notes, a.services,
                a.starts_at, a.ends_at, a.amount_cents, a.payment_method, a.payment_status,
                (select s.notify_email from public.settings s where s.id = 1);
  elsif p_event = 'cancelled' then
    return query
      update public.appointments a set notified_cancel_at = now()
       where a.manage_token = p_token and a.status = 'cancelled' and a.notified_cancel_at is null
      returning a.manage_token, a.customer_name, a.customer_email, a.customer_phone, a.notes, a.services,
                a.starts_at, a.ends_at, a.amount_cents, a.payment_method, a.payment_status,
                (select s.notify_email from public.settings s where s.id = 1);
  else
    raise exception 'unknown event';
  end if;
end;
$$;

-- Confirmed appointments happening tomorrow (shop time) that haven't had a reminder yet.
create or replace function public.claim_due_reminders(p_secret text)
returns table (
  manage_token text, customer_name text, customer_email text, services jsonb,
  starts_at timestamptz, ends_at timestamptz, amount_cents int, payment_status text
)
language plpgsql volatile security definer set search_path = public as $$
declare tz text;
begin
  perform public._check_notify_secret(p_secret);
  select timezone into tz from public.settings where id = 1;
  return query
    update public.appointments a set reminder_sent_at = now()
     where a.status = 'confirmed' and a.reminder_sent_at is null
       and (a.starts_at at time zone tz)::date = (now() at time zone tz)::date + 1
    returning a.manage_token, a.customer_name, a.customer_email, a.services, a.starts_at, a.ends_at,
              a.amount_cents, a.payment_status;
end;
$$;

revoke all on function public._check_notify_secret(text) from public, anon, authenticated;
grant execute on function public.claim_notification(text, text, text) to anon, authenticated;
grant execute on function public.claim_due_reminders(text) to anon, authenticated;

-- Existing appointments predate notifications; don't email them retroactively.
update public.appointments set notified_booked_at = now() where notified_booked_at is null and status <> 'pending_payment';
update public.appointments set notified_cancel_at = now() where notified_cancel_at is null and status = 'cancelled';
