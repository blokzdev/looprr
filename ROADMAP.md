# ROADMAP — the single progress source of truth

Phases → subphases → checkboxed tasks, with **CHECKPOINT** gates. Legend: `[ ]` todo · `[~]`
in-progress · `[x]` done (green build gate) · `[!]` blocked (see HUMAN.md). **No `[x]` without a
green build gate.** Never cross an unmet CHECKPOINT. Sequencing rule: **never let the moat-engine,
replay, the storefront, or multi-tenancy precede a loop that has closed at least once.**

> Status: **Phase 0 complete; P1 in progress.** Gate passed 2026-06-27 — the Co-Founder ratified
> D-01…D-09 and greenlit P1 (`HUMAN.md`). Per the session branch directive, Phase 0 + P1 land on the
> single branch `claude/looprr-phase-0-setup-uh6h9h` (HUMAN.md C-04).

---

## Phase 0 — Foundation (harness, memory, specs, research) · *self-gated, in progress*
- [x] Orient on both repos; read Knovo's governance spine and docs
- [x] Import grounding research (5 memory papers) + distil notes
- [x] Run the Phase-0 conceptualization Workflow (research → design → adversarial judge → synthesis)
- [x] Personal adversarial validation of the synthesis vs the real Knovo code
- [x] Lay down the harness (`CLAUDE.md`/`AGENTS.md`), the loop spec (`docs/ultraloop.md`), and this roadmap
- [x] Write the foundation specs (`foundation/*`), `DECISIONS.md`, `HUMAN.md`, `VERIFICATION.md`
- [x] Seed the versioned memory dir (`memory/index.md` + one-fact files)
- [x] **CHECKPOINT G0-plan:** human ratified D-01…D-09 + this roadmap → P1 unlocked (2026-06-27)
- [x] Resolve D-09 (codebase seeding) → **port-selective**

## Phase 1 — Repoint the spine (single-operator, single-repo) · *gated on G0-plan ✓*
Port-selective from Knovo; one subphase per slice; build gate green before each `[x]`.
- **P1.1 — Project scaffold + auth spine** ✓ (gate green: typecheck + 10 tests)
  - [x] Initialize the Node/TS toolchain (package.json, tsconfig, vitest) — port-selective
  - [x] Port `lib/worker-auth.ts → lib/agent-auth.ts`; re-type `AgentId = planner|implementer|reviewer|supervisor` + the VERBS map
  - [x] Port the auth test; prove cross-role denials (planner ∌ `push_commit`/`merge`; reviewer ∌ `merge`/`push_commit`)
  - [x] Minimal CI workflow (typecheck + test) so the PR gates green
  - [x] **gate:** typecheck + test green
- **P1.2 — Provision DBs + ticket model + governed API skeleton**
  - [ ] **Provision `looprr-dev` + `looprr-prod`** via the Supabase MCP (Blokz Team, us-east-1, $0/mo — `memory/facts/0006`). Dev flows freely; prod is human-gated.
  - [ ] Initial migration → `supabase/migrations/0001_init.sql`: `tickets` + `upstream_refs` (`kind ∈ client_request|spec|issue|design_doc|parent_ticket`, dedup `UNIQUE(kind,uid)`) + `directives` + `revisions` + `audit_log` + `routine_runs`. Apply live via `apply_migration` to dev; `generate_typescript_types` → `lib/database.types.ts`.
  - [ ] Port the governed write helpers (validate-shape / transition / audit / revisions / soft-delete) → `/api/agent/*`; port the directive-as-data queue verbatim
- **P1.3 — RLS + harden the unrun spine**
  - [ ] RLS default-deny on every table; agent governance enforced in the API (service-role), not RLS; run `get_advisors(security)` and close findings
  - [ ] `.env.example` lockstep; CI already gates typecheck+test (added in P1.1)
- [ ] **CHECKPOINT G1:** CI green; a ticket can be created/transitioned by a verb-scoped token through the governed API; cross-role denials proven by test; audit+revision rows on every mutation; `.env.example` lockstep
> *(Numbering note: G1 here is the merged "repoint" checkpoint; the loop-closing checkpoint is G2 below.)*

## Phase 2 — Close the loop on ONE repo + ledger from day one · *gated on G1a*
- [ ] Wire the GitHub App (server-side token); routines push `claude/*` branches only
- [ ] **GitHub-native merge gate:** branch protection + required reviews + disable unrestricted pushes
- [ ] **CI-green precondition** read live at merge time against the required-check set (never a passed-in boolean)
- [ ] **Minimal Supervisor:** single-writer merge executor + `git pull --rebase` before any shared-layer write
- [ ] **Episodic ledger** (`clock_events`) — three axes: clock (deterministic server-side clock-in on first authed call) / heartbeat / check; server-stamped UTC; `(repo,branch,worktree[,scope])` key; agent-driven + PR-corroborated clock-out (D-04)
- [ ] **Resource claims + assignment gate** (`resource_claims`): advisory presence + scope-aware dispatch (Supervisor); collaboration = opt-in co-claim; stale-claim expiry
- [ ] **Digital-footprint views** (`footprint_worker|fleet|space`) for the HUD team calendar
- [ ] Run-input capture convention (for later replay)
- [ ] ≥1h reconciling heartbeat sweep (self-heals dropped webhook events); loop-back iteration cap with human escalation
- [ ] Stand up Planner / Implementer / Reviewer routines + paste-ready prompts (`docs/routines/`)
- [ ] **CHECKPOINT G2:** a single plain-language request reaches a **MERGED PR** with: traceability (PR→ticket→request); merge impossible without (approved OR `merge_after`) AND live-verified CI-green AND branch protection; a reviewer-flag loop-back demonstrated ≥1×; every action a server-stamped ledger+audit row; a silently-dropped GitHub event self-heals via the sweep. *The loop has closed at least once in production.*

