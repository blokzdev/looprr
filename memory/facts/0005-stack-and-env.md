# 0005 — Stack, env, and local-dev facts 🔵

## Stack (D-08, pending ratification)
Next.js (TS, App Router) + Tailwind + shadcn/ui · Supabase (Postgres/Auth/RLS) · Vercel · a GitHub
App (server-side token) for git mediation. Governed API at `/api/agent/*`. Inherited from Knovo.

## Env vars (canonical list lives in `.env.example` — keep in lockstep)
Server-only (LoopRR app, Vercel): `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_APP_ID`,
`GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `LOOPRR_API_BASE`.
Browser-safe: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Per-role agent tokens (live in the **user's** routine env, not the repo):
`LOOPRR_AGENT_TOKEN_PLANNER` / `_IMPLEMENTER` / `_REVIEWER` / `_SUPERVISOR`.
Rule: **zero secrets in the repo**; any new var lands in `.env.example` the same commit.

## Local dev (inherited Knovo gotchas — verify when the codebase exists)
- Supabase local stack via Docker; `supabase migration up`.
- New SQL functions need a PostgREST schema-cache reload before `.rpc()` resolves:
  `notify pgrst, 'reload schema';` (hosted reloads on migrate; local needs the notify or a
  `supabase_rest` restart).
- These are Knovo facts; re-confirm once LoopRR's codebase is seeded (D-09).

## Repos & branch
`/home/user/Knovo` (spine source) · `/home/user/looprr` (this). Work branch:
`claude/looprr-phase-0-setup-uh6h9h` (both repos, per the session setup).
