# Data Model

Inherited from Knovo's schema *shape* (multi-tenant-ready: workers never touch the DB; the
service-role key is server-only inside the governed API — so tenant isolation is enforceable at one
boundary). Content/molecular tables are dropped; coordination/ledger/memory tables are added.

## Core tables (P1–P2)

### tickets *(repurposed from Knovo `artifacts`)*
The unit of work. Keep zod for **shape only** (D-08), keep versioning/migrate-on-read discipline.
**As built (`0001_init`, P1.2):** columns below **except `tenant_id`**, which is **deferred to P5** (D-06
sequence wall — single-operator first; the discriminator + isolation-first test land with the second
principal, not now). Actor columns (`claimed_by`/`reviewed_by`/`last_worker`) are `text`
(`agent:<role>｜admin:<uid>`) — no `profiles`/auth FK until the HUD lands.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | **P5 (deferred, not in `0001`)** — add + backfill + RLS predicate when a second principal is in sight |
| slug | text UNIQUE | |
| title / summary | text | |
| status | enum | `draft｜planned｜claimed｜in_progress｜in_review｜changes_requested｜approved｜merged｜rejected｜archived` |
| schema_version | int | ticket-doc schema version |
| doc | jsonb | ticket body (zod shape-validated in the API) |
| repo / branch | text | target repo + `claude/<slug>` branch |
| pr_number | int | nullable; set when the PR opens |
| claimed_by | text | worker actor; supports round-robin/claim |
| merge_after | bool | the headline "…and merge when done" toggle (directive axis) |
| reviewed_by / reviewed_at | — | human approver |
| deleted_at | timestamptz | soft-delete |
| last_worker | text | last actor |
| created_at / updated_at | timestamptz | |

### upstream_refs *(repurposed from Knovo `sources` — provenance/dedup)*
Why a ticket exists; the dedup key so two workers don't draft the same ticket and a rejected request
isn't reopened.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| kind | enum | `client_request｜spec｜issue｜design_doc｜parent_ticket` |
| uid | text | stable id (issue #, doc id, request id) |
| url / title / detail | — | |
| | | **UNIQUE(kind, uid)** ← dedup key |

### ticket_upstream_refs — join *(role: `primary｜supporting`)*, like Knovo `artifact_sources`.

### directives *(Knovo `comments` verbatim shape)*
Two-axis human→agent instruction: `action` (what to do) × `merge_after` (publish-equivalent) + free
`note` + `options`. Actionable directives enter the agent queue; plain notes are a human record.

### clock_events — **the ledger** *(new; the moat substrate, P2)*
Append-only event stream; full column list + the three axes (clock / heartbeat / check) + the
clock-out honesty note in `memory-and-ledger.md`. Server-stamped `at`; spatial key `(repo, branch,
worktree)` extended by `scope` for resource events; `ref` = SHA/PR/run. `event_type ∈
clock_in|heartbeat|clock_out|check_out|check_in|blocked|handoff|plan_emitted`.

### resource_claims — **the spatial coordination plane** *(new; P2)*
Materialized current state projected from `check_*` events; powers conflict reporting + the assignment
gate. `(id, tenant_id, worker_id, run_id, repo, scope, scope_kind[file|glob|dir|module|ticket],
status[active|released|expired], claimed_at, released_at, heartbeat_at)`. Advisory presence; the
deterministic enforcement is the Supervisor's scope-aware dispatch (`coordination.md`); git is the
safety net. Stale claims (aged `heartbeat_at`) auto-expire.

### digital-footprint views — **the product face of the ledger** *(new; P2)*
DB views, not tables: `footprint_worker` (filter to one actor = its trajectory), `footprint_fleet`
(the live situational map), `footprint_space` (group by `(repo, scope)` = who touched/touches this).
Rendered by the HUD team calendar.

### routine_runs *(inherited verbatim — Knovo migration 0010)*
Correlates each dispatch to a Claude session deep link ("Open session" in the HUD).

### revisions / audit_log *(inherited verbatim)*
`revisions`: snapshot-before-write of the ticket doc (recoverability). `audit_log`:
`(actor, action, ticket_id?, detail jsonb, created_at)` on **every** API mutation
(`actor = agent:<role>｜admin:<uid>`).

## Memory tables (P3)

### facts — Semantic memory *(new)*
`(id, tenant_id, memory_type enum[core｜procedural｜semantic｜episodic], subject, body, embedding
vector, fts tsvector, ref text /* mandatory provenance: SHA｜PR｜run */, valid_from, valid_until,
superseded_by uuid FK, created_at)`. pgvector + FTS hybrid index. Core/Procedural live as **committed
Markdown** in the harness layer; only Semantic+Episodic are DB-backed (Episodic = `clock_events`).

## Status lifecycle (tickets)
```
draft → planned → claimed → in_progress → in_review ⇄ changes_requested → approved → merged
   └────────────── any ──────────────────────────────────────────────► archived (soft-hide)
 rejected (terminal; feeds upstream_ref dedup)      deleted_at (soft-delete, recoverable)
```
- Workers target only worker-reachable transitions via the API; the human owns `approved`/
  `changes_requested`/`rejected`. **`merged` requires the GitHub-native gate** (approval/`merge_after`
  + live CI-green + branch protection), not just a DB transition.

## Dedup
A helper view over `ticket_upstream_refs` exposes seen `(kind, uid)` (any ticket) and rejected
`(kind, uid)` (primary upstream of a `rejected` ticket) — the Planner checks before drafting, making
dedup a property of the data, not the routine's memory (Knovo's pattern).

## RLS / tenancy
RLS bounds browser/admin access; the **agent path is the API (service-role, bypasses RLS) — agent
governance is enforced in the API**, not RLS (Knovo's model). **As built (`0001`, P1.2):** RLS is
**enabled default-deny on every table with no policies yet** (secure baseline; the service-role API is
the only reader/writer). P1.3 authors the browser/admin **policies** when the HUD/auth exists.
Multi-tenant (P5): add `tenant_id NOT NULL` everywhere + per-policy tenant predicate; `is_admin()` →
`is_tenant_admin(tenant_id)`; per-`(tenant, role)` tokens; the **TenantA-cannot-read-TenantB isolation
test is written first** (D-06).

## Open questions
- ~~Ticket-doc schema shape (the `doc` jsonb) — define at P1.~~ **Resolved (P1.2):** `lib/ticket-schema.ts`
  v1 = `{schemaVersion, title, summary, goal, acceptanceCriteria[], context?, constraints?, plan?}`,
  `.strict()` (no-escape), versioned registry (migrate-on-read). Bump the version to add fields.
- Whether `clock_events` (P2) carries `tenant_id` from P2 (cheap) or at P5 — decide at P2. **Tickets et al.
  omit `tenant_id` for now** (deferred to P5 per D-06); reconcile the ledger's choice against that then.
- **P2 transition policy:** the exact role×status ownership + FROM-state guards + the reviewer-flag →
  `changes_requested` loop-back wiring (P1.2 baseline: worker-reachable = planned/claimed/in_progress/
  in_review/archived; `merged` is the GitHub-native gate; human owns approved/changes_requested/rejected).
