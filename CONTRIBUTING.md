See [Contributing Guide](https://www.arrowair.com/docs/contributing/intro) on Arrow website.

## Repo-specific notes

### Getting started

```sh
npm install
cp .env.example .env   # values: Supabase dashboard -> Project Settings -> API
npm run dev
```

You also need your numeric GitHub ID in the `allowlist` table (ask in
#backbone-infra) — without it, sign-in works but every query is denied by
Row Level Security.

### Workflow

- Branch → PR → merge. `main` is protected; all changes go through PRs.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `docs:`, ...) — commitlint enforces this in CI.
- Every PR gets a **preview deploy** (link appears in the PR checks, under
  "Workers Builds"). Sign-in works on previews.
- CI also runs editorconfig, cspell, and markdown link checks. Unknown but
  legitimate words go in `.cspell.project-words.txt` (keep it sorted).

### The database is shared

There is one Supabase project and it is **production** — local dev and
preview deploys all talk to the same database as the live app. Member data
is real; don't create junk records you wouldn't want a teammate to see.
(If this ever gets painful we'll add a local Supabase stack via
`supabase start`.)

### Schema changes

- Never edit an existing file in `supabase/migrations/` — add a new one:
  `supabase/migrations/000N_short_name.sql` (next number, 4-space indent).
- Merging to `main` applies it to the database automatically (Deploy
  Migrations workflow). No SQL editor needed.
- RLS is the security boundary: every new table needs
  `enable row level security` plus policies gated on `public.is_crm_user()`.
  The anon key is public by design; nothing sensitive may rely on it.

### UI

v1 shipped deliberately bare — structure over style. Design direction is
open (that's the point).
