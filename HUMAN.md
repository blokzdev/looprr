# HUMAN.md — human-in-the-loop ledger

The async channel between Claude (PM + tech lead) and the human Co-Founder. **Not** a status board
(`ROADMAP.md` owns progress) or a fact store (`memory/` owns durable facts) — it points at those.
Rows are added in the same commit as the work and **resolved, not deleted**, when met.

Types: `DECISION` (Claude's call, overridable), `SIGN-OFF` (needs the human), `ONLY-HUMAN` (Claude
cannot do it), `CARVE-OUT` (deliberate deferral), `OPEN-Q`.

---

## Resolved sign-offs (2026-06-27 — Phase-0 gate passed)

| ID | Item | Resolution |
|---|---|---|
| D-01 | Architecture model | ✅ **Bring-your-own-routines** ("sophisticated BYOR"). Hosted multi-provider fleet harvested as **V2** (CARVE-OUT V2-01). |
| D-02 | Lead with the ledger; gate the fact-engine on N merged PRs | ✅ Ratified |
| D-03 | Merge gate is GitHub-native; CI-green live at merge | ✅ Ratified |
| D-04 | Clock-out inferred / "last seen" | ✅ Ratified |
| D-05 | Replay = two named modes | ✅ Ratified |
| D-06 | Multi-tenancy app-layer + deferred (whitelabel) | ✅ Ratified |
| D-07 | Invert narrow niche → horizontal | ✅ Ratified |
| D-08 | Inherit Knovo stack/spine | ✅ Ratified |
| D-09 | Codebase seeding | ✅ **Port-selective** + freedom to refine/expand; harvest out-of-scope to ROADMAP/backlog |

→ **P1 greenlit.** Build proceeds.

## Decisions Claude made (auditable, overridable)
| ID | Item | State | Note |
|---|---|---|---|
| C-01 | Multi-agent planning Workflow (11 agents) + personal adversarial validation for Phase-0. | DONE | `research/synthesis/`. |
| C-02 | Imported all 5 research PDFs (incl. 21 MB SemaClaw). | DONE | Move to git-LFS later if repo weight matters. |
| C-03 | Collapsed MIRIX 6 memory types → 4 dev-native. | DONE | `foundation/memory-and-ledger.md`. |
| C-04 | Phase 0 lands + P1 continues on the single session branch `claude/looprr-phase-0-setup-uh6h9h` (per the session's branch directive), rather than one-PR-per-subphase. | ~~ACTIVE~~ **SUPERSEDED** | 2026-07-16: merged PR #1 → `main`; now one-PR-per-subphase per the loop. |
| C-05 | **P1.2 build calls:** (a) **defer the Next.js framework/build** — routes are Next-App-Router-compatible handlers in `app/api/agent/*` but the framework/deploy pipeline waits for the HUD (no UI to deploy yet; Vercel + prod secrets are human-owned, H-02); (b) **defer `tenant_id`** to P5 (D-06); (c) **RLS enabled default-deny in `0001`** (policies in P1.3); (d) added verbs `pull_queue` (all roles) + `update_ticket` (planner); (e) P1.2 **transition-policy baseline** (worker targets = planned/claimed/in_progress/in_review/archived; `merged` = GitHub gate; human owns approved/changes_requested/rejected) — exact role×transition + loop-back wiring refined in P2. | ACTIVE | All overridable — say the word. `foundation/data-model.md` Open questions tracks the P2 refinements. |

## Carve-outs / deferrals (CARVE-OUT)
| ID | Item | Note |
|---|---|---|
| V2-01 | **Hosted, model/provider-agnostic execution fleet** (LoopRR runs the agents via e.g. Vercel AI SDK; Claude/GPT/Gemini/open). The V2 flagship moat — per-tenant identity+metering+billing, provider hedging, authoritative completion signal that upgrades the ledger/replay moat. | DECISIONS.md "V2 north-star note"; ROADMAP "Platform horizon V2". Gated on V1 demand. |

## Things only the human can do (ONLY-HUMAN)
| ID | Item | Note |
|---|---|---|
| H-01 | Provision a **GitHub App** (server-side token) + set branch protection on target repos. | Needed before P2 (the real merge gate). |
| H-02 | ~~Create the LoopRR Supabase projects~~ → **DONE (2026-07-16):** `looprr-dev` + `looprr-prod` created; `0001` applied to dev (prod at merge, your standing OK). Free-tier caps 2 active projects → **`knovo-prod` paused** (you authorized taking down the Knovo DBs; reversible, data preserved; MCP can't hard-delete — dashboard if you want that). Human **still owns**: the **Vercel project** + **production secrets** (service-role key, GitHub App key) in Vercel/env — needed before an actual deploy. | `memory/facts/0007`. Zero secrets in the repo. |
| H-04 | **Set the Vercel env for `looprr-prod`** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, agent tokens) when wiring the deploy — the service-role key is a secret the MCP won't hand out, so the route-level E2E test + the live app both need you to set it. | Unblocks `npm run test:integration` E2E + the Vercel deploy. |
| H-03 | Confirm the remaining platform fact (Q-01). | Narrowed below. |

## Open questions (OPEN-Q)
| ID | Item | Note |
|---|---|---|
| Q-01 | **Resolved the "single account" confusion:** under BYOR, each tenant's routines run in *their own* Claude account/cap — that **is** the whitelabel mechanism, not a LoopRR limit (the only implication is intra-tenant: one tenant's routines share that tenant's cap). **Still please confirm (firsthand):** (a) there is **no run-completion callback** (only a session id/url at dispatch) — drives D-04; (c) GitHub webhooks are best-effort/droppable; (d) the fire-URL accepts a free `text` payload. | (a) is the load-bearing one. If a completion callback *does* exist, D-04 changes (we could make clock-out authoritative even in V1). |
| Q-02 | "Calendar-driven meta-coordination" — Google Calendar/OKR as a *surface* over the ledger, or a system of record? | Scoped as a ledger projection (backlog), not a source of truth. Confirm. |
| Q-03 | Role naming — Planner/Implementer/Reviewer/Supervisor(Tech-Lead)/Librarian. | `foundation/worker-team.md`. Easily renamed. |
