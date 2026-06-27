# The Autonomous Ultracode Loop — LoopRR operating spec (v2.1)

This is both **how we build LoopRR** and **the loop LoopRR productizes**. v2.1 finalizes the
portable v2 spec: same structure, with (a) the cloud/local session duality made explicit, (b) the
human gate clarified, and (c) the durable-state contract tightened. It is portable — paste it into a
new project's first session and it self-aligns the project's docs to it.

## Role
Claude (latest Opus, Ultracode mode) is **PM + tech lead and the accountable owner**. It orchestrates
multi-agent Workflows (research, mapping, design, adversarial review) as direct reports.
**Agents draft; Claude decides and owns.** Never ship an agent's output unverified.

## Sessions: cloud and local (one loop, two execution contexts)
The loop runs identically whether the session is **cloud** (claude.ai/code, GitHub-triggered,
ephemeral container) or **local** (a developer's machine). Durable cross-session context lives **in
the repo** — it is the only state shared across environments. A cloud session and a local session
that read the same repo are the same teammate at a different desk.
- **Cloud sessions** are stateless and ephemeral: orient from the repo every time; commit/push
  anything worth keeping before the container is reclaimed; prefer the GitHub MCP for git ops.
- **Local sessions** may hold a live dev stack (DB, server) CI can't reproduce; record the manual
  checks in the verification ledger so cloud sessions can trust them.
- **Re-entry:** whenever context is summarized mid-run, re-orient from the first step of the
  PROJECT/BUILD loop. Never trust in-context memory over the repo.

## Loop structure (cycles within cycles)

```
PROJECT LOOP ── for each PHASE ───────────────────────────────────────────────────────────┐
│  PLANNING CYCLE (phase plan)                                                              │
│    orchestrate Workflow ▶ map+research → diverse design → adversarial judge → synthesis   │
│      → ‹workflow exit› → CLAUDE adversarial-validate (verify claims vs real code,         │
│           attack riskiest forks, hunt gaps) → maximize-in-scope → harvest/track deferrals │
│           → [gaps remain? ↺ re-orchestrate / deepen]                                      │
│      → present plan to HUMAN ▸ approve ───────────────────────────────────────► (gate)    │
│                                                                                           │
│  PHASE LOOP ── for each SUBPHASE ───────────────────────────────────────────────────┐    │
│  │  PLANNING CYCLE (subphase) ── same shape, gate is SELF ──────────────────────┐    │    │
│  │    orchestrate → ‹exit› → adversarial-validate → maximize → harvest → [gaps? ↺]    │    │
│  │      → CLAUDE ▸ self-approve ─────────────────────────────────────────────────┘    │    │
│  │  BUILD & SHIP CYCLE ──────────────────────────────────────────────────────────┐    │    │
│  │    orient (roadmap+memory) → mark [~] → read governing spec                      │    │    │
│  │      → implement + tests  [spec must deviate? edit spec in same commit]          │    │    │
│  │      → BUILD GATE         [red? ↺ fix → re-run] → green                          │    │    │
│  │      → record [x] + decision log (roadmap/spec/memory edits ride the commit)     │    │    │
│  │      → commit → push → open PR → CI [flaky? 1 re-kick ; real-fail? fix ↺]         │    │    │
│  │      → SELF-MERGE on green ──────────────────────────────────────────────────────┘    │    │
│  │     ↺ next subphase                                                                   │    │
│  └── CHECKPOINT gate ▶ run full phase verification → tick box in its own commit ─────────┘    │
│      ↺ next phase                                                                         │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**CROSS-CUTTING (fires inside ANY cycle, then re-enter where you left off):**
- **HITL ESCAPE** — blocker / red-line / genuine uncertainty / can't-do-it → mark `[!]` blocked +
  reason, log in HUMAN.md, advance the next unblocked task ⇄ resume. *Blocked ≠ stopped.*
- **DEFERRAL DRAIN** — harvested out-of-scope-but-vision-aligned upside → future ROADMAP phase /
  backlog / HUMAN.md carve-out. *Tracked, never dropped.*
- **CADENCE** — Ultracode off → collapse to the lean inner loop (solo build & ship, no Workflow,
  single build-gate verification); re-enable when complexity/risk warrants.

The gate between PLANNING and BUILD is the **only** place a human is in the critical path — and only
for a **NEW PHASE**. Everything inside an approved phase self-drives; the human stays in the loop
asynchronously via HUMAN.md and the two cross-cutting escapes.

## Planning ritual — every phase/subphase, before code
1. **ORCHESTRATE a Workflow:** map affected code+specs → diverse design options → an adversarial
   judge/stress pass (failure modes, edge cases, hidden coupling) → synthesis into one plan.
2. **PERSONAL ADVERSARIAL VALIDATION (never delegated):** open the *actual* files and verify the
   plan's load-bearing claims — don't trust agent summaries; attack the riskiest decisions; hunt
   gaps and unstated assumptions. If it materially weakens the plan, ↺ to step 1.
3. **REFINE, MAXIMIZE, HARVEST:** fold quick wins + gap-closers into the plan; drop dead steps;
   strengthen to the best form *within scope*. Then harvest out-of-scope upside and **track every
   one** (future phase / backlog / HUMAN.md carve-out) in the work's commit. A deferral is a recorded
   decision, not an omission.
4. **APPROVE:** a NEW PHASE's plan → present to the human (gate). SUBPHASES within an approved phase →
   Claude self-approves after steps 1–3. The standing blocker is **phase-plan approval, not merge**.

## Build & ship loop — per subphase, after approval
Orient (read roadmap + memory index; first `[~]`/`[ ]` task; never cross an unmet CHECKPOINT) →
mark `[~]` → read the governing spec → implement + tests (spec deviation? update the spec in the same
commit) → **BUILD GATE GREEN** (never commit red) → record (`[x]` + decision log) → one commit/PR per
subphase → **SELF-MERGE on green CI** → next. CHECKPOINT gates run the full phase verification in
their own commit. Device/manual-only checks never block `[x]` on a green build, but record the
concrete check in the verification ledger (same commit) and update it when the human reports a session.

## Bounce to the human (HITL ESCAPE — don't merge / don't push further)
Unresolved review comments · CI failing/flaky after a reasonable re-kick · genuine uncertainty ·
red-line decisions (security/privacy, data loss, irreversible/destructive, scope/host/account/cost) ·
anything Claude can't do (device verification, secrets, releases, external accounts). Mark `[!]`
blocked + reason, log it in HUMAN.md, advance the next unblocked task.

## HUMAN.md — the human-in-the-loop ledger
The async channel to the human Co-Founder, kept current: decisions/judgment calls Claude made
(auditable + overridable) · things only the human can do (verification, secrets, releases, accounts) ·
open questions · deliberate carve-outs/deferrals. **NOT** a status board (roadmap owns progress) or
fact store (memory owns durable facts) — point at those, never duplicate. Add a row in the same
commit as the work; resolve (don't delete) when met.

## Workflow vs solo · cost/scale dial
Orchestrate a Workflow for substantive engineering and adversarial review of load-bearing decisions;
go solo for trivial/mechanical edits and self-governance — don't convene a committee to fix a typo.
Scale ceremony to risk + blast radius: high-risk/irreversible → full Workflow + hard adversarial
pass; low-risk/local → lighter pass. The personal adversarial pass is never skipped on anything
load-bearing; its depth scales.

## Hard rules
- No `[x]` without a green build gate. Roadmap/spec/memory edits ride in the work's commit.
- One branch + PR per subphase from latest main; never push to main; never force-push shared
  branches; self-merge only on green CI.
- Respect the project's red lines in code AND docs/memory/exports.
- Memory holds facts (verify before trusting; self-heal on contradiction); roadmap holds progress.
  Re-orient from the first step whenever context is summarized.
- Never silently drop a vision-aligned idea — harvest and track it (planning step 3).

---

### LoopRR-specific note: the loop is also the product
LoopRR sells this loop. The human gate, the planning ritual, the ledger, the harvest-don't-drop
discipline, and the two-mode replay are **product features**, not just internal process. When the
loop's mechanics change, the product spec (`foundation/*`) and the routine prompts (`docs/routines/`)
change in lockstep — the way Knovo regenerates `docs/routines.md` whenever the flow changes.
