# 0002 — Knovo spine file facts ✅ VERIFIED

Verified by Claude reading `/home/user/Knovo` directly (2026-06-27). These ground the reuse map
(`foundation/knovo-reuse.md`) and the P1 re-point work.

- `lib/worker-auth.ts` — **73 lines**. Shape: `export type WorkerId = "scout"|"editor"|"keeper"`;
  `export type Verb = …`; `const VERBS: Record<WorkerId, ReadonlySet<Verb>>` (scout=`{dedup,create}`;
  editor adds `update/status/resolve/series/flag`; keeper=`{targets,update,status,flag}`); `tokenFor`
  + `Worker = { id, can(verb) }`. → re-typeable to LoopRR roles directly.
- `lib/worker-api.ts` — **133 lines**. The governed write helpers (validate/transition/audit/
  revisions/soft-delete).
- Migrations present: `0001_init` … `0004_editorial_workflow`, `0005_reader_engagement`,
  `0006_reader_hardening`, `0007_revoke_trigger_execute`, `0008_routine_settings`,
  `0009_service_role_core_grants`, `0010_routine_runs`, `0011_audience_views`.
- Worker API routes: `app/api/worker/{artifacts,comments,dedup,queue,review-targets,series}`.
- `lib/` also has: `artifact-schema.ts`, `routine-url.ts`, `routines.ts`, `worker-auth.test.ts`,
  `renderer/`, `audience/`, `reader/`, `admin/`, `supabase/`, `workers/`.
- Governance model (verified in docs + code shape): workers reach data **only** through the API with a
  per-worker bearer token; service-role key server-only inside the API; zod-validate before write;
  audit_log + revisions + soft-delete; publish/merge is human-directed.

Caveat: the docs state the governed loop is **Phase-1 code-complete but operationally unrun** even in
Knovo. P1 budgets to harden it.
