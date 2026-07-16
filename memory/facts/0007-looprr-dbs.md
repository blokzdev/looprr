# 0007 — LoopRR Supabase projects + schema `0001` ✅ VERIFIED

Provisioned 2026-07-16 via the Supabase MCP (build session). Grounds P1.2 and everything that talks
to the DB. Org: **Blokz Team** (`vercel_icfg_P9mFE4fOK3UUxqgOstqZwYZh`), region **us-east-1**, $0/mo.

## Projects
- **`looprr-dev`** — ref `ihqjffqwmzxweqeidybi` — URL `https://ihqjffqwmzxweqeidybi.supabase.co` — ACTIVE.
  The build/refinement sandbox; migrations flow freely here.
- **`looprr-prod`** — ref `dwniuzjlvhgjczlqpeud` — ACTIVE. **Human-gated**; the verified migration is
  applied here at PR-merge (the Co-Founder's standing OK: "push cleared/verified changes to prod when
  closing/merging PR" so the Vercel deploy uses prod from day one). PG version PG17.

## Free-tier constraint (learned the hard way)
Supabase caps a member at **2 ACTIVE free projects** per org. Creating `looprr-prod` failed until a
slot was freed. Resolution (Co-Founder authorized, 2026-07-16: "take down/delete the knovo databases —
the app is not live"): **paused `knovo-prod`** (`flltjufyzbxicnpqpuij`). `knovo-dev` was already
INACTIVE. Pause preserves data and is reversible; the MCP exposes `pause_project` but **no
`delete_project`** — full deletion is a dashboard action if ever wanted. `blokz`/`Dxtr` left untouched
(not Knovo). Active slots now: `looprr-dev` + `looprr-prod`.

## Schema `0001_init` (applied to dev; versioned at `supabase/migrations/0001_init.sql`)
Tables: `tickets`, `upstream_refs` (dedup `UNIQUE(kind,uid)`), `ticket_upstream_refs`, `directives`,
`revisions`, `audit_log` (with `run_id`), `routine_runs`. Views: `seen_upstream_keys`,
`rejected_upstream_keys` (`security_invoker`). Enums: `ticket_status`, `upstream_kind`,
`upstream_role`, `directive_action`, `directive_status`.
- **Knovo lessons baked in from the start** (their spine hit these operationally): `service_role`
  table grants up front (Knovo's 0009 "permission denied" bug); every function pins `search_path`
  (their 0002/0003 hardening); **RLS enabled default-deny on every table** at creation (P1.3 authors
  the actual browser/admin policies). `get_advisors(security)` came back with only the expected
  `rls_enabled_no_policy` INFO — no errors.
- **No `tenant_id`** anywhere yet (deferred to P5 per D-06). Types → `lib/database.types.ts`
  (regenerate + commit in lockstep after any DDL).

## Workflow (unchanged from 0006)
Versioned SQL in `supabase/migrations/` = source of truth → `apply_migration` to dev → regenerate
types → `get_advisors(security)` → prod at merge. Secrets (service-role key, DB URL) live in
Vercel/env, **never** the repo. The Supabase MCP exposes publishable/anon keys but **not** the
secret service-role key, so route-level E2E integration tests run only where that key is in env
(`test/integration/`, self-skipping) — the DB layer is otherwise verified via `execute_sql` replay.
