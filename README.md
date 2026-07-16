# LoopRR

**Project-Manager-as-a-Service for autonomous coding agents.** LoopRR coordinates a multi-agent
software-development "dream team" — Claude Code routine workers you configure in your own Claude
app — into a single structured, stateful loop across one or more GitHub repos, with a human in the
loop. Every action an agent takes is stamped into a governed, append-only **temporal+spatial ledger**
(who did what, in which repo/branch/worktree, when, traced to which commit/PR/CI run) — a flight
recorder and shared brain for your fleet — and nothing reaches a protected branch except through a
human-gated, GitHub-enforced merge.

The **RR**: **Round-Robin** (cyclic scheduling/load-balancing of work across the team) +
**Record-and-Replay** (capturing a run so future work can be refined, audited, and re-coordinated).

> **Status: Phase 0 — foundation.** This repo currently holds the harness, memory, specs, roadmap,
> and grounding research. No product code yet. See `ROADMAP.md` for the plan and `HUMAN.md` for the
> decisions awaiting sign-off.

## Where to start
- **Build protocol & invariants:** `CLAUDE.md`
- **The operating loop (and the product):** `docs/ultraloop.md`
- **What & why:** `foundation/vision.md`, `foundation/prd.md`
- **How:** `foundation/architecture.md`, `memory-and-ledger.md`, `coordination.md`, `worker-team.md`
- **Progress:** `ROADMAP.md` · **Human channel:** `HUMAN.md` · **Decisions:** `DECISIONS.md`
- **Grounding:** `research/README.md`

LoopRR is being built by pivoting the governed-API spine of **Knovo** (an AI-authored, human-gated
content engine). The reuse/transform map is in `foundation/knovo-reuse.md`.
