# 0004 — Research grounding (what to adopt) 🔵

Distilled from the five papers (`research/papers/`) via the Phase-0 memory-research agent + Claude's
read. Full notes: `research/notes/memory-architectures.md`. Design home: `memory-and-ledger.md`.

| Paper | Core idea | Adopt in LoopRR | Reject |
|---|---|---|---|
| **MIRIX** | 6 typed memories + multi-agent managers + meta-router | **4 dev-native types** (Core/Procedural/Semantic/Episodic) as a `memory_type` enum + a routing call | the 6-type taxonomy as-is; Knowledge Vault → use the secrets manager |
| **MAGMA** | orthogonal semantic/temporal/causal/entity graphs; policy-guided traversal; dual-stream write | the **dual-stream write path** (fast append / async consolidate); temporal backbone = the ledger + git DAG | the four-graph store + beam search (over-engineered for v1) |
| **GAM** | JIT/"deep-research": keep memory light + lossless-by-reference; researcher fetches at query time | **git/GitHub as the lossless page-store**; hybrid retrieval → dereference exact diff/log; never pre-compress | AOT pre-compression into lossy memory |
| **Mem0** | production memory: ADD/UPDATE/DELETE/NOOP; async; latency discipline | **soft-supersession** reconciliation; keep consolidation **off the clock-in critical path** (the Zep failure) | destructive UPDATE/row-drop |
| **SemaClaw** | harness engineering: DAG two-phase team orchestration; PermissionBridge; three-tier context; 4-layer plugins | **plan-then-execute DAG** = the Record half of Record-and-Replay; harness-first framing; permission gating | — |

Cross-cutting risks flagged by the papers (carried into design):
- **Async consolidation can hallucinate facts** a code-writing worker will act on → provenance on
  every fact, soft-supersession, a no-merge-power Librarian, conservative thresholds.
- **Shared cross-repo memory is a leakage vector** → scope rows by repo/tenant; cross-repo reads are
  explicit permissioned joins, not a global pool.

Honesty: none of the papers do deterministic execution capture — "Record-and-Replay" in LoopRR is
input-capture + DAG-plan re-exec, **never** bit-for-bit LLM replay (D-05).
