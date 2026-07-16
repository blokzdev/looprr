# Research grounding — how the literature augments LoopRR's platform & moat

Five papers ground LoopRR's defensible core. The discipline (CLAUDE.md): **adopt the one primitive
that fits; reject the rest** — the papers over-build for chat assistants, whereas LoopRR's ground
truth already lives in git/GitHub. Raw notes: `research/notes/`; adopt/reject table:
`memory/facts/0004`. This doc is the **strategic map**: paper → LoopRR capability → moat contribution.

## The map

| Paper | Core idea | Where it lands in LoopRR | Moat contribution | What we reject |
|---|---|---|---|---|
| **MIRIX** | 6 typed memories + a meta-router + per-type memory-manager agents + active retrieval | The **typed memory** (Core/Procedural/Semantic/Episodic — 6→4 collapsed); the router tags each event/observation; the manager-agent → the **Librarian** consolidator (no merge power); active retrieval → pull-memory-on-session-start | The shared brain is **structured, not a flat log** — separating *what happened* (ledger) from *how we do X* (playbooks) from *what's true about repo Y* (facts) makes recall accurate over long horizons. A flat-store competitor can't match cross-session, cross-repo recall. | the 6-type taxonomy verbatim; Knowledge Vault (→ secrets manager) |
| **MAGMA** | orthogonal semantic/temporal/causal/entity graphs; policy-guided traversal; **dual-stream write** (fast append / async consolidate) | The **temporal+spatial ledger's** what·when·where + relations *model*; the **dual-stream write path** (clock-in = fast INSERT+enqueue; consolidation async) | The ledger captures temporal + causal + entity structure **while the hot path stays near-zero-latency** — the moat substrate is both rich *and* cheap. | the **four-orthogonal-graph storage** + beam search (over-engineered) — the temporal backbone is an ordered Postgres table + the git commit DAG; entity/causal = FKs + a join table until proven |
| **GAM** | JIT / "deep-research": keep memory **light + lossless-by-reference**; a runtime *researcher* plans→searches→integrates | **Record-and-Replay (the first R)** + retrieval: git/GitHub **is** GAM's lossless "page-store" (commits/diffs/PRs/CI logs); we index pointers (`ref`=SHA/PR/run) and dereference on demand; the "researcher" = the retrieval step | Memory is **cheap *and* lossless because git is the page-store** — GAM-quality retrieval with no storage tax; and **Record-and-Replay is grounded in a real technique** (record = page-store + captured inputs; replay = JIT-recompile context/plan) rather than a marketing promise | AOT pre-compression of diffs/logs into lossy memory |
| **Mem0** | production memory: **ADD/UPDATE/DELETE/NOOP** reconciliation; async; hard latency discipline; the Zep critique | The **fact-reconciliation engine** (P3) → soft-supersession (`valid_until`/`superseded_by`, never destructive); validates "consolidation **never** blocks clock-in" | The memory engine is **production-honest and auditable** ("what did we believe on date D") and **operable at scale**, not a research demo — the baseline that makes the moat real | destructive UPDATE / row-drop |
| **SemaClaw** | **harness engineering**; DAG two-phase plan-then-execute team orchestration; **PermissionBridge**; three-tier context; 4-layer plugins | The whole **harness/orchestration spine**; DAG plan-then-execute → the **Record** of RR *and* **Plan-Replay** (deterministic DAG re-exec); PermissionBridge → least-privilege **verb-scoping + the GitHub-native merge gate** (authorization at the boundary, not the prompt); three-tier context → Core(persona)/Procedural+Semantic(external)/working | **The harness *is* the differentiation** — SemaClaw's headline result: holding the model constant, better harness raised task completion **52.8%→66.5%**. LoopRR is a harness-engineering product; this is the academic validation that defensible value lives in the harness layer, not the model. Grounds **Plan-Replay** as a real technique. | — (adopt the architecture wholesale) |

## The "RR" framing, grounded
- **Round-Robin** — fair, scope-aware assignment across the fleet (the *assignment gate* + the
  Supervisor's dispatch; `coordination.md`). Classic scheduling, not a paper — the load-balancing
  layer over the ledger.
- **Record-and-Replay** — **Record** = the lossless page-store (GAM) + captured run inputs +
  the captured DAG plan (SemaClaw); **Replay** = two named modes — Audit/Reconstruct (JIT-recompile a
  past run's context, GAM) and Plan-Replay (deterministic re-exec of the captured DAG, SemaClaw).
  **Never** bit-for-bit LLM determinism (D-05).

## The compounded moat (why these stack)
None of the five was built for a multi-agent software team across GitHub repos; each contributes one
load-bearing primitive that **compounds** into the defensible asset: a **structured** (MIRIX) typed
memory, written on a **cheap, low-latency** (MAGMA) dual-stream path, kept **lossless-by-reference**
because git is the page-store (GAM), **reconciled and auditable** in production (Mem0), inside a
**harness that is itself the differentiation** (SemaClaw). The single substrate (Supabase/Postgres +
git/GitHub) keeps it cheap and tenant-isolatable; extensions (pgvector, Timescale, a graph store) are
pulled in *only as a real workload proves them*. That stack — not the request→PR→merge loop, which is
table stakes — is what a competitor cannot clone in a weekend.
