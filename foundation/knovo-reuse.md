# Knovo → LoopRR reuse / transform map

LoopRR is seeded from **Knovo's governance spine** and drops its content/molecular layer. Provenance:
the Phase-0 reuse-research agent + Claude's direct read of the Knovo code (`lib/worker-auth.ts` = 73
lines; `lib/worker-api.ts` = 133 lines; migrations `0001`–`0011`; `app/api/worker/{queue,artifacts,
comments,dedup,review-targets,series}`). **Caveat:** Knovo is **Phase-1 code-complete but
operationally unrun** even in its native domain — P1 budgets to harden the borrowed spine.

## TRANSFER as-is (the governance spine, re-pointed)
| Knovo asset | Becomes | Why |
|---|---|---|
| Governed API as sole DB write boundary (`app/api/worker/*`) | `/api/agent/*` | The single, proven write chokepoint. |
| Per-worker verb-scoped tokens (`lib/worker-auth.ts`, 73 ln, `WorkerId→Set<Verb>`) | `lib/agent-auth.ts` (`planner｜implementer｜reviewer｜supervisor`) | Genuinely re-pointable — verified. |
| `audit_log` + `revisions` (snapshot-before-write) + soft-delete (`lib/worker-api.ts`, 133 ln) | same | Recoverable, audited autonomy. |
| Directive-as-data queue (`/api/worker/queue`, two-axis `action × publish_after`) | agent task inbox (`action × merge_after`) | The human→agent control signal, verbatim shape. |
| `routine_runs` run-correlation (migration 0010, session deep link) | same | "Open the Claude session" behind any ledger row. |
| Admin control-HUD UX (`docs/admin-hud.md`) | LoopRR control HUD | Directive composer + board + status + audit. |
| `middleware.ts` host-routing | same | Multi-host / future per-tenant routing. |
| Multi-tenant-ready data-model shape (no tenant discriminator yet; service-role server-only) | same | Tenancy is one-boundary enforceable (D-06). |

## REPURPOSE
| Knovo | LoopRR | Note |
|---|---|---|
| `artifacts` | `tickets` | Keep zod for **shape only** (never a correctness gate — D-08). Keep versioning/migrate-on-read. |
| `sources` (provenance + dedup) | `upstream_refs` (`kind∈client_request｜spec｜issue｜design_doc｜parent_ticket`, `UNIQUE(kind,uid)`) | "Source-grounding" → "request-grounding"; dedup so two workers don't draft one ticket. |
| `publishAuthorized` (pure DB-status fn) | `mergeAuthorized` **as audit record** + a **new live-CI-green merge subsystem** | A correct merge gate is a *new build*, not a re-point (D-03). |
| provenance footer ("sources") | "this PR implements ticket T from request R" | |
| blog/`reader_comments` + admin `comments` | the **forum**: human→agent directive feed + audit (shipped); inter-agent threads (roadmap, don't claim) | `coordination.md`. |
| Worker-harness repo (constitution + per-worker `notes/`, "repo is read-only / workers never write") | harness layer with **feature branches replacing subfolder-scoping** | Branches are the no-race boundary now. |
| Scout / Editor / Keeper / Supervisor | Planner / Implementer / Reviewer / Supervisor(Tech-Lead) + Librarian | `worker-team.md`. |
| `artifact_views` (cookieless temporal measurement, migration 0011) | conceptual seed for the **ledger** | Different table; informs the privacy-first, server-stamped pattern. |

## DROP
- The **molecular/content kit**: `lib/renderer/selection.ts` PDB grammar, 3Dmol.js, the `molecular3d`
  stage, the explainer renderer + slot-schema *vocabulary* (keep only the versioning/migrate-on-read
  *discipline* for the ticket schema). GitHub/IDE is the render surface, not a custom renderer.
- **Science connectors** (bioRxiv / ChEMBL / PubMed / PDB) → GitHub / CI / (Slack / Linear later).
- **The narrow-niche invariant** (Knovo Decision 1 / CLAUDE.md #5) — **inverted** (D-07): horizontal,
  per-project niche.

## Knovo's frozen decisions we consciously change
- Knovo **Decision 1** (narrow niche) → **inverted** (LoopRR D-07).
- Knovo **Decisions 2/6** assumptions ("single-tenant", "workers don't push to the repo") → relaxed:
  feature-branch git writes via a GitHub App; tenancy is roadmap.
- Knovo **Decision 7** (no monetization) → LoopRR billing is P5 (separate high-risk PR).
These are recorded so the lineage is auditable; LoopRR's own `DECISIONS.md` governs from here.

## Seeding the codebase (D-09 — pending)
Options: **(A, recommended) port-selective** — copy the spine modules into this blank repo, rebrand,
drop the content kit, fresh history; **(B) git-fork-whole** Knovo then strip (carries history/CI);
**(C) clean-room** rebuild referencing Knovo. The `looprr` repo is currently blank → (A) gives a clean
start while keeping the proven spine. Await sign-off (HUMAN.md D-09).