## Phase 3 — Memory engine · *gate-triggered, not date-triggered*
> **Entry gate:** P2 produced **N merged PRs across M sessions** (set N/M at the G2 review).
- [ ] Dual-stream consolidation (fast `INSERT`+enqueue / slow Librarian worker — zero code/merge power)
- [ ] Semantic facts: mandatory provenance (`ref`=SHA/PR/run), `valid_from`/`valid_until`, `superseded_by`; pgvector + FTS hybrid index
- [ ] Mem0-style ADD/UPDATE/DELETE/NOOP reconciliation with **soft-supersession** (never row drop)
- [ ] GAM "researcher" retrieval: hybrid (vector + BM25 + exact-ID) → dereference exact diff/log via GitHub MCP; 3-level degradation fallback
- [ ] "Facts pending review" surface for high-impact facts
- [ ] **Read-only GitHub MCP + server-side git-write proxy** (close the connector write-tool bypass for good)
- [ ] **CHECKPOINT G3:** a worker retrieves a durable cross-session fact with verifiable provenance; a contradicted fact is superseded (audit shows `valid_until`); consolidation never touches the clock-in path (measured); the routine carries **no git write tools** (all mutations proxied)

## Phase 4 — Honest Record-and-Replay + onboarding wedge · *gated on G3*
- [ ] Audit/Reconstruct (replay captured inputs) + Plan-Replay (deterministic DAG re-exec) as two named HUD features with documented non-guarantees
- [ ] "Compose your dream team" onboarding: Conductor interview → repo crawl → roster proposal → **dry-run sandbox PR** (see-it-work-before-trust), on the parametric prompt composer
- [ ] **CHECKPOINT G4:** a past run is fully reconstructable for an incident review; the captured DAG re-executes deterministically; nothing promises bit-for-bit LLM replay; a new operator reaches a passing dry-run self-serve

## Phase 5 — Multi-tenant SaaS · *gated on G4 + a second principal in sight*
- [ ] `tenants` table + `tenant_id` everywhere; `is_tenant_admin` RLS; per-(tenant,role) tokens
- [ ] **TenantA-cannot-read/write-TenantB isolation test FIRST**, runs in CI, as the gating artifact
- [ ] Usage-quota `429` with in-flight drain; per-tenant secret scoping + egress controls + encryption-at-rest
- [ ] Billing (Stripe/Paddle) as a separate high-risk PR; free `‹slug›.looprr.*` + Pro custom domains
- [ ] **CHECKPOINT G5:** isolation test passes; an agent cannot exfiltrate secrets or reach disallowed egress; quota caps without starving in-flight work

---

## Platform horizon V2 — hosted, model/provider-agnostic execution fleet · *north-star; gated on V1 demand*
> Harvested 2026-06-27 (CARVE-OUT V2-01; DECISIONS "V2 north-star note"). **Not current scope** —
> sequence wall: never before the V1 BYOR loop proves demand.
- [ ] LoopRR **runs the agents itself** (e.g. Vercel AI SDK) across Claude / GPT / Gemini / open models
- [ ] Per-tenant identity + metering + billing by owning execution (true multi-tenant SaaS substrate)
- [ ] **Authoritative completion signal** from owning the runtime → upgrades the ledger/replay moat (resolves D-04's inference fallback)
- [ ] Provider/model hedging; per-run model routing
- [ ] Rebuild the orchestration the Claude-Code harness gives V1 for free (the cost of owning execution)

---

## Backlog (deferred scope + open questions — tracked, never dropped)
- **Graph store** for cross-repo causal "why did PR in A break CI in B" — deferred behind FKs + a `relations` join table; promote only on proven need. *Until then, do not market "cross-repo causal memory" as built — per-repo git DAG ≠ a cross-repo backbone.*
- **MAGMA four-orthogonal-graph memory + beam-search** — over-engineered for v1; the ledger + commit DAG is the temporal graph.
- **`LISTEN/NOTIFY` / websocket real-time ledger push** — P2 is pull-on-session-start; promote when live-watching is a sold feature.
- **TimescaleDB / partitioning** — only on proven ledger volume; coalesce/sample status events first.
- **Parametric prompt composer** (Knovo's unbuilt M3) — the engine behind the team-builder; lands in P4.
- **Reviewer auto-fix-PR** — default is flag-don't-fix; auto-fix is an opt-in that widens verb scope.
- **Forum-as-inter-agent-coordination** — today the human→agent directive feed only; structured inter-agent threads are unscoped. Build or rename; don't claim as shipped.
- **Retention/GC policy** (ledger vs facts vs pointers, compliance windows) — pre-Enterprise; v1 keeps everything (cheap, audit-friendly).
- **Google Calendar / OKR integration** (user's "calendar-driven meta-coordination" idea) — evaluate as a ledger *projection/surface* (the clock-in ledger is the system of record; calendar is a view), not a system of record. Research deferral.
- **RNG-seed / full deterministic input capture** — capture whatever the Claude-Code harness actually exposes; confirm before promising reconstructability.
- **Open question (resolve at G2):** the exact N merged PRs / M sessions that unlocks P3.
- **Open question:** worker-token storage hardening (hashed-at-rest vs env compare), inherited from Knovo.
