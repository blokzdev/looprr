# Technical Architecture

## Stack (inherited from Knovo's spine — D-08, pending ratification)
- **Web app + HUD:** Next.js (TS, App Router) + Tailwind + shadcn/ui.
- **Backend:** Supabase — Postgres, Auth (Google OAuth), Row-Level Security.
- **Hosting:** Vercel. Serves the HUD, the governed API, and short actions (well under function
  timeouts — all heavy/long work runs in the user's routines, off Vercel).
- **Git mediation:** a **GitHub App** (server-side token) brokers git writes from P2; routines never
  carry merge power.
- **Execution:** the **user's own Claude Code routines** (BYO, D-01) — LoopRR does not run them.

## The two governed write boundaries
```
   ┌─────────────────────────────┐  fire-URL (pull work) · GitHub event · cron
   │ USER'S CLAUDE CODE ROUTINES  │◄──────────────────────────────────────────────┐
   │ Planner · Implementer ·      │                                               │
   │ Reviewer · Supervisor        │   per-role verb-scoped bearer token            │
   └──────┬───────────────┬───────┘                                               │
          │ (1) DB writes  │ (2) git writes (claude/* branches only)              │
          ▼                ▼                                                       │
 ┌───────────────────┐   ┌──────────────────────────────────────────┐            │
 │ GOVERNED LoopRR    │   │ GitHub (the coordination bus + page-store)│            │
 │ API /api/agent/*   │   │ issues · PRs · comments · labels · checks │            │
 │ (service-role,     │   │ commits/diffs/CI logs (lossless ground    │            │
 │  server-only)      │   │ truth referenced by memory)               │            │
 │ zod(shape)·verb-   │   └────────────────┬─────────────────────────┘            │
 │ scope·audit·       │                    │ GitHub App token (server-side)        │
 │ revisions·         │   ┌────────────────▼─────────────────────────┐            │
 │ soft-delete·ledger │   │ MERGE GATE = GitHub branch protection +   │            │
 └───────┬────────────┘   │ required reviews (the REAL gate). DB      │  fires ────┘
         │                │ mergeAuthorized = audit record only.      │  routines
         ▼                └──────────────────────────────────────────┘  from the HUD
 ┌────────────────────────────────────────────┐
 │ Supabase: Postgres + Auth + RLS             │
 │ tickets · upstream_refs · directives ·      │
 │ clock_events(ledger) · facts(P3) ·          │
 │ revisions · audit_log · routine_runs        │
 └───────┬─────────────────────────────────────┘
         │ admin (server-side)
         ▼
 ┌──────────────────────────┐
 │ Next.js HUD on Vercel     │  directive composer · ticket board · PR/CI status ·
 │ (control HUD)             │  team calendar/ledger view · audit feed
 └──────────────────────────┘
```

**Boundary 1 — DB (the governed API).** The sole path to tickets, ledger rows, directives, and the
merge-authorization *record*. Per-role verb-scoped bearer tokens (`lib/agent-auth.ts`, re-typed from
Knovo's 73-line `lib/worker-auth.ts`); the service-role key is server-only inside the API; zod
validates **ticket shape only**; every mutation is audited + snapshotted; soft-delete only.

**Boundary 2 — git (GitHub-native).** The real merge gate is **GitHub branch protection + required
reviews**, because the GitHub MCP connector exposes `merge_pull_request`/`push_files`/
`create_or_update_file` as directly-callable write tools — a DB flag is bypassable. Routines push
`claude/*` branches only; `main` is protected. The DB `mergeAuthorized` is bookkeeping/the
human-directive record. **CI-green is read live at merge time** against the required-check set, never
a passed-in boolean. *P3 hardening:* a read-only GitHub MCP + a server-side git-write proxy holding
the GitHub App token, so routines carry no git write tools at all.

## Where work runs (and why timeouts are a non-issue)
Heavy/long work (planning, implementing, reviewing) runs in the user's routines, off Vercel. Vercel
serves only the HUD, the short governed-API request/response, and short admin actions.

## Event reliability
GitHub webhook delivery is **best-effort** (rate-capped; dropped over cap). Every reactive loop is
backstopped by a **≥1h reconciling heartbeat sweep** that re-derives PR/ticket state by polling, so
dropped events self-heal. Loop-back iterations (Reviewer↔Implementer) are capped with human
escalation — a livelock would starve the user's shared daily run cap.

## Multi-tenancy posture
Single-operator/single-repo through P4. Tenancy (P5) is ordinary app-DB tenancy (`tenant_id` + RLS)
— feasible now under BYO-routines (no Anthropic platform dependency), deferred only for sequencing.
The isolation test is written **first** when a second principal appears. (`data-model.md`, D-06.)

## Validation boundary
Ticket documents are zod-validated for **shape** at the API before write (and defensively on read).
This is *not* a correctness gate — code correctness is CI/tests/review (D-08).

## Open questions
- SSR vs ISR for HUD pages — start SSR; revisit on traffic.
- Whether the git-write proxy lands in P2 (with the merge gate) or P3 — currently P3; revisit if the
  connector-bypass risk proves acute earlier.
