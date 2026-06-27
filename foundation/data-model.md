# Data Model

Inherited from Knovo's schema *shape* (multi-tenant-ready: workers never touch the DB; the
service-role key is server-only inside the governed API — so tenant isolation is enforceable at one
boundary). Content/molecular tables are dropped; coordination/ledger/memory tables are added.

## Core tables (P1–P2)

### tickets *(repurposed from Knovo `artifacts`)*
The unit of work. Keep zod for **shape only** (D-08), keep versioning/migrate-on-read discipline.
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid | defaulted single-tenant until P5 |
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
See `memory-and-ledger.md` for the full column list and the clock-out honesty note. Append-only;
server-stamped `started_at`; spatial key `(repo, branch, worktree)`; `ref` = SHA/PR/run.

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
governance is enforced in the API**, not RLS (Knovo's model). Multi-tenant (P5): add `tenant_id NOT
NULL` everywhere + per-policy tenant predicate; `is_admin()` → `is_tenant_admin(tenant_id)`; per-
`(tenant, role)` tokens; the **TenantA-cannot-read-TenantB isolation test is written first** (D-06).

## Open questions
- Ticket-doc schema shape (the `doc` jsonb) — define at P1.
- Whether `clock_events` carries `tenant_id` from P2 (cheap) or at P5 — currently include the column,
  defaulted, from P2.
