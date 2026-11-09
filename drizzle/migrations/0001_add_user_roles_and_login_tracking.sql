create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "users can read own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

alter table public.profiles
  add column email text,
  add column last_sign_in_at timestamp with time zone;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, last_sign_in_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, new.phone, 'Reader'), '@', 1)),
    coalesce(new.email, new.phone),
    new.last_sign_in_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.sync_profile_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = coalesce(new.email, new.phone),
      last_sign_in_at = new.last_sign_in_at
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_login
after insert or update of last_sign_in_at, email on auth.users
for each row execute function public.sync_profile_login();

update public.profiles p
set email = coalesce(u.email, u.phone),
    last_sign_in_at = u.last_sign_in_at
from auth.users u
where p.id = u.id;

create policy "admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));