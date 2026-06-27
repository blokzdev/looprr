# HUMAN.md — human-in-the-loop ledger

The async channel between Claude (PM + tech lead) and the human Co-Founder. **Not** a status board
(`ROADMAP.md` owns progress) or a fact store (`memory/` owns durable facts) — it points at those.
Rows are added in the same commit as the work and **resolved, not deleted**, when met.

Columns: **ID · type · item · state · note**. Types: `DECISION` (Claude made a call, overridable),
`SIGN-OFF` (needs the human before it freezes/proceeds), `ONLY-HUMAN` (Claude cannot do it),
`CARVE-OUT` (deliberate deferral), `OPEN-Q`.

---

## Awaiting sign-off (gates the P1 build)

| ID | Type | Item | State | Note |
|---|---|---|---|---|
| D-01 | SIGN-OFF | **Architecture model = bring-your-own-routines** (users run their own routines; LoopRR is the coordination/memory/governance backend). | OPEN | The single most load-bearing fork. My strong recommendation; it dissolves the multi-tenancy platform blocker and matches your vision. Alternative = LoopRR-hosted fleet (blocked today) or solo-tool-first. See `DECISIONS.md` #1. |
| D-02 | SIGN-OFF | **Lead with the ledger; gate the fact-engine on N merged PRs.** | OPEN | `DECISIONS.md` #2. |
| D-03 | SIGN-OFF | **Merge gate is GitHub-native (branch protection), DB flag is audit only; CI-green checked live at merge.** | OPEN | `DECISIONS.md` #3. Forced by the GitHub-MCP write-tool exposure. |
| D-04 | SIGN-OFF | **Clock-out is inferred/non-authoritative; calendar shows "last seen".** | OPEN | `DECISIONS.md` #4. No platform completion callback exists. |
| D-05 | SIGN-OFF | **"Replay" = Audit/Reconstruct + Plan-Replay; never bit-for-bit LLM determinism.** | OPEN | `DECISIONS.md` #5. |
| D-06 | SIGN-OFF | **Multi-tenancy is app-layer + deferred (not platform-blocked).** | OPEN | `DECISIONS.md` #6. Depends on D-01. |
| D-07 | SIGN-OFF | **Invert Knovo's narrow-niche → LoopRR is horizontal/domain-agnostic.** | OPEN | `DECISIONS.md` #7. Re-litigates a frozen Knovo decision; you directed the pivot, so this is a confirm. |
| D-08 | SIGN-OFF | **Inherit Knovo's stack + governed-API spine** (Next.js/Supabase/Vercel + GitHub App). | OPEN | `DECISIONS.md` #10. |
| D-09 | SIGN-OFF | **Codebase seeding:** port-selective (recommended) vs git-fork-whole vs clean-room. | OPEN | `DECISIONS.md` #11. The `looprr` repo is currently blank. |

## Decisions Claude made (auditable, overridable)
| ID | Type | Item | State | Note |
|---|---|---|---|---|
| C-01 | DECISION | Used a multi-agent planning Workflow (11 agents) + personal adversarial validation for Phase-0 conception. | DONE | Provenance: `research/synthesis/`. |
| C-02 | DECISION | Imported all 5 research PDFs into `research/papers/` (incl. the 21 MB SemaClaw). | DONE | Could move to git-LFS later if repo weight matters (`research/README.md`). |
| C-03 | DECISION | Collapsed MIRIX's 6 memory types → 4 dev-native (Core/Procedural/Semantic/Episodic). | DONE | `foundation/memory-and-ledger.md`. |

## Things only the human can do (ONLY-HUMAN)
| ID | Item | Note |
|---|---|---|
| H-01 | Provision a **GitHub App** (server-side token) + set branch protection on target repos. | Needed before P2 (the real merge gate). |
| H-02 | Create the LoopRR Supabase project + Vercel project; set secrets (service-role key, GitHub App key). | P1. Zero secrets in the repo. |
| H-03 | **Verify the load-bearing platform constraints** below (you run Knovo's routines, so you know the platform). | See OPEN-Q Q-01. |
| H-04 | Decide product domain / hosting tier when multi-tenant (P5). | Vercel Hobby is non-commercial. |

## Open questions (OPEN-Q)
| ID | Item | Note |
|---|---|---|
| Q-01 | **Confirm the Claude-Code routine platform facts** the architecture rests on: (a) no run-completion callback (only a session id/url at dispatch); (b) routines run under one account's identity + a shared daily run cap; (c) GitHub webhook events are rate-capped and silently dropped over cap; (d) the fire-URL accepts a free `text` payload. | These came from a research agent (the market-research agent failed; this one succeeded but is unverified by me). They drive D-04/D-06 and the heartbeat-sweep design. You'd know firsthand. |
| Q-02 | The "calendar-driven meta-coordination" idea — is Google Calendar/OKR a desired *surface* over the ledger, or a system of record? | I've scoped it as a projection of the ledger (backlog), not a source of truth. Confirm. |
| Q-03 | Worker/team naming — Planner/Implementer/Reviewer/Supervisor(Tech-Lead)/Librarian. Happy to rename. | `foundation/worker-team.md`. |
