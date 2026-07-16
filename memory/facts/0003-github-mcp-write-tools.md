# 0003 — GitHub MCP exposes git write tools directly ✅ VERIFIED

Verified by Claude from the session's own available-tools list (2026-06-27). This is the basis of
D-03 (the merge gate must be GitHub-native, not DB-side).

The `mcp__github__*` connector exposes, among others, these **directly-callable write tools** (no
per-action human prompt during a routine run):
- `mcp__github__merge_pull_request`
- `mcp__github__push_files`
- `mcp__github__create_or_update_file`
- `mcp__github__create_pull_request`, `update_pull_request`, `create_branch`, `delete_file`,
  `merge_pull_request`, `enable_pr_auto_merge`, `add_issue_comment`, `issue_write`, …

Implication: a prompt-injected or over-eager routine holding the GitHub connector could merge to
`main` or push directly, **bypassing any DB-side `mergeAuthorized` check**. Therefore:
- The **enforced** merge gate is GitHub branch protection + required reviews; routines may push
  `claude/*` only.
- DB `mergeAuthorized` is audit/bookkeeping only.
- P3: replace direct git write tools with a **read-only GitHub MCP + a server-side git-write proxy**
  holding the GitHub App token, so routines carry no git write tools at all.

See `foundation/security-and-privacy.md` and `coordination.md`.
