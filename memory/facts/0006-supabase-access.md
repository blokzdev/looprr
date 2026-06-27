# 0006 — Supabase MCP access (build sessions) ✅ VERIFIED

Verified live 2026-06-27 via the Supabase MCP in this build session. **The fresh session can run
SQL + migrations directly — do NOT fall back to Knovo's manual dashboard-paste flow.**

## Capabilities (proven / available)
- `execute_sql` — runs raw SQL; confirmed as the **`postgres` superuser** (full DDL). Probe returned
  PG 17.6.
- `apply_migration` — named DDL migrations applied straight to the project.
- `create_project` — **cost is $0/month** in this org (confirmed via `get_cost`).
- Also: `generate_typescript_types`, `get_advisors` (security/RLS + perf lint), `list_tables`,
  `list_extensions`, `list_migrations`, `get_logs`, edge functions, Supabase branching.

## Account facts
- Org: **"Blokz Team"** — `vercel_icfg_P9mFE4fOK3UUxqgOstqZwYZh` (Vercel-managed).
- Existing projects (do **not** touch Knovo's data): `knovo-dev` (`hgsgnaeevqviwagepgsw`, ACTIVE),
  `knovo-prod` (`flltjufyzbxicnpqpuij`, ACTIVE), plus inactive `blokz`, `knovo-vector-storage`, `Dxtr`.
- **No LoopRR project exists yet** → create `looprr-dev` + `looprr-prod` (us-east-1, matching Knovo).

## The DB workflow (better than Knovo's manual flow)
1. Versioned `supabase/migrations/NNNN_*.sql` in the repo = source of truth (CI, history, isolation tests).
2. Apply each live via `apply_migration` to `looprr-dev` — no dashboard pasting.
3. `generate_typescript_types` → commit `lib/database.types.ts` in lockstep.
4. `get_advisors(security)` after each DDL change → catches missing RLS automatically.
5. **Prod is human-gated** (apply to `looprr-prod` deliberately, mirroring Knovo); dev flows freely.

## Caveat
The Supabase MCP is interactively authenticated — present in **build sessions**, may be **absent in
headless/cron** runs. So migrations must live in the repo + a deploy path; never make LoopRR's runtime
*depend* on the MCP. Secrets (service-role key, DB URL) go to Vercel/env, never the repo.
