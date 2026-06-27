# Coordination Model — GitHub bus + forum/ledger

How the team coordinates as **a single structured stateful loop across repos**, without write-races,
without trusting injection channels, and with a real merge gate.

## Work assignment — pull, never push-command
The human files a **directive** in the HUD (two-axis: `action × merge_after`, inherited verbatim from
Knovo's directive-as-data queue). Workers **pull** `/api/agent/queue` on each tick and claim work.
**Pull-on-session-start is a hard invariant** (D-09): the fire-URL `text` payload is an injection
channel — opaque nudge text, never parsed as a command.

## State / coordination bus = GitHub
- **Feature branches are the no-race boundary.** Coordination is by PRs, not shared file paths. This
  replaces Knovo's "workers never write the repo / subfolder-scoping" rule — `claude/<ticket>`
  branches let multiple Implementers work concurrently with no merge race.
- **The git commit DAG is the per-repo temporal backbone**; **PR state is the work-item state machine**
  (open → review → changes-requested → approved → merged).
- **`routine_runs`** (inherited, Knovo migration 0010) correlates each dispatch to a Claude session
  deep link, so the HUD can "open the session" behind any ledger row.

## Spatial coordination — presence + the assignment gate (the moat above git)
Git's isolation is **branch-level** (the no-race boundary for *merge*); it has **no file-grained
"someone is working here" awareness** for async agents. LoopRR adds that plane on top of the ledger
(full design + schema: `memory-and-ledger.md` → "Resource claims"; grounding: `research-grounding.md`):
- **Presence (advisory).** Before editing, a worker `check_out`s a scope (file/glob/dir/module/ticket);
  the API records a `resource_claim` and **returns conflicts**. On done it `check_in`s (or claims
  release implicitly on `clock_out`). Stale claims (no heartbeat) auto-expire.
- **The assignment gate (deterministic enforcement).** The real enforcement is **not** trusting
  workers to honor an advisory lock — it's that the **Supervisor/queue never dispatches a ticket whose
  scope overlaps an `active` claim** (scope-aware round-robin). Determinism lives in *assignment*, in
  the API — the same boundary-not-prompt pattern as the merge gate (SemaClaw's PermissionBridge).
- **Collaboration is opt-in.** A directive may permit a *co-claim* on a held scope; the gate then
  allows the overlap. "Unless intentionally coordinating" is a first-class case.
- **Git is the safety net.** A missed collision is at worst a *merge conflict the Reviewer/Supervisor
  resolves* on separate branches — never a corrupted `main`. So this plane is an **optimization to
  avoid wasted work + conflicts**, not a correctness mechanism — marketed as *coordinated awareness*,
  not distributed locking (no overselling, inv. 5).

## The merge gate (the product's "publish") — GitHub-native (D-03)
- **Enforced** by GitHub branch protection + required reviews on protected branches; routines can push
  `claude/*` only ("allow unrestricted pushes" disabled).
- **CI-green is read live at merge time** against the required-check set — a new subsystem, not a Knovo
  re-point (Knovo's `publishAuthorized` was a pure DB-status function with no external signal).
- The DB `mergeAuthorized` record is **audit + the human-directive trail**, not the gate.
- `merge`/`deploy` are the new "publish" verbs — always behind the human gate.

## Concurrency & reliability
- **Single-writer for shared layers.** The Supervisor is the only actor that executes merges and
  reconciles the shared harness layer; it `git pull --rebase`es before any shared-layer write
  (inherited Supervisor concurrency rule). This is why the **Supervisor ships minimal in P2, not
  later** — you can't claim "branch is the no-race boundary" without the reconciling actor.
- **Best-effort events, reconciling sweep.** GitHub webhooks are rate-capped/dropped; a **≥1h
  heartbeat sweep** re-derives PR/ticket state by polling so dropped events self-heal.
- **Loop-back cap.** Reviewer↔Implementer iterations are capped with human escalation after N rounds
  (a livelock starves the user's shared daily run cap — a cost-control red line).

## Cross-repo coordination
Multiple repos coordinate by each writing to **one governed ledger + ticket store** (the Postgres
boundary), keyed by `(repo, branch, worktree)`. A ticket in repo A can reference an upstream ref in
repo B. **Honesty:** this is *shared-ledger* cross-repo coordination, **not** a cross-repo *causal
graph* — the latter needs a graph store and is backlog. Don't market the causal version as built.

## The forum (repurposed Knovo blog/comments)
Knovo's admin **directive comments** + public **`reader_comments`** repurpose into LoopRR's
human↔agent communication surface and audit feed:
- **Today / P2:** the **human→agent directive feed** + the agent→human flag/status channel + the
  audit log. This is the shipped scope.
- **Roadmap (not shipped, don't claim):** structured **inter-agent** forum threads (agents
  negotiating/escalating/handing off through the forum) — unscoped; either build it or rename the
  pitch. Inter-agent handoff today is async via the ledger + GitHub events.

## Round-Robin scheduling
Claimable tickets are distributed **round-robin** across available workers by the Supervisor/queue;
the ledger's `(worker, last_seen)` view informs fair load-balancing. (`memory-and-ledger.md`.)
