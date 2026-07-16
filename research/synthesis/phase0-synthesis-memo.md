The verdicts confirm the codebase facts I need (73-line auth, 133-line api, single-tenant, Phase 1 code-complete). I have everything required to write the synthesis memo. The three verdicts converge strongly and add a critical platform-reality layer (verdict 2) that constrains the architecture. Let me write the memo directly as my final output.

---

# LoopRR Phase-0 Synthesis Memo — Recommended Conceptualization & Roadmap

**From:** Synthesis Lead
**To:** Human Co-Founder (the gate)
**Date:** 2026-06-27
**Status:** Decision-ready. Needs sign-off on the 9 DECISIONS in §8 before any code moves.

---

## 0. How I read the three judges

The three verdicts converge hard, and that convergence is the spine of this memo:

- **Judge A (vision/moat lens):** strongest design = *memory-moat-first* on thesis, but its build order is inverted — it builds the durable-fact engine before the loop proves it needs one.
- **Judge B (platform-reality lens):** strongest design = *lean-loop-first*, and lands the most important new facts in the whole packet: the platform **cannot** support multi-tenant routines, has **no completion callback**, and the GitHub connector **exposes `merge_pull_request`/`push_files` as directly-callable write tools** — so a DB-side merge gate is necessary but *not sufficient*.
- **Judge C (scope/sequencing lens):** strongest design = *lean-loop-first*; multi-tenancy-first is "the canonical inversion"; the Supervisor and the CI-green gate are under-priced new builds, not re-points.

**The committed call:** Anchor **lean-loop-first's phase discipline**, carry **memory-moat-first's strategic thesis** (the ledger *is* the moat, declared from day one, built as a thin substrate immediately and an engine only on proven demand), graft **platform-first's onboarding wedge** as a *later* GTM phase, and obey **Judge B's platform constraints as hard architecture**, not footnotes. Two judges name lean-loop as strongest; the third concedes its thesis is right but its *moat timing* must be fixed — so we lead with the ledger from P1 instead of deferring it to "Phase 2 afterthought." This is the one place all three want a correction to lean-loop, and we apply it.

---

## 1. Product thesis + what LoopRR is

**Thesis.** The defensible asset is a **governed, append-only temporal+spatial ledger of everything an agent fleet did — a flight recorder + shared brain for coding agents — with honest, two-mode replay.** Governance and a request→PR→merge loop are table stakes (Devin/OpenHands/Copilot Workspace already ship that shape); what a competitor cannot clone in a weekend is a ledger that *accrues a tenant's entire coordinated work history with verifiable provenance*. So we **lead with the ledger as the product's spine from P1**, but we **build the loop first and the durable-fact engine only after the loop has closed N times** — the moat substrate is cheap (one append-only Postgres table) and ships immediately; the expensive consolidation engine waits for a workload to justify it.

