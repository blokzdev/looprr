# Memory & Ledger Engine

The defensible core. Grounded in the five research papers (`research/README.md`); the design choices
and their provenance are below. **System of record = Postgres + git/GitHub. Not a graph DB; not a
vector DB as source of record.**

## The ledger (ships in P2 — the moat substrate, cheapest possible)
An append-only temporal+spatial record of everything the fleet does. Every event carries the same
**what · when · where** triple, which is what lets the whole thing be queried as one *digital
footprint* (below). One append-only event table + one materialized current-state table.

```sql
clock_events(                            -- the immutable event stream (the truth)
  id              uuid pk,
  tenant_id       uuid,                  -- defaulted single-tenant until P5
  worker_id       text,                  -- planner|implementer|reviewer|supervisor|...   (WHAT: actor)
  run_id          uuid,                  -- correlates to routine_runs (Claude session deep link)
  event_type      enum(clock_in|heartbeat|clock_out|check_out|check_in|blocked|handoff|plan_emitted),
  summary         text,                  -- WHAT: human-readable
  details         jsonb,                 -- WHAT: structured payload
  repo            text,                  -- WHERE (spatial key = repo, branch, worktree)
  env             text,                  -- a tag
  branch          text,
  worktree        text,
  scope           text,                  -- WHERE (fine grain, for check_*): file | glob | dir | module | ticket
  scope_kind      text,
  at              timestamptz,           -- WHEN: SERVER-stamped UTC at the API write boundary
  ref             text                   -- SHA | PR# | run-id (lossless-by-reference)
)
```

### Three orthogonal axes (clock / heartbeat / check)
The session **clock** is the envelope; **heartbeats** pulse inside it; **checks** claim space inside
it. Same `what·when·where` on every axis; distinct event kinds.

| Axis | Question | Grain | Events |
|---|---|---|---|
| **Clock** (lifecycle) | Is W's session open? | session | `clock_in` / `clock_out` |
| **Heartbeat** (liveness) | Is W still alive? | periodic | `heartbeat` (optional progress in `summary`) |
| **Check** (resource presence) | What is W *touching*? | file/dir/module/ticket | `check_out` / `check_in` |

- **Clock-in is deterministic, not prompt-dependent:** the server creates it as a side-effect of the
  worker's **first authenticated call** (it must pull work on session start — D-09). The agent can't
  "forget" to clock in. Identity + `at` are server-stamped; the worker never supplies them.
- **Heartbeat is the substrate:** `clock_out` and stale-claim expiry are *derived from heartbeat
  cessation*. Self-reported `clock_out`/`check_in` are authoritative-when-present, else inference
  (honesty note below).
- **Spatial key `(repo, branch, worktree)` is first-class** + `scope` extends it to the resource
  grain — concurrent workers in one repo *and* one file are modelled now, not retrofitted.
- **Dual-stream write path** (MAGMA; the exact Zep failure Mem0 diagnoses): fast path =
  `INSERT + enqueue` only (pg-boss / Postgres `LISTEN/NOTIFY`) — **nothing else on the hot path**, so
  a routine firing never waits on memory reasoning. Slow path (P3) = the Librarian consolidating.

### Resource claims — the spatial coordination plane (our moat above git)
Git isolates at the **branch** level (the no-race boundary for *merge*), but has **no file-grained
"someone is editing this right now" awareness** for async agents. LoopRR adds that plane:

```sql
resource_claims(                         -- materialized current state, projected from check_* events
  id, tenant_id, worker_id, run_id,
  repo, scope, scope_kind,               -- WHERE (the claimed space)
  status   enum(active|released|expired),
  claimed_at, released_at, heartbeat_at  -- WHEN
)
```
- **Two honest enforcement tiers** (not a hard mutex — the API can't gate edits in the agent's
  sandbox): **(1) advisory presence** — `check_out` returns conflicts ("V holds `src/auth/**`"); and
  **(2) the deterministic *assignment gate*** — the Supervisor/queue never dispatches a ticket whose
  scope overlaps an `active` claim (`coordination.md`). Determinism lives in *assignment*, not worker
  goodwill — the same pattern as the merge gate (SemaClaw's PermissionBridge: authorization at the
  boundary, not the prompt).
