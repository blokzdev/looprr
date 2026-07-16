# Security & Privacy

## Threat model
- **Autonomous writers acting on untrusted input.** Routines ingest issue/PR/request text (and run
  connectors) without per-action human approval. The blast radius must be bounded by the **API + git
  boundaries**, not by trust in the prompt.
- **A code-writing fleet.** A compromised/prompt-injected worker could try to merge to `main`,
  exfiltrate secrets, or push malicious code. The merge gate and least-privilege must hold against it.
- **(Future) multi-tenant.** TenantA must never read/write TenantB's data, secrets, or repos.

## The two load-bearing controls
**1. Governed API (DB boundary).** Workers never touch Supabase directly; they call `/api/agent/*`
with a **per-role verb-scoped bearer token** (`lib/agent-auth.ts`). The API (service-role,
server-only) validates ticket **shape** (zod, 422), enforces status transitions, audit-logs every
mutation, snapshots revisions, soft-deletes only. A leaked token does only that role's verbs.

**2. GitHub-native merge gate (git boundary) — the critical correction.** The GitHub MCP connector
exposes `merge_pull_request`, `push_files`, `create_or_update_file` as **directly-callable write
tools with no per-action prompt** — so a DB-side `mergeAuthorized` check is **bypassable** and is NOT
the gate. The enforced gate is GitHub-native:
- **Branch protection + required reviews** on protected branches.
- **Routines push `claude/*` branches only** ("allow unrestricted pushes" disabled).
- DB `mergeAuthorized` = audit/human-directive record only.
- **CI-green read live at merge time** against the required-check set (never a passed-in boolean —
  spoofable).
- **P3 hardening:** a **read-only GitHub MCP** + a **server-side git-write proxy** holding the GitHub
  App token, so routines carry no git write tools at all. Budgeted as a first-class build.

## Prompt-injection posture
- **Pull-on-session-start** (D-09): the worker pulls structured work from the API; the fire-URL `text`
  payload is **opaque nudge text, never parsed as a command**.
- Untrusted external text (issues, PR bodies, CI logs, request text) is data, not instructions.
- Least-privilege trust-sizing: the role ingesting the most untrusted text (Planner) has the smallest
  verb set (no code, no merge).

## Secrets
- **Zero secrets in the repo.** `.env.local` git-ignored; `.env.example` documents every var with
  empty values, kept in lockstep.
- `SUPABASE_SERVICE_ROLE_KEY` and the **GitHub App private key** are server-only env vars, never
  `NEXT_PUBLIC_`, never sent to the client, never held by a worker.
- **BYO-routine tokens live in the user's routine env** (their Claude app), not the LoopRR repo. The
  user holds their own `LOOPRR_AGENT_TOKEN_<ROLE>`. Caveat (inherited): Claude Code on the web has no
  separate secrets store, so these sit in (platform-non-secret) env vars visible to whoever can edit
  the environment — acceptable single-admin; tokens are verb-scoped + revocable; rotate if shared.

## Cost / runaway control (a red line)
The user's routines share **one account daily-run cap**. A Reviewer↔Implementer livelock would starve
the whole fleet — so loop-backs are capped with human escalation, and event-driven loops are
backstopped (not multiplied) by the reconciling sweep.

## Privacy / data
- The ledger stores **no PII by design** — actor is a role/worker id, not a person; `(repo, branch,
  worktree)` + refs are work coordinates. Clock-out is inferred ("last seen"), never surveillance of
  a human.
- Run-input capture (for replay) may include prompts/diffs — scoped to the tenant, never cross-tenant;
  retention/GC policy is a pre-Enterprise backlog item.

## Multi-tenant isolation (P5, security-critical)
Every RLS policy gains a tenant predicate; `is_admin()` → `is_tenant_admin(tenant_id)`; per-`(tenant,
role)` tokens resolved by the API; **per-tenant sandbox + scoped CI secrets + egress controls +
encryption-at-rest** ship *with* tenancy. The **TenantA-cannot-read/write-TenantB isolation test is
written FIRST** and runs in CI as the gating artifact (a missed predicate leaks cross-tenant data).

## Open questions
- Worker-token storage hardening (hashed-at-rest vs env compare) — inherited from Knovo.
- Whether the git-write proxy must land in P2 with the merge gate rather than P3 — revisit if the
  connector-bypass risk proves acute early.
- Confirm the platform constraints the controls assume (HUMAN.md Q-01).
