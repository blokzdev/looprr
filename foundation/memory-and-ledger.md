# Memory & Ledger Engine

The defensible core. Grounded in the five research papers (`research/README.md`); the design choices
and their provenance are below. **System of record = Postgres + git/GitHub. Not a graph DB; not a
vector DB as source of record.**

## The ledger (ships in P2 — the moat substrate, cheapest possible)
An append-only temporal+spatial record of everything the fleet does. One table:

```sql
clock_events(
  id              uuid pk,
  tenant_id       uuid,                 -- defaulted single-tenant until P5
  worker_id       text,                 -- planner|implementer|reviewer|supervisor|...
  run_id          uuid,                 -- correlates to routine_runs (Claude session deep link)
  event_type      enum(clock_in|status|clock_out|blocked|handoff|plan_emitted),
  summary         text,
  details         jsonb,
  actor           text,
  repo            text,                 -- spatial key = (repo, branch, worktree)
  env             text,                 -- a tag
  branch          text,
  worktree        text,
  started_at      timestamptz,          -- SERVER-stamped UTC at the API write boundary
  duration        interval,             -- INFERRED, non-authoritative (see honesty note)
  ref             text                  -- SHA | PR# | run-id (lossless-by-reference)
)
```

- **Spatial key `(repo, branch, worktree)` is first-class** — concurrent workers in one repo are
  modelled now, not retrofitted.
- **Dual-stream write path** (MAGMA; the exact Zep failure Mem0 diagnoses): the fast path is
  `INSERT + enqueue` only (pg-boss / Postgres `LISTEN/NOTIFY`) — **nothing else on the clock-in
  critical path**, so a routine firing never waits on memory reasoning. The slow path (P3) is the
  Librarian consolidating.

### Honesty note (D-04, load-bearing) — agent-driven + corroborated, not a platform callback
We do **not** depend on a platform run-completion webhook (likely none exists — at dispatch the
platform returns a session id/url only; Q-01a). The worker is *our own agent*, so completion is
signalled **in-band** and corroborated, with a four-tier reliability ladder:
1. **`clock_in` — authoritative.** Server-stamped UTC when the worker first calls `/api/agent/clock_in`.
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

## What we explicitly reject for v1 (harvested to backlog)
MAGMA's four-orthogonal-graph storage + beam search (over-engineered — the ledger + git commit DAG is
the temporal graph); a graph DB as system of record (FKs + a `relations` join table until cross-repo
causal queries are a proven product need); TimescaleDB (until ledger volume justifies it).

## Honesty guardrails (don't oversell)
- **Cross-repo causal memory is NOT built** until a graph store exists; per-repo git DAG ≠ a
  cross-repo backbone. Until then, "cross-repo" means "two repos write one Postgres ledger."
- Consolidation can hallucinate facts that a code-writing worker would act on — hence provenance on
  every fact, soft-supersession over destructive update, and the no-merge-power Librarian.
