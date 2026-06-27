# ROADMAP — the single progress source of truth

Phases → subphases → checkboxed tasks, with **CHECKPOINT** gates. Legend: `[ ]` todo · `[~]`
in-progress · `[x]` done (green build gate) · `[!]` blocked (see HUMAN.md). **No `[x]` without a
green build gate.** Never cross an unmet CHECKPOINT. Sequencing rule: **never let the moat-engine,
replay, the storefront, or multi-tenancy precede a loop that has closed at least once.**

> Status: **Phase 0 in progress.** The product BUILD (P0) is gated on the human approving this
> roadmap + the pending DECISIONS (`HUMAN.md`).

---

## Phase 0 — Foundation (harness, memory, specs, research) · *self-gated, in progress*
- [x] Orient on both repos; read Knovo's governance spine and docs
- [x] Import grounding research (5 memory papers) + distil notes
- [x] Run the Phase-0 conceptualization Workflow (research → design → adversarial judge → synthesis)
- [x] Personal adversarial validation of the synthesis vs the real Knovo code
- [x] Lay down the harness (`CLAUDE.md`/`AGENTS.md`), the loop spec (`docs/ultraloop.md`), and this roadmap
- [x] Write the foundation specs (`foundation/*`), `DECISIONS.md`, `HUMAN.md`, `VERIFICATION.md`
- [x] Seed the versioned memory dir (`memory/index.md` + one-fact files)
- [ ] **CHECKPOINT G0-plan:** human ratifies the pending DECISIONS (D-01…D-09) + this roadmap → unlocks P1 build
- [ ] Resolve D-09 (codebase seeding: port-selective vs fork-whole vs clean-room) → then execute it

## Phase 1 — Repoint the spine (single-operator, single-repo) · *gated on G0-plan*
- [ ] Seed the codebase per D-09; strip the molecular/content kit
- [ ] Rename `/api/worker/* → /api/agent/*`; re-type `WorkerId = planner|implementer|reviewer|supervisor` + the VERBS map
- [ ] `artifact → ticket` with `upstream_refs` (`kind ∈ client_request|spec|issue|design_doc|parent_ticket`, dedup on `UNIQUE(kind,uid)`)
- [ ] Keep audit / revisions / soft-delete / `routine_runs` / directive-queue verbatim; harden the operationally-unrun spine
- [ ] **CHECKPOINT G1a:** CI green; a ticket can be created/transitioned by a verb-scoped token through the governed API; cross-role denials proven by test (planner cannot `push_commit`; reviewer cannot `merge`); audit+revision rows on every mutation; `.env.example` lockstep

## Phase 2 — Close the loop on ONE repo + ledger from day one · *gated on G1a*
- [ ] Wire the GitHub App (server-side token); routines push `claude/*` branches only
- [ ] **GitHub-native merge gate:** branch protection + required reviews + disable unrestricted pushes
- [ ] **CI-green precondition** read live at merge time against the required-check set (never a passed-in boolean)
- [ ] **Minimal Supervisor:** single-writer merge executor + `git pull --rebase` before any shared-layer write
- [ ] **Episodic ledger** (`clock_events`) + clock-in/status hooks (server-stamped UTC; `(repo,branch,worktree)` key; inferred non-authoritative clock-out)
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
