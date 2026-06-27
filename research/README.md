# Research — grounding reference

Permanent reference material for LoopRR, so the team incorporates the relevant innovations maximally.
**Read the distilled notes first; open the PDFs for depth.**

## Papers (`papers/`)
| File | Paper | Contributes |
|---|---|---|
| `MIRIX-2507.07957v1.pdf` | MIRIX: Multi-Agent Memory System | typed memory + routing (→ 4 dev-native types) |
| `MAGMA-2601.03236v2.pdf` | MAGMA: Multi-Graph Agentic Memory | temporal/causal/entity views; dual-stream write |
| `GAM-2511.18423v1.pdf` | General Agentic Memory (JIT/deep-research) | light memory + lossless page-store (= git) |
| `Mem0-2504.19413v1.pdf` | Mem0: Production-Ready Long-Term Memory | ADD/UPDATE/DELETE/NOOP; latency discipline |
| `SemaClaw-2604.11548v1.pdf` | SemaClaw: Harness Engineering | DAG team orchestration; permission gating; 3-tier context |

> `SemaClaw-*.pdf` is ~21 MB. If repo weight becomes a concern, move the PDFs to git-LFS (the distilled
> notes + the extracted text are enough for day-to-day grounding). Logged: HUMAN.md C-02.

## Distilled notes (`notes/`)
- `memory-architectures.md` — what to adopt/reject from each paper, mapped to LoopRR. (Mirrors
  `memory/facts/0004`.)

## Phase-0 conceptualization provenance (`synthesis/`)
- `phase0-synthesis-memo.md` — the synthesis lead's memo (anchor recommendation + roadmap skeleton).
- `designs-and-judges.json` — the 3 diverse designs + 3 adversarial-judge verdicts (raw).
- `research-briefs.json` — the memory / Knovo-reuse / platform research briefs (raw).
  *(The market-research brief failed its schema-retry cap and is absent — least-critical loss;
  competitive positioning is covered from Claude's own knowledge in `vision.md`.)*

## How to use this
When designing a memory/ledger/coordination feature, ground the choice in a specific paper finding and
cite it in the spec (as `memory-and-ledger.md` does). Don't import an architecture wholesale — adopt
the one primitive that fits and reject the rest (the papers over-build for chat; LoopRR's ground truth
already lives in git/GitHub).
