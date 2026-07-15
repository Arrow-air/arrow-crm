# arrow-crm

Member CRM for Arrow DAO onboarding — tracks new members, touchpoints, and
introductions so nobody falls through the cracks.

**Code is public. Member data is private** — it lives in Supabase behind Row
Level Security and never enters this repository.

## Stack

- **Frontend:** Vite + React (static SPA), deployed on Cloudflare Pages
- **Backend:** Supabase — Postgres, Row Level Security, GitHub OAuth
- **Access (v1):** GitHub sign-in + an `allowlist` table of GitHub user IDs.
  Hats/role-based access can replace the allowlist later without app changes.
  Note: login identity is GitHub; member *data* stays keyed by Discord ID —
  the people being tracked are Discord community members.

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
2. Enable the GitHub provider: Authentication → Providers → GitHub, using
   the client ID/secret from a GitHub OAuth app (create it under the
   Arrow-air org: Settings → Developer settings → OAuth Apps). Set the
   authorization callback URL to the one Supabase shows you.
3. Add users: insert their numeric GitHub user IDs into `allowlist`
   (Table editor → allowlist). Find an ID at
   `https://api.github.com/users/<username>`. Signing in without an
   allowlist entry authenticates fine but RLS denies all data access.

## Deploy (Cloudflare Workers, static assets)

Connect the repo in the Cloudflare dashboard (Workers & Pages → import from
git). `wrangler.jsonc` tells the deploy step to publish `dist/` as a static
SPA — no server code runs on Cloudflare.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy` (the default)
- Build variables (Settings → Build → Variables): `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` — these are baked in at build time, so redeploy
  after changing them.

Every push to `main` deploys; every PR gets a preview URL. After the first
deploy, set the Supabase Auth Site URL / redirect URLs to the deployed URL,
or OAuth logins will bounce to localhost.

## Schema (v1)

- `members` — discord_id, name, joined_at, status
  (`new → met → introduced → active`, or `faded`), met_by, projects, notes
- `touchpoints` — who talked to a member, when, about what
- `allowlist` — GitHub user IDs allowed to use the CRM

## Infra context

This repo is managed by [tf-github](https://github.com/Arrow-air/tf-github)
(GitOps: repo settings, teams, and branch protection are code). See the
Backbone infra track in Discord (#backbone-infra) for the wider plan.
