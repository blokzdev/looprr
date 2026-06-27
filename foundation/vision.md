# Vision

## What LoopRR is
LoopRR is **Project-Manager-as-a-Service for autonomous coding agents.** A human owner files work in
plain language; a coordinated team of Claude Code routine workers — Planner, Implementer, Reviewer,
and a Supervisor/Tech-Lead — runs the **Autonomous Ultracode Loop** (`docs/ultraloop.md`) across one
or more GitHub repos, opening and reviewing PRs, while **every action is recorded in a governed,
append-only temporal+spatial ledger** and nothing reaches a protected branch except through a
human-gated, GitHub-enforced merge.

The team members are **the user's own routines**, configured in their own Claude app (their account,
repos, identity). LoopRR is the **coordination, memory, and governance substrate** those routines
plug into — not a host that runs them. (Decision 1.)

## The wedge / the moat
A request → branch → PR → review → human-gated merge loop is **table stakes** — Devin, OpenHands, and
Copilot's agent already ship that shape. What a competitor cannot clone in a weekend is **a governed
ledger that accrues a team's entire coordinated work history with verifiable provenance** — a *flight
recorder and shared brain* for a fleet of coding agents:
- **Temporal+spatial awareness** — who did what, in which repo/branch/worktree, starting when, traced
  to which commit/PR/CI run. Workers and the human can see where everyone is and what they're up to.
- **Durable, cross-session, cross-repo memory** — playbooks, codebase facts, and decisions that
  outlive any one routine run, each carrying provenance back to the commit/PR it came from.
- **Honest Record-and-Replay** — capture a run so future work is refined, audited, and re-coordinated.

The bet: **coordination + memory + governance is the durable layer; the loop is the vehicle.** So we
**lead with the ledger** from the first loop phase, but build the expensive memory engine only once a
real workload exists to justify it (Decision 2).

## Who it serves
Solo developers and small teams who want a coordinated agent fleet they can trust and audit — starting
with the **owner themselves** (dogfood: point LoopRR at its own repo). Horizontal, not vertical: the
"niche" is whatever repo you point it at (Decision 7).

## Why now / why this is possible
- Claude Code routines can already be triggered by **API fire-URL, GitHub events, and cron**, and
  configured per-repo with env vars — so a user can compose a multi-repo loop today (the screenshots
  that seeded this project show exactly that setup surface).
- GitHub is a ready-made coordination bus (issues/PRs/comments/labels) and a lossless "page-store"
  (commits/diffs/CI logs) — the ground truth a memory engine should *reference*, not re-summarize.
- The governance spine that makes autonomous writes safe **already exists** in Knovo (governed API,
  verb-scoped tokens, audit/revisions/soft-delete) and is multi-tenant-ready — we pivot it, not
  rebuild it (`knovo-reuse.md`).
- The research literature (MIRIX, MAGMA, GAM, Mem0, SemaClaw) gives a proven vocabulary for the
  memory/ledger engine (`research/README.md`).

## What success looks like (horizon)
- **P2:** a single plain-language request reaches a *merged* PR through the governed loop, fully
  traced in the ledger, with a real (GitHub-enforced) human merge gate. *The loop has closed once.*
- **P3+:** workers recall durable facts across sessions with verifiable provenance; incidents are
  reconstructable from the ledger.
- **P5:** a second org runs its own fleet on LoopRR with proven tenant isolation.

## What LoopRR is NOT (at launch)
- **Not a hosted agent fleet** — it coordinates the user's own routines (Decision 1).
- **Not a code-correctness oracle** — correctness is CI/tests/human review, never schema validation.
- **Not a deterministic-replay debugger** — replay is reconstruct + plan-re-exec, not token-replay.
- **Not multi-tenant at MVP** — single-operator first; tenancy is deferred, not blocked (Decision 6).
- **Not a marketing claim ahead of a build** — cross-repo causal memory and inter-agent forum
  coordination are roadmap, not shipped pillars, until scoped.

## Open questions
Mirrored into `HUMAN.md` (Q-01…Q-03) and `ROADMAP.md` backlog. The load-bearing one: confirm the
Claude-Code routine platform facts the architecture rests on (no completion callback, single-account
identity + shared cap, best-effort webhooks).
