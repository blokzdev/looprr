# VERIFICATION.md — manual / device verification ledger

LoopRR has surfaces CI **cannot** exercise end-to-end: the Claude-Code routine setup (done in the
user's Claude app), live GitHub-event triggers, the real merge gate (branch protection), and the
cross-session/cross-environment behaviour of the ledger. This ledger records the **concrete manual
check** for each such surface so cloud sessions can trust work a local/human session verified.

Rules: a device/manual-only check **never blocks `[x]` on a green build**, but the concrete check is
recorded here in the same commit, and updated when the human reports a session. Each row: **what to
verify · how · last result · who/when**.

## Pending (defined now, exercised when the surface exists)
| Surface | Concrete check | Last result | When |
|---|---|---|---|
| Routine setup (BYO) | In the Claude app, create a routine: select target repo + the LoopRR env (`LOOPRR_API_BASE` + role token) + connectors + a trigger; confirm it fires and the worker pulls its work item from `/api/agent/queue`. | — | — |
| Fire-URL trigger | POST the routine's fire URL with a `text` nudge; confirm the worker **pulls** structured work and treats `text` as non-command. | — | — |
| GitHub-event trigger | Open/label an issue or PR on the target repo; confirm the right worker wakes (and that a *dropped* event self-heals via the ≥1h sweep). | — | — |
| Merge gate (real) | Attempt a routine-driven merge to a protected branch without approval/CI-green; confirm **GitHub** blocks it (not just the DB flag). | — | — |
| Ledger across sessions | Run two sessions (one cloud, one local) against one repo; confirm clock-in/status rows are server-stamped and the calendar shows "last seen" (not fabricated duration). | — | — |
| Cross-role denial (live) | With each role token, attempt an out-of-scope verb; confirm the API denies (complements the unit test). | — | — |

## Verified
| Surface | Concrete check | Last result | When |
|---|---|---|---|
| Schema `0001` on live Postgres | `apply_migration` to `looprr-dev` + `get_advisors(security)`. | ✅ Applied clean; advisors = only expected `rls_enabled_no_policy` INFO (no errors — no `rls_disabled_in_public`, no `security_definer_view`, no `function_search_path_mutable`). | Claude · 2026-07-16 |
| Governed-write DB layer (dev) | `execute_sql` replay of the route operations against `looprr-dev`. | ✅ create→link→revision→audit (FK-intact); `seen`/`rejected` dedup views correct; queue join returns actionable-only (plain note excluded); `UNIQUE(kind,uid)` rejects dup (23505); soft-delete removes from `seen` view; rejected ticket feeds `rejected` view; `set_updated_at` trigger fires. Dev truncated to pristine after. | Claude · 2026-07-16 |

## Pending (needs the service-role key in env — the Supabase MCP won't hand it out)
| Surface | Concrete check | Last result | When |
|---|---|---|---|
| Governed API E2E (routes) | `npm run test:integration` against `looprr-dev` (self-skipping suite in `test/integration/`) — drives the real route handlers (auth → validate → dedup → provenance → revision → audit → soft-delete + verb denials). | — (runs once `SUPABASE_SERVICE_ROLE_KEY` is set locally / in Vercel env — H-04) | — |
