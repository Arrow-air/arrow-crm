-- arrow-crm initial schema
-- Members, touchpoints, and the access allowlist.
-- Access model v1: any GitHub-authenticated user whose GitHub ID is in
-- `allowlist` can read/write everything. Hats/roles come later without
-- schema changes. Members are still keyed by Discord ID — login identity
-- (GitHub) and member-data identity (Discord) are deliberately separate.

create table public.members (
    id          uuid primary key default gen_random_uuid(),
    discord_id  text unique,
    name        text not null,
    joined_at   date not null default current_date,
    status      text not null default 'new'
                            check (status in ('new', 'met', 'introduced', 'active', 'faded')),
    met_by      text,
    projects    text[] not null default '{}',
    notes       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table public.touchpoints (
    id          uuid primary key default gen_random_uuid(),
    member_id   uuid not null references public.members (id) on delete cascade,
    by_name     text not null,
    note        text,
    created_at  timestamptz not null default now()
);

-- Who may use the CRM. Rows are managed via the Supabase dashboard (or a
-- future admin UI). Keyed on the numeric GitHub user ID (as text).
create table public.allowlist (
    github_id   text primary key,
    label       text,
    created_at  timestamptz not null default now()
);

alter table public.members     enable row level security;
alter table public.touchpoints enable row level security;
alter table public.allowlist   enable row level security;

-- True when the signed-in GitHub user is on the allowlist.
-- The numeric GitHub ID arrives in the JWT as user_metadata.provider_id.
create or replace function public.is_crm_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.allowlist
        where github_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
    );
$$;

create policy "crm users read members"    on public.members     for select using (public.is_crm_user());
create policy "crm users insert members"  on public.members     for insert with check (public.is_crm_user());
create policy "crm users update members"  on public.members     for update using (public.is_crm_user());
create policy "crm users delete members"  on public.members     for delete using (public.is_crm_user());

create policy "crm users read touchpoints"   on public.touchpoints for select using (public.is_crm_user());
create policy "crm users insert touchpoints" on public.touchpoints for insert with check (public.is_crm_user());
create policy "crm users delete touchpoints" on public.touchpoints for delete using (public.is_crm_user());

-- Allowlist is readable by CRM users, writable only via dashboard/service role.
create policy "crm users read allowlist" on public.allowlist for select using (public.is_crm_user());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger members_touch_updated_at
    before update on public.members
    for each row execute function public.touch_updated_at();
