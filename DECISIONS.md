# DECISIONS

Load-bearing decisions for LoopRR. Two states:
- **Frozen** — settled; do not re-litigate silently (propose to HUMAN.md and ask).
- **Pending ratification** — recommended by the Phase-0 conceptualization; **awaiting the Co-Founder's
  sign-off** (tracked in `HUMAN.md`) before it freezes. Until then, build behind it provisionally and
  keep it cheaply reversible.

Provenance: the Phase-0 planning Workflow (4 research agents → 3 diverse designs → 3 adversarial
judges → synthesis) plus Claude's personal adversarial validation against the real Knovo codebase.
Memo: `research/synthesis/phase0-synthesis-memo.md`.

| # | Decision | Rationale | Status |
|---|---|---|---|
| 1 | **LoopRR is a "bring-your-own-routines" coordination substrate.** Each user/org configures their *own* Claude Code routines (their account, identity, repos, daily-run cap) and points them at LoopRR's governed API + ledger via a tenant-scoped token in the routine env. LoopRR never *hosts* the routines. | Sidesteps the platform's single-account / no-per-tenant-routine-identity limit; cleaner economics (users pay their own LLM cost; LoopRR charges for coordination/memory/governance); matches the stated vision ("routines the user sets up in their app"). | **Pending ratification** (D-01) |
| 2 | **Lead with the ledger; build the engine on demand.** Ship the append-only temporal+spatial **episodic ledger** early (one Postgres table). Gate the Semantic-fact / consolidation engine on a real workload (N merged PRs, threshold set at G1). | The ledger is the cheap moat substrate; the consolidation engine is expensive and worthless before a workload exists. | **Pending ratification** (D-02) |
| 3 | **Two governed write boundaries; the merge gate is GitHub-native.** DB boundary = the governed LoopRR API (sole path to tickets/ledger/directives/merge-record). Git boundary = **GitHub branch protection + required reviews + `claude/*`-only pushes** is the *enforced* merge gate; the DB `mergeAuthorized` flag is **audit/bookkeeping, not enforcement**. CI-green is a **live check at merge time**, never a passed-in boolean. | The GitHub MCP exposes `merge_pull_request`/`push_files`/`create_or_update_file` as directly-callable write tools, so a DB flag alone is bypassable. | **Pending ratification** (D-03) |
| 4 | **Honest telemetry.** No platform completion callback exists → `clock_out`/`duration` are **inferred, non-authoritative**; the calendar shows **"last seen", not "duration worked".** `clock_in` + mid-run `status` are server-stamped and authoritative. | We refuse to trust worker-self-reported clocks; surfacing inference as fact would corrupt the moat. | **Pending ratification** (D-04) |
| 5 | **"Replay" is two named modes, never bit-for-bit LLM determinism.** (a) Audit/Reconstruct — capture per-run inputs (prompt, injected-memory snapshot, tool results, model+params, git SHAs, seed where exposed) so a run is reconstructable/auditable. (b) Plan-Replay — deterministic re-execution of the captured DAG plan. Non-guarantees stated in-product. | LLM nondeterminism makes token-level replay impossible to promise; the honest version is still valuable. | **Pending ratification** (D-05) |
| 6 | **Multi-tenancy is app-layer, deferred for sequencing — not platform-blocked.** Under D-01 (BYO-routines) tenancy is ordinary DB tenancy (`tenant_id` + RLS), which the borrowed Knovo data model already anticipates. Build single-operator/single-repo first; write the `tenant_id` discriminator + the TenantA-cannot-read-TenantB isolation test FIRST when a second principal is in sight. | Don't pay the RLS-everywhere tax before the loop works once; but tenancy is feasible now (no Anthropic platform dependency), unlike a hosted-fleet model. | **Pending ratification** (D-06) |
| 7 | **Horizontal niche.** LoopRR is domain-agnostic; the "niche" is per-project (whatever repo the user points it at). This explicitly **inverts** Knovo's narrow-niche invariant. | The product is a general dev-team coordinator, not a content vertical. | **Pending ratification** (D-07) |
| 8 | **zod validates ticket *shape* only.** Code correctness is CI/tests/review — a probabilistic, multi-signal gate. "Passed validation" never means "safe to merge". | Conflating schema validity with code safety is a category error for a dev product. | Frozen |
| 9 | **Pull-on-session-start; fire-URL `text` is untrusted.** A routine pulls its structured work item from the API on start; the fire-URL text payload is treated as opaque nudge text, never parsed as a command. | The fire-URL text is a prompt-injection channel. | Frozen |
| 10 | **Stack inherited from Knovo's governed-API spine:** Next.js (TS, App Router) + Tailwind + Supabase (Postgres/Auth/RLS) on Vercel; the governed API (`/api/agent/*`) as the single DB write boundary; per-worker verb-scoped tokens; audit_log + revisions + soft-delete. A **GitHub App** (server-side token) mediates git writes. | Reuse the proven, multi-tenant-ready governance spine; don't rebuild it. | **Pending ratification** (D-08) |
| 11 | **Brand: LoopRR** (Round-Robin + Record-and-Replay). Seeded by porting Knovo's governed-API spine into this repo and rebranding; the molecular/content kit is dropped. | Owner-directed pivot. | Frozen (name) / codebase-seeding **pending** (D-09) |

> **Knovo lineage note.** LoopRR reuses Knovo's *governance spine* (governed API, verb-scoped tokens,
> audit/revisions/soft-delete, directive-as-data queue, `routine_runs`, control-HUD, host-routing) and
> **drops** its content/molecular layer. Knovo's frozen "narrow niche" (its Decision 1) is consciously
> inverted here (D-07). The borrowed spine is **Phase-1 code-complete but operationally unrun** even in
> Knovo — P0 budgets to harden it. Full map: `foundation/knovo-reuse.md`.