**What LoopRR is (one paragraph).** LoopRR is a Claude-Code dev pod you point at one GitHub repo: a human owner files work as a plain-language directive in a control HUD (Knovo's admin HUD, repurposed), and three routine workers — **Planner, Implementer, Reviewer** — run as stateless ticks that plan a ticket, implement it on a feature branch, open a PR, and review it, while **every action is server-stamped into an append-only temporal+spatial ledger** ("who did what, in which repo/branch/worktree, starting when, traced to which SHA/PR/run"). Nothing reaches `main` except through a human-gated merge that is enforced by **GitHub branch protection** (the real gate) and *audited* by the governed LoopRR API. Over time the ledger becomes the team's queryable memory and flight recorder; durable cross-session facts, two-mode replay, the team-builder onboarding, and multi-tenancy are sequenced *after* the single-tenant loop is proven in production — never before.

---

## 2. Worker roster — triggers + verb scopes

Per-worker, verb-scoped bearer tokens, enforced **in the API** (`lib/worker-auth.ts` `WorkerId→Set<Verb>` map, re-typed). Trust-sized: the role that ingests the most untrusted text gets the smallest verb set. **Hard rule (Judge B):** the routine **pulls** its structured work item from the governed API on session start; the fire-URL text payload is treated as *untrusted opaque nudge text*, never parsed as a command.

| Role | Knovo origin | Triggers | Verb scope | Phase |
|---|---|---|---|---|
| **Planner** | Scout (lowest trust) | fire-URL (HUD directive filed) + cron heartbeat (≥1h liveness) | `dedup, create_ticket, comment` | P1 |
| **Implementer** | Editor (largest write) | fire-URL (claimable ticket / reviewer loop-back) + GitHub issue/PR event | `claim, push_commit (own claude/* branch only), open_pr, comment, transition_status` | P1 |
| **Reviewer** | Keeper (flag-not-fix) | GitHub PR opened/updated event + cron sweep for stuck PRs | `review_targets, run_tests, read_ci, flag, comment, transition_status` | P1 |
| **Supervisor / Tech-Lead** | Supervisor (promoted to first-class) | GitHub push on harness + fire-URL | `sequence, reconcile_harness, request_review, merge (gated), deploy (gated)` | **P1 (minimal)** |
| **Librarian / Consolidator** | new, engine-native | cron + queue-drain | `read_ledger, propose_fact, supersede_fact` — **zero code/merge power** | P2 |

**Two corrections the judges force:**

1. **Supervisor is in P1, minimal, not P2.** Judge C is right: you cannot claim "feature branch is the no-race boundary" while deferring the only actor that reconciles concurrent work. Scope it to the floor: single-writer merge actor + `git pull --rebase` before any shared-layer write. Nothing more. The human is still the merge *approver*; the Supervisor is the merge *executor* behind the gate.
2. **Librarian (Judge A's sharpest idea) is kept exactly — a role with no code and no merge verbs that only writes Semantic memory.** It is the clean answer to "how do you have a fact store that can't poison your codebase." But it lands in **P2**, gated on the loop having produced merged PRs to consolidate from. Building a consolidator before any facts exist is infrastructure for a user that doesn't exist (Judge A + C fatal flaw on memory-moat).

`merge`/`deploy` are the new "publish" verbs — always behind the human gate.

---

## 3. Coordination model — GitHub bus + forum/ledger

**Two governed write boundaries, one audit trail.**

**(1) DB boundary** — the governed LoopRR API (`app/api/worker/*` → `/api/agent/*`, service-role key server-only) is the sole path for tickets, ledger rows, directives, and the *merge-authorization record*. Agents hold per-role verb-scoped bearer tokens; the API is the serialization point.

**(2) Git boundary** — and here the packet had it wrong. **The DB-side `mergeAuthorized` is NOT the enforceable gate** (Judge B, fatal-for-all-three): the GitHub MCP connector exposes `merge_pull_request`, `push_files`, `create_or_update_file` as directly-callable write tools with no per-action prompt, so a prompt-injected or over-eager routine can merge `main` directly, bypassing any DB check. **The enforceable gate is GitHub-native:**
- **GitHub branch protection + required reviews** on `main` is the real merge gate.
- **Disable "allow unrestricted branch pushes"** so routines can only push `claude/*` branches.
- DB-side `mergeAuthorized` is reframed as **bookkeeping/audit + the human-directive record**, not enforcement.
- **P2 hardening:** build a **read-only GitHub MCP** and proxy *all* git mutations through the LoopRR API holding a server-side GitHub App token, so the routine never carries write tools at all. This is a first-class build, budgeted as such.

**Work-assignment bus.** Human files a directive (two-axis: `action × merge_after`); workers **pull** `/api/agent/queue` on each tick. Pull-on-session-start is a hard invariant (the fire-URL text is an injection channel, not RPC).

**State/coordination bus.** GitHub is the coordination bus: feature branches are the no-race boundary (PRs, not paths); the git commit DAG is the per-repo temporal backbone; PR state is the work-item state machine. `routine_runs` correlates each dispatch to a Claude session deep link.

**Event reliability (Judge B).** GitHub webhook events are rate-capped during the research preview and **silently dropped** over cap. So event-driven coordination is **best-effort, not reliable delivery**. Every reactive loop is backstopped by a **≥1h reconciling heartbeat sweep that re-derives PR/ticket state from polling**, so dropped events self-heal. Loop-back iterations are capped with human escalation after N rounds (runaway-cost control — shared daily account cap means a Reviewer↔Implementer livelock starves *all* routines).

**Forum/ledger.** The directive-comment system is the human→agent inbox and the audit feed. **Honesty note:** "forum-as-inter-agent-coordination" (agents negotiating/escalating through structured threads) is **NOT built in Phase 0** — it is roadmap, not a shipped pillar. Inter-agent handoff is async via the ledger + GitHub events. We will not market it as built until it is scoped.

---

## 4. Memory / temporal-spatial engine — concrete substrate

**System of record = Postgres + git/GitHub. Not a graph DB, not a vector DB as source of record.** (All three designs and the memory packet agree; reject Zep-style and MAGMA's four-graph design for v1.)

**The ledger (ships P1 — the moat substrate, cheapest possible):**

```sql
clock_events(
  id, tenant_id /* defaulted single-tenant until P4 */,
  worker_id, run_id,
  event_type ENUM(clock_in|status|clock_out|blocked|handoff|plan_emitted),
  summary, details jsonb, actor,
  repo, env, branch, worktree,          -- spatial key = (repo, branch, worktree)
  started_at timestamptz,               -- server-stamped UTC at the API write boundary
  duration interval,                    -- see honesty note below
  ref                                   -- SHA | PR# | run-id (lossless-by-reference)
)
```

- **Spatial-key cardinality decision (resolves an open question):** `(repo, branch, worktree)` is **first-class**, so multiple concurrent workers in one repo are modeled now, not retrofitted. `env` is a tag.
- **Dual-stream write path:** fast path = `INSERT + enqueue` only (pg-boss / Postgres `LISTEN/NOTIFY`); **nothing else on the clock-in critical path** (the exact Zep failure Mem0 diagnoses). Slow path (P2) = the Librarian consolidates.

**Ledger honesty correction (Judge B, fatal-for-memory-moat-as-written):** the platform has **no completion callback** — only a session id/url at dispatch. Therefore server-side `clock_out` and server-derived `duration` are **impossible from authoritative signals**. We do **not** trust worker-self-reported clocks (the thing we swore off). So:
- **`clock_in` and mid-run `status` are authoritative** (server-stamped when the routine calls the API).
- **`clock_out` is inferred** (last-heartbeat + stale-timeout, or derived from the terminal GitHub artifact — PR opened/updated), **explicitly marked non-authoritative.**
- The team-calendar surfaces **"last seen," not "duration worked."** This pre-empts the moat's integrity flaw honestly.

**Four dev-native typed memories** (MIRIX collapsed to four; a `memory_type` enum, not separate DBs):
- **Core** (per-worker persona/standing instructions) — committed Markdown in the harness repo (git-native, diffable).
- **Procedural** (playbooks) — committed Markdown.
- **Semantic** (durable codebase/API/decision facts) — **Postgres, P2+**, every row carries mandatory provenance (`ref` = SHA/PR/run), `valid_from`/`valid_until`, `superseded_by` FK; pgvector + FTS hybrid index.
- **Episodic** — the ledger above (ships P1).

**Retrieval (GAM, P2):** keep memory light, lossless-by-reference. Memos + stable refs; a "researcher" step does hybrid retrieval (vector + BM25/keyword first-class for code identifiers + direct-ID lookup) then dereferences the exact diff/log via GitHub MCP (`get_commit`, `get_file_contents`, `get_job_logs`, `pull_request_read`) — git/GitHub *is* GAM's lossless page-store, handed to us free. Three-level degradation fallback (Vector+FTS → FTS → keyword-scan). **Never pre-compress diffs/logs into lossy memory** (reject AOT).

**Fact reconciliation (Mem0, P2):** ADD/UPDATE/DELETE/NOOP with **soft-supersession** (`valid_until` + `superseded_by`, never row drop) so "what did we believe on date D" is auditable. High-impact facts land in a **"facts pending review"** surface; the Librarian holds no merge power, so a bad fact cannot self-propagate to `main`.

**Record-and-Replay — two named modes from day one, never bit-for-bit:**
- **Audit/Reconstruct** — capture per-run inputs (prompt, injected-memory snapshot, tool results, model+params, git SHAs, RNG seed *where the harness exposes it*) so a run is reconstructable. **Input-capture is a P1 convention** (near-zero cost); the replay *feature* is P3.
- **Plan-Replay** — deterministic re-execution of the captured DAG plan by a deterministic scheduler. We **never** promise deterministic LLM token regeneration. Both modes documented as non-guarantees in-product.

---

## 5. Knovo reuse / transform decision

**TRANSFER AS-IS (the governance spine, re-pointed):** governed API as sole *DB* write boundary; per-worker verb-scoped tokens (`lib/worker-auth.ts`, 73 lines — genuinely re-pointable); `audit_log` + `revisions` (snapshot-before-write) + soft-delete (`lib/worker-api.ts`, 133 lines); the directive-as-data queue (`/api/worker/queue` shape verbatim = agent task inbox); `routine_runs` run-correlation (migration 0010, "Open session" deep link); the admin control-HUD UX (`docs/admin-hud.md`); middleware host-routing.

**REPURPOSE:** `artifact → ticket` (keep zod for ticket **shape only** — never as a correctness gate; code correctness is CI/tests/review, a probabilistic multi-signal gate, not a 422). `publishAuthorized → mergeAuthorized` **as audit record**, with a **new CI-green precondition** — see correction below. Source-grounding → `sources → upstream_refs` (`kind ∈ client_request|spec|issue|design_doc|parent_ticket`, `UNIQUE(kind,uid)` dedup so two workers don't draft the same ticket and a rejected request isn't reopened); provenance footer becomes "this PR implements ticket T from request R." Worker-harness repo (constitution + per-worker `notes/`) — **lift the "repo is read-only / workers never write the repo" rule**: feature branches replace subfolder-scoping. Scout/Editor/Keeper/Supervisor → Planner/Implementer/Reviewer/Tech-Lead.

**CI-green correction (all three judges, cross-cutting):** `publishAuthorized` is today a **pure function of DB status + open directives** — zero external-signal plumbing. A correct merge gate is a **new subsystem**, not an extension: it must read **live** GitHub check state at merge time, require the **specific required-check set**, and stay consistent with branch protection (defense-in-depth). **Never a passed-in boolean** (spoofable). This is on the true critical path of P1.

**DROP:** the molecular kit (`lib/renderer/selection.ts` PDB grammar, 3Dmol.js, `molecular3d` stage, explainer renderer — GitHub/IDE is the render surface); science connectors (bioRxiv/ChEMBL/PubMed/PDB → GitHub/CI/Slack/Linear); the **narrow-niche invariant** (Decision 1 / CLAUDE.md #5) — **inverted**: the niche is per-project, horizontal is the point; the slot-schema single-renderer apparatus (keep only versioning/migrate-on-read discipline for the ticket schema).

**Inherited-spine caveat (Judge C):** Knovo is **Phase-1 code-complete but operationally unrun** — the governed loop has never executed live even in its native domain. P0 budgets for hardening the borrowed spine before dev-loop work begins.

---

## 6. Multi-tenancy stance for Phase 0 — **DEFER. Single-operator / single-org only.**

This is the cleanest call in the packet and all three judges agree.

- **Build now:** nothing tenant-specific in the execution layer. Single-tenant schema, single repo, single human owner.
- **Defer:** `tenants` table, `tenant_id` everywhere, `is_tenant_admin` RLS, per-tenant tokens, usage-quota 429, the team-builder, billing.
- **Why it's not just "later" but "barely possible" (Judge B, fatal):** routines belong to **one claude.ai account**, are **unshared**, act **AS the operator's GitHub + connector identity**, and draw on **one shared per-account daily run cap.** DB-level `tenant_id`+RLS isolates the *database* but does nothing about the **execution/identity/metering layer**, which is where the real multi-tenant leak and cost-attribution problem live. **There is no platform substrate for multi-tenant routines today.** Therefore multi-tenancy is reframed in the roadmap as an **explicit platform dependency on Anthropic shipping per-tenant routine identity (or a self-hosted execution layer)** — not an app-layer milestone we can will into existence.
- **The latch (Judge C):** the moment a second principal is genuinely in sight, write the `tenant_id` discriminator and the **TenantA-cannot-read-TenantB isolation test FIRST**, as the gating artifact — never retrofit. But do not pay the RLS-everywhere tax on day zero for a product not shown to work once.

---

## 7. Phase-by-phase roadmap with CHECKPOINT gates

> Sequencing rule (Judge C): **never let the moat or the storefront precede a loop that has closed at least once.** The ledger leads *within* the loop phase; the engine, replay, onboarding, and tenancy each gate on the prior phase proving itself.

**P0 — Repoint the spine (single-tenant, single-repo). ~1–2 wks.**
Fork Knovo; strip molecular kit; rename `/api/worker/* → /api/agent/*`; re-type `WorkerId = planner|implementer|reviewer|supervisor` and the VERBS map; `artifact → ticket` with `upstream_refs`; keep audit/revisions/soft-delete/`routine_runs`/queue verbatim. Harden the operationally-unrun spine. No GitHub writes yet.
**CHECKPOINT G0:** CI green; a ticket can be created/transitioned through the governed API by a verb-scoped token; cross-role denials proven by test (planner cannot `push_commit`; reviewer cannot `merge`); audit + revision rows on every mutation; `.env.example` lockstep.

**P1 — Close the loop on ONE repo + ledger from day one. ~wks 3–6** (re-labeled from lean's wks 3–5 to absorb the two under-priced builds).
Wire the GitHub App (server-side token). **GitHub-native merge gate**: branch protection + required reviews + disable unrestricted pushes (`claude/*` only). **New CI-green precondition** read live at merge time against the required-check set. **Minimal Supervisor** (single-writer merge executor + `git pull --rebase`). **Episodic ledger** + clock-in/status hooks (server-stamped UTC, `(repo,branch,worktree)` key, inferred non-authoritative clock-out). **Run-input capture** convention. ≥1h reconciling heartbeat sweep; loop-back iteration cap. Stand up Planner/Implementer/Reviewer.
**CHECKPOINT G1:** a single plain-language request reaches a **MERGED PR** with: traceability (PR→ticket→request); merge **impossible** without (approved OR `merge_after`) AND **live-verified** CI-green AND branch protection; a reviewer-flag loop-back demonstrated ≥1×; every action a server-stamped ledger + audit row; a silently-dropped GitHub event self-heals via the sweep. **The loop has closed at least once in production.**

**P2 — Memory engine, gated on a workload existing. (gate-triggered, not date-triggered)**
**Entry gate:** the P1 loop has produced **N merged PRs across M sessions** (set N/M at G1 review). Then: dual-stream consolidation (fast INSERT+enqueue / slow Librarian); Semantic facts with mandatory provenance + Mem0 ADD/UPDATE/DELETE/NOOP + soft-supersession; hybrid retrieval (vector+BM25+ID) with degradation fallback; GAM researcher dereferencing to git/GitHub; "facts pending review" surface; **read-only GitHub MCP + server-side git-write proxy** (close the connector-bypass for good).
**CHECKPOINT G2:** a worker retrieves a durable cross-session fact with verifiable provenance; a contradicted fact is **superseded, not deleted** (audit shows `valid_until`); consolidation **never** touches the clock-in path (measured); retrieval returns fresh exact-match content with embeddings disabled; the routine carries **no git write tools** (all mutations proxied).

**P3 — Honest Record-and-Replay + onboarding wedge.**
Ship Audit/Reconstruct (replay captured inputs) and Plan-Replay (deterministic DAG re-exec) as two named HUD features with documented non-guarantees. Then the **"compose your dream team"** onboarding (Conductor interview, repo crawl, roster proposal, **dry-run sandbox PR** — see-it-work-before-trust) on the by-then-real parametric composer.
**CHECKPOINT G3:** a past run is fully reconstructable for an incident review; the captured DAG re-executes deterministically as a graph; nothing promises bit-for-bit LLM replay; a new operator reaches a passing dry-run (DAG + draft PR on a throwaway branch, nothing merged) self-serve.

**P4 — Multi-tenant + execution isolation, TOGETHER, gated on platform support.**
**Hard precondition:** Anthropic ships per-tenant routine identity/metering, OR we stand up a self-hosted execution layer. Then `tenants` + `tenant_id` everywhere; `is_tenant_admin` RLS; per-(tenant,role) tokens; usage-quota 429 with in-flight drain; **per-tenant sandbox + scoped CI secrets + egress controls + encryption-at-rest** shipped *with* tenancy, never after.
**CHECKPOINT G4:** TenantA-cannot-read/write-TenantB isolation test passes FIRST and runs in CI; a coding agent cannot exfiltrate secrets or reach disallowed egress; quota caps without starving in-flight work; each tenant's CI secrets unreachable from another tenant's agent.

---

## 8. Load-bearing DECISIONS needing the Co-Founder's sign-off

1. **Lead with the ledger, build the engine on demand.** Ship the episodic ledger in P1; gate the Semantic-fact engine on N merged PRs. *(Resolves the one correction all three judges want to lean-loop.)*
2. **The merge gate is GitHub-native, not DB-native.** Branch protection + required reviews + `claude/*`-only pushes is the enforcement; `mergeAuthorized` is audit/bookkeeping. CI-green is a **live check at merge time**, never a passed-in boolean. *(Judge B fatal-for-all-three.)*
3. **Multi-tenancy is deferred AND reframed as a platform dependency**, not a P0/app-layer milestone — single-operator/single-org until Anthropic ships per-tenant routine identity or we self-host execution. *(All three judges.)*
4. **Ledger clock-out is non-authoritative; the calendar shows "last seen," not "duration."** No completion callback exists. *(Judge B fatal-for-memory-moat.)*
5. **Supervisor ships minimal in P1, not P2.** You cannot claim branch-as-no-race-boundary without the reconciling actor. *(Judge C.)*
6. **"Replay" is two named modes, never bit-for-bit LLM determinism** — codified in product copy from day one. *(All three; lean-loop's strongest contribution.)*
7. **Invert Knovo's narrow-niche invariant (Decision 1 / CLAUDE.md #5):** niche is per-project, horizontal is the point. This re-litigates a frozen Knovo decision — explicit sign-off required.
8. **zod validates ticket *shape* only; code correctness is CI/tests/review.** "Passed validation" never means "safe to merge."
9. **Pull-on-session-start is a hard invariant; the fire-URL text payload is untrusted opaque nudge text, never parsed as a command.** *(Judge B injection channel.)*

---

## 9. Harvested deferrals to track (BACKLOG.md)

- **Graph store** for cross-repo causal "why did PR in A break CI in B" — deferred behind FKs + a `relations` join table; promote only on proven need. **Honesty:** stop marketing "cross-repo causal" as a built pillar; per-repo git DAG ≠ cross-repo backbone — until a graph store exists, cross-repo is "two repos write one Postgres ledger." Rename in pitch as roadmap.
- **MAGMA four-orthogonal-graph memory + beam-search** — over-engineered; ledger + commit DAG is the temporal graph.
- **LISTEN/NOTIFY / websocket real-time ledger push** — P1 is pull-on-session-start; promote when live-watching is a sold feature.
- **TimescaleDB / partitioning** — only on proven ledger volume; coalesce/sample status events first.
- **Parametric prompt composer** (Knovo M3, unbuilt) — the engine behind the team-builder; lands in P3.
- **Reviewer/Maintainer auto-fix-PR** — default is flag-don't-fix; auto-fix is an opt-in that widens verb scope.
- **Forum-as-inter-agent-coordination** — currently the human→agent directive feed only; real structured inter-agent threads are unscoped. Build or rename; don't claim as shipped.
- **Stripe billing** — metering/quota/429 in P4; payment-provider integration a separate high-risk PR.
- **Retention/GC policy** (ledger vs facts vs pointers, compliance windows) — pre-Enterprise; v1 keeps everything (cheap, audit-friendly).
- **Encryption-at-rest for per-tenant secrets** — moved from Knovo-deferred to a **hard P4 gate** (distrusting tenants).
- **RNG-seed / full deterministic input capture** — capture whatever the Claude-Code harness actually exposes; confirm before promising reconstructability (harness-capability dependency).
- **Open question to resolve at G1:** the exact N merged PRs / M sessions threshold that unlocks P2.

---

**Bottom line for the gate:** ship lean-loop's loop on lean-loop's discipline; lead with the ledger as the declared moat from P1; enforce the merge gate in GitHub not the DB; tell the truth about clock-out, replay, cross-repo, and multi-tenancy; and never let the moat-engine or the storefront precede a loop that has closed at least once. Sign-off needed on the nine DECISIONS in §8 before P0.