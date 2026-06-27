# The Development Dream Team — roster, triggers, verb scopes

The team members are **the user's own Claude Code routines** (BYO — D-01), each configured in the
Claude app: select the target repo + the LoopRR env (`LOOPRR_API_BASE` + a role token) + connectors +
trigger(s), and paste the role's prompt. The canonical paste-ready prompts live under `docs/routines/`
and are **regenerated whenever the schema/connectors/flow change** (the Knovo routine-regeneration
discipline — `CLAUDE.md`).

Per-role, **verb-scoped bearer tokens enforced in the API** (`lib/agent-auth.ts`, re-typed from
Knovo's `lib/worker-auth.ts`). **Trust-sizing:** the role that ingests the most untrusted text gets
the smallest verb set. A leaked token can only do that role's verbs, and never merge without the gate.

| Role | Knovo origin | Triggers | Verb scope | Phase |
|---|---|---|---|---|
| **Planner** | Scout (lowest trust) | fire-URL (directive filed) + cron heartbeat (≥1h liveness) | `dedup, create_ticket, comment` | P2 |
| **Implementer** | Editor (largest write) | fire-URL (claimable ticket / reviewer loop-back) + GitHub issue/PR event | `claim, push_commit` (own `claude/*` branch only), `open_pr, comment, transition_status` | P2 |
| **Reviewer** | Keeper (flag-not-fix) | GitHub PR opened/updated event + cron sweep for stuck PRs | `review_targets, run_tests, read_ci, flag, comment, transition_status` | P2 |
| **Supervisor / Tech-Lead** | Supervisor (promoted to first-class) | GitHub push on harness + fire-URL | `sequence, reconcile_harness, request_review, merge (gated), deploy (gated)` | **P2 (minimal)** |
| **Librarian / Consolidator** | new, engine-native | cron + queue-drain | `read_ledger, propose_fact, supersede_fact` — **zero code/merge power** | P3 |

## Role notes
- **Planner.** Pulls the queue, grounds a ticket in its `upstream_refs`, emits a plan + sub-tickets.
  Lowest trust (ingests the most untrusted request/issue text) → smallest verbs (no code, no merge).
- **Implementer.** Claims a ticket, works a `claude/<ticket>` branch, pushes commits, opens a PR.
  **Cannot push to protected branches** (GitHub-enforced). Largest *write* role, but still no merge.
- **Reviewer.** Default is **flag, don't fix** (Keeper's posture): runs tests, reads CI, flags issues
  back to the Implementer. (Auto-fix-PR is an opt-in that widens verb scope — backlog.) The
  Reviewer↔Implementer loop is capped with human escalation.
- **Supervisor / Tech-Lead.** Promoted to **first-class and P2** (you can't claim branch-as-no-race
  without the reconciling actor). Scoped to the floor: the single-writer **merge executor** (behind
  the human gate) + `git pull --rebase` before shared-layer writes + sequencing/round-robin
  assignment. The human is the merge *approver*; the Supervisor is the merge *executor*.
- **Librarian.** The clean answer to "how do you have a fact store that can't poison the codebase":
  a role with **no code and no merge verbs** that only writes Semantic memory with provenance. Lands
  in **P3**, gated on the loop having produced merged PRs to consolidate from.

`merge`/`deploy` are the new "publish" verbs — always behind the human gate (`coordination.md`).

## Connectors (per role, set in the routine UI)
- **All roles:** the **GitHub** connector + `curl` to `LOOPRR_API_BASE`. Env allowlists the LoopRR API
  host + GitHub. Each role holds only its `LOOPRR_AGENT_TOKEN_<ROLE>`.
- **Reviewer/Implementer:** + CI/test connectors as needed (project-specific).
- **Caveat (security-and-privacy.md):** the GitHub connector's write tools
  (`merge_pull_request`/`push_files`) are why the merge gate is GitHub-native, not prompt/connector
  based. P3 replaces direct git write tools with a server-side proxy.

## Trigger composition (how a user builds the loop)
The user composes mono/multi-repo loops by configuring each role's triggers: **fire-URL** (HUD "run
now" / pull work), **GitHub events** (reactive), **cron** (heartbeat/sweep). One routine per role per
repo (or a role spanning repos via multiple triggers). This is the **"compose your dream team"**
surface; the parametric prompt composer that generates tuned prompts per setup is P4.

## Change protocol
Whenever the schema, connectors, or generation flow change: regenerate `docs/routines/*` **and** emit
paste-ready blocks so the operator can update the routines (rule enforced by `CLAUDE.md`).

## Naming
Role names are provisional (HUMAN.md Q-03) — easily renamed.
