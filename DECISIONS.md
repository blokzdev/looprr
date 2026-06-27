# DECISIONS

Load-bearing decisions for LoopRR. States:
- **Frozen** — settled; do not re-litigate silently (propose to HUMAN.md and ask).
- **Pending ratification** — recommended; awaiting the Co-Founder's sign-off.

> **2026-06-27 — Phase-0 ratification.** The Co-Founder ratified D-01…D-09 (gate passed; HUMAN.md).
> D-01 = **Bring-your-own-routines** confirmed ("sophisticated BYOR"), **with** a hosted, multi-model
> /multi-provider execution fleet harvested as a **V2 flagship moat** (see the V2 note below + ROADMAP
> "Platform horizon V2"). D-09 = **port-selective** seeding, with freedom to refine/expand and harvest
> out-of-scope upside to ROADMAP/backlog. All now **Frozen**.

Provenance: the Phase-0 planning Workflow (4 research agents → 3 designs → 3 adversarial judges →
synthesis) + Claude's adversarial validation against the real Knovo code. Memo:
`research/synthesis/phase0-synthesis-memo.md`.

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | **LoopRR is a "bring-your-own-routines" coordination substrate.** Each user/org configures their *own* Claude Code routines (their account, identity, repos, run cap) and connects them to LoopRR's governed API + ledger via a tenant-scoped token + the fire-trigger URL. LoopRR never *hosts* the routines (in V1). | Sidesteps any single-account limit (the cap is the user's own); cleaner economics (users pay their own LLM cost); matches the vision; whitelabel/multi-tenant at the app layer. | **Frozen** |
| 2 | **Lead with the ledger; build the engine on demand.** Ship the append-only temporal+spatial **episodic ledger** early. Gate the Semantic-fact/consolidation engine on a real workload (N merged PRs, set at G2). | Cheap moat substrate now; expensive engine only when a workload justifies it. | **Frozen** |
| 3 | **Two governed write boundaries; the merge gate is GitHub-native.** DB boundary = the governed API. Git boundary = **GitHub branch protection + required reviews + `claude/*`-only pushes** is the *enforced* gate; the DB `mergeAuthorized` flag is **audit, not enforcement**. CI-green is checked **live at merge time**, never a passed-in boolean. | The GitHub MCP exposes `merge_pull_request`/`push_files`/`create_or_update_file` as directly-callable write tools, so a DB flag alone is bypassable. | **Frozen** |
| 4 | **Honest telemetry (agent-driven, corroborated).** We don't depend on a platform completion webhook (likely none — Q-01a). Instead: `clock_in` + heartbeats are **server-stamped, authoritative**; `clock_out` is **self-reported by the worker as its last instruction — authoritative *when present*** — and **corroborated by the GitHub terminal artifact** (PR/commit webhook, a near-authoritative end signal). Only an *abnormal* end (crash / cap / kill → no clock_out, no artifact) falls back to **"last seen" via stale-timeout**. So `duration` is authoritative when both ends exist, "last seen" only when a run died silently — **never fabricated**. *(V2 hosted runtime → process-exit = a truly authoritative completion signal; a reason V2 deepens the moat.)* | Surface inference as inference, real signals as real. | **Frozen** |
| 5 | **"Replay" is two named modes, never bit-for-bit LLM determinism.** (a) Audit/Reconstruct (capture per-run inputs); (b) Plan-Replay (deterministic re-exec of the captured DAG plan). Non-guarantees stated in-product. | LLM nondeterminism precludes token-level replay; the honest version is still valuable. | **Frozen** |
| 6 | **Multi-tenancy is app-layer (whitelabel), deferred for sequencing — not platform-blocked.** Under D-01 each tenant brings their own routine fleet, so tenancy is ordinary DB tenancy (`tenant_id` + RLS). Build single-operator/single-repo first; write the `tenant_id` discriminator + the TenantA-cannot-read-TenantB isolation test FIRST when a second principal is in sight. | The user's whitelabel model *is* the tenancy mechanism; don't pay the RLS-everywhere tax before the loop works once. | **Frozen** |
| 7 | **Horizontal niche.** LoopRR is domain-agnostic; the "niche" is per-project. Explicitly **inverts** Knovo's narrow-niche invariant. | A general dev-team coordinator, not a content vertical. | **Frozen** |
| 8 | **zod validates ticket *shape* only.** Code correctness is CI/tests/review. "Passed validation" never means "safe to merge". | Schema validity ≠ code safety. | **Frozen** |
| 9 | **Pull-on-session-start; fire-URL `text` is untrusted.** A routine pulls its work item from the API on start; the fire-URL text payload is opaque nudge text, never parsed as a command. | The fire-URL text is a prompt-injection channel. | **Frozen** |
| 10 | **Stack inherited from Knovo's governed-API spine:** Next.js (TS, App Router) + Tailwind + Supabase (Postgres/Auth/RLS) on Vercel; the governed API (`/api/agent/*`) as the single DB write boundary; per-role verb-scoped tokens; audit_log + revisions + soft-delete. A **GitHub App** (server-side token) mediates git writes. | Reuse the proven, multi-tenant-ready spine. | **Frozen** |
| 11 | **Brand: LoopRR** (Round-Robin + Record-and-Replay). **Seeding = port-selective** (D-09): copy the spine into this fresh repo, rebrand, drop the molecular/content kit; refine/expand freely; harvest out-of-scope upside to ROADMAP/backlog. | Owner-directed pivot; clean start keeping the proven spine. | **Frozen** |

> **V2 north-star note (NOT current scope — harvested 2026-06-27 with the Co-Founder).** Beyond the
> V1 BYOR substrate, the recorded flagship direction is a **LoopRR-hosted, model/provider-agnostic
> execution fleet** — LoopRR runs the agents itself (e.g. via the **Vercel AI SDK**) across Claude /
> GPT / Gemini / open models, instead of relying on the user's own Claude routines. Why it is a moat,
> not just a feature: (1) removes BYOR setup friction (LoopRR provisions the team); (2) gives LoopRR
> **per-tenant identity + metering + billing** by owning execution (true multi-tenancy, the basis of
> the SaaS); (3) **model/provider hedging** (not Claude-locked); (4) **owning the runtime yields an
> authoritative completion signal + richer execution capture** — which *upgrades the ledger/replay
> moat* (resolves D-04's honesty limit and strengthens D-05). Cost: LoopRR bears LLM + execution infra
> and must rebuild orchestration the Claude-Code harness gives V1 for free. **Gated on V1 (the BYOR
> loop) proving demand** — sequence wall (CLAUDE.md inv. 7). Tracked: ROADMAP "Platform horizon V2".

> **Knovo lineage note.** LoopRR reuses Knovo's *governance spine* and drops its content/molecular
> layer. Knovo's frozen "narrow niche" is consciously inverted here (D-07). The borrowed spine is
> Phase-1 code-complete but **operationally unrun** even in Knovo — P1 budgets to harden it. Full
> map: `foundation/knovo-reuse.md`.
