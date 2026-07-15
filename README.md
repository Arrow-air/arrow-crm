# arrow-crm

Member CRM for Arrow DAO onboarding — tracks new members, touchpoints, and
introductions so nobody falls through the cracks.

**Code is public. Member data is private** — it lives in Supabase behind Row
Level Security and never enters this repository.

## Stack

- **Frontend:** Vite + React (static SPA), deployed on Cloudflare Pages
- **Backend:** Supabase — Postgres, Row Level Security, Discord OAuth
- **Access (v1):** Discord sign-in + an `allowlist` table of Discord IDs.
  Hats/role-based access can replace the allowlist later without app changes.

## Local development

```sh
npm install
cp .env.example .env   # fill in from Supabase dashboard -> Project Settings -> API
npm run dev
```

The anon key in `.env` is public by design; RLS is the security boundary.
Never use the `service_role` key in this app.

## Supabase setup (once per project)

1. Create the project, then run `supabase/migrations/0001_init.sql` in the
   SQL editor (or `supabase db push` with the CLI).
2. Enable the Discord provider: Authentication → Providers → Discord, using
   the client ID/secret from the "Arrow CRM" app in the Discord developer
   portal. Whitelist the callback URL Supabase shows you.
3. Add users: insert their Discord IDs into `allowlist`
   (Table editor → allowlist). Signing in without an allowlist entry
   authenticates fine but RLS denies all data access.

## Deploy (Cloudflare Pages)

Connect the repo in the Cloudflare dashboard:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Every push to `main` deploys; every PR gets a preview URL.

## Schema (v1)

- `members` — discord_id, name, joined_at, status
  (`new → met → introduced → active`, or `faded`), met_by, projects, notes
- `touchpoints` — who talked to a member, when, about what
- `allowlist` — Discord IDs allowed to use the CRM

## Infra context

This repo is managed by [tf-github](https://github.com/Arrow-air/tf-github)
(GitOps: repo settings, teams, and branch protection are code). See the
Backbone infra track in Discord (#backbone-infra) for the wider plan.