- **Collaboration is opt-in:** a directive may permit a *co-claim* on a held scope (the gate then
  *allows* the overlap instead of blocking) — "unless intentionally coordinating" is first-class.
- **Stale claims auto-expire** when `heartbeat_at` ages past the window (the holder died).
- **Git is the safety net under both tiers:** even a missed claim collision is, at worst, a *merge
  conflict the Reviewer/Supervisor resolves* on separate branches — never a corrupted `main`. So
  resource-claims are an **optimization to avoid wasted work + ugly conflicts**, not a correctness
  mechanism. We market it as *coordinated awareness*, not "distributed file locking" (no overselling).

### Digital footprint
The **footprint** is the per-actor projection of the ledger — *queries, no special machinery*:
- `footprint(worker)` = filter `clock_events` to that worker = its trajectory through time + space.
- `footprint(fleet)` = the union = the live situational map ("who is where, doing what, now").
- `footprint(space)` = group by `(repo, scope)` = "who has touched / is touching this".
Surfaced as DB **views** (P2); the team calendar/HUD renders them. The footprint is the product-facing
face of the temporal+spatial ledger.

### Honesty note (D-04, load-bearing) — agent-driven + corroborated, not a platform callback
We do **not** depend on a platform run-completion webhook (likely none exists — at dispatch the
platform returns a session id/url only; Q-01a). The worker is *our own agent*, so completion is
signalled **in-band** and corroborated, with a four-tier reliability ladder:
1. **`clock_in` — authoritative + deterministic.** Server-stamped UTC, created as a side-effect of the
   worker's **first authenticated call** of the session (it must pull work on start — D-09); never
   prompt-dependent, identity/time never client-supplied.
2. **Heartbeats (`status`) — authoritative.** Server-stamped progress/liveness as it works.
3. **`clock_out` — self-reported, authoritative *when present*.** The worker's prompt makes
   `POST /api/agent/clock_out` its **last instruction**. Present ⇒ real end; use it.
4. **GitHub terminal artifact — strong corroborator.** For Implementer/Reviewer the run culminates in
   a push/PR; that webhook is a platform-delivered, near-authoritative end signal independent of
   self-report.
- **Only an abnormal end** (crash / daily-cap / kill → no clock_out *and* no artifact) falls back to a
  **stale-timeout → "last seen at T".** That — and only that — is inference.
- Therefore `duration` is **authoritative when both ends exist**, "last seen" only for a silently-died
  run; **never fabricated.** The calendar labels each row by its tier so inference never reads as fact.
- *(V2 hosted runtime owns the process → exit = an authoritative completion callback; no self-report,
  no inference. A reason V2 deepens the moat — DECISIONS "V2 north-star note".)*

## Four dev-native typed memories (MIRIX, collapsed 6→4)
A `memory_type` enum, **not** separate databases. The router (a single LLM call) tags each incoming
event with target type(s).
- **Core** — per-worker persona / standing instructions. **Committed Markdown** in the harness layer
  (git-native, diffable). Knovo's `AGENTS.md`/per-worker `CLAUDE.md` shape.
- **Procedural** — reusable playbooks (how-to-release, how-to-handle-CI-failure). **Committed Markdown.**
- **Semantic** — durable facts about codebases/APIs/architecture decisions/owners. **Postgres, P3+.**
  Every row carries **mandatory provenance** (`ref` = SHA/PR/run), `valid_from`/`valid_until`,
  `superseded_by` FK; pgvector + FTS hybrid index.
- **Episodic** — the **ledger** above (ships P2).

MIRIX's *Resource* type → a pointer into git/GitHub (never copy artifacts). MIRIX's *Knowledge Vault*
→ the existing secrets manager, **not** a memory table.

