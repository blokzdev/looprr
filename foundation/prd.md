# PRD — LoopRR

Scope is **phased**; this PRD describes the product through P2 (the first closed loop) in detail and
sketches P3–P5. The roadmap (`ROADMAP.md`) owns sequencing and gates.

## Problem
Autonomous coding agents are improving fast, but running *several* of them as a coordinated team is
chaotic: no shared memory across runs/repos, no audit trail of who-did-what-when, no safe merge
boundary, and no way to refine the team from past runs. Single-agent tools (Devin, Copilot agent)
don't solve coordination, memory, or governance across a fleet.

## Solution
A coordination/memory/governance substrate that the user's own Claude Code routines plug into:
1. **A control HUD** where the human files plain-language directives and watches the team.
2. **A governed API** as the single DB write boundary (tickets, ledger, directives, merge record).
3. **A GitHub-native execution + merge gate** (branch protection; routines push `claude/*` only).
4. **An append-only temporal+spatial ledger** — the flight recorder and shared brain.
5. **Honest Record-and-Replay** over captured run inputs and DAG plans.

## Primary users & journeys
- **Owner / PM (human-in-the-loop).** Files a directive → watches the team in the HUD + ledger →
  reviews PRs → directs the merge. Async oversight via `HUMAN.md`-style decisions surfaced in-app.
- **The routine workers (the user's own agents).** Each pulls its work item from the governed API on
  session start, acts within its verb scope, writes to the ledger, and coordinates via GitHub.

## Core user stories (P1–P2)
- As the owner, I file "add rate-limiting to the API" as a directive; a **ticket** is created with
  `upstream_refs` to my request, deduped so two workers don't draft it twice.
- As the **Planner**, on my tick I pull the queue, ground the ticket, and emit a plan + sub-tickets.
- As the **Implementer**, I claim a ticket, work on a `claude/<ticket>` branch, push commits, open a
  PR — and **cannot** push to `main` (GitHub blocks it).
- As the **Reviewer**, on a PR event I run tests/read CI, and **flag** issues (default: flag, don't
  fix) back to the Implementer; the loop-back is capped with human escalation after N rounds.
- As the **owner**, I direct the merge; it is **impossible** unless (approved OR `merge_after`) AND
  CI is live-verified green AND branch protection is satisfied.
- As anyone on the team, I can see in the **ledger/calendar** who clocked in last, on which
  repo/branch, and what they reported — *"last seen", not fabricated "duration".*

## Key product surfaces
- **Control HUD** (repurposed Knovo admin HUD): directive composer (two-axis `action × merge_after`),
  ticket board, PR/CI status, the **team calendar/ledger view**, and the audit feed.
- **Governed API** (`/api/agent/*`): `queue`, `tickets`, `transition`, `ledger`, `merge-record`,
  `dedup`, role-scoped.
- **Routine prompts** (`docs/routines/`): canonical paste-ready blocks per role, regenerated whenever
  the schema/flow/connectors change (the Knovo routine-regeneration discipline).

## Non-goals (per phase) — see `vision.md` "What LoopRR is NOT"
Hosted fleet; correctness oracle; deterministic token replay; multi-tenancy at MVP; marketing ahead
of build.

## Requirements that are load-bearing (traceability to DECISIONS)
- Pull-on-session-start; fire-URL text untrusted (D-09 / inv. 4).
- Per-role verb-scoped tokens enforced in the API; trust-sized (inv. 3).
- GitHub-native merge gate; live CI-green at merge (D-03).
- Ledger clock-out inferred, non-authoritative (D-04).
- Replay = two named modes (D-05).
- zod = ticket shape only (D-08-frozen).

## Success metrics (per phase, from `ROADMAP.md` gates)
P2: one request → merged PR, fully traced, with a real merge gate. P3: durable fact recalled across
sessions with provenance. P5: TenantA-cannot-read-TenantB isolation test green in CI.

## Open questions
See `HUMAN.md` Q-01…Q-03.