## Retrieval (GAM, P3) — light memory, lossless-by-reference
Never pre-compress diffs/logs into lossy memory (reject AOT compilation). Keep memos + stable refs; a
"researcher" step does **hybrid retrieval** (dense vector + **BM25/keyword as a first-class signal**
— code identifiers must exact-match — + direct-ID lookup), then **dereferences** the exact diff/log
via the GitHub MCP (`get_commit`, `get_file_contents`, `get_job_logs`, `pull_request_read`).
git/GitHub *is* GAM's lossless page-store, handed to us for free. Three-level degradation fallback:
Vector+FTS → FTS → keyword-scan.

## Fact reconciliation (Mem0, P3)
ADD / UPDATE / DELETE / NOOP with **soft-supersession** (`valid_until` + `superseded_by`, never a row
drop) so "what did we believe on date D" stays auditable. High-impact facts land in a **"facts
pending review"** surface. The **Librarian** (the consolidator) holds **no code/merge verbs**, so a
bad fact can never self-propagate into `main`. Async consolidation is gated behind conservative
thresholds; every fact keeps raw provenance so any claim is verifiable.

## Record-and-Replay (the RR) — two named modes, never bit-for-bit
- **Audit/Reconstruct** — capture per-run inputs (prompt, injected-memory snapshot, tool results,
  model+params, git SHAs, RNG seed *where the harness exposes it*) so a run is reconstructable.
  **Input-capture is a P2 convention** (near-zero cost); the replay *feature* is P4.
- **Plan-Replay** — deterministic re-execution of the captured DAG plan by a deterministic scheduler
  (SemaClaw's two-phase plan-then-execute). We **never** promise deterministic LLM token regeneration.
- Both modes carry documented non-guarantees in-product (D-05).

## Round-Robin (the other R)
Cyclic, fair work distribution across the team is a **scheduling concern over the ledger**: the
Supervisor/queue assigns claimable tickets round-robin across available workers, and the ledger's
`(worker, last_seen)` view informs load-balancing. Not a separate store.

## Storage substrate — one Postgres, extensions on proven demand
The ledger/footprint is **structured append-only event data → a textbook Postgres table**, not a
vector or graph problem. **System of record = Supabase/Postgres + git/GitHub.** Extensions are pulled
in *only as a real workload proves them* — never upfront (the moat thesis is "the ledger is cheap").

| Concern | Substrate | Note |
|---|---|---|
| Ledger / footprint / claims (what·when·where) | **Postgres** (`timestamptz`, `interval`/`tstzrange`, `repo/branch/worktree/scope`, `jsonb`, indexed) | exact/structured retrieval = SQL; temporal backbone = ordered table + git DAG |
| Timeseries scale | Postgres now; **TimescaleDB** (a PG *extension*) only on proven volume | stay in Supabase — hypertables/partitioning, not a new system |
| Semantic recall (P3) | **pgvector** (PG *extension*) + BM25/FTS hybrid | vectors only for the fuzzy *fact* layer; FTS/exact-match first-class for code identifiers |
| Relationships / graph | **FKs + a `relations` join table** | a graph DB only if cross-repo *causal* traversal is a proven need (backlog); per-repo causality = the git DAG |

One substrate also keeps **tenant isolation enforceable at one boundary** (governed API + RLS) — the
basis of the whitelabel multi-tenancy (D-06).

## What we explicitly reject for v1 (harvested to backlog)
MAGMA's four-orthogonal-graph storage + beam search (over-engineered — the ledger + git commit DAG is
the temporal graph); a graph DB as system of record (FKs + a `relations` join table until cross-repo
causal queries are a proven product need); TimescaleDB (until ledger volume justifies it).

## Honesty guardrails (don't oversell)
- **Cross-repo causal memory is NOT built** until a graph store exists; per-repo git DAG ≠ a
  cross-repo backbone. Until then, "cross-repo" means "two repos write one Postgres ledger."
- Consolidation can hallucinate facts that a code-writing worker would act on — hence provenance on
  every fact, soft-supersession over destructive update, and the no-merge-power Librarian.
