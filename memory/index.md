# Memory index

Durable, cross-session facts for building LoopRR. **Verify before trusting; self-heal on
contradiction.** Memory holds *facts*; `ROADMAP.md` holds *progress*; `HUMAN.md` is the human
channel. Each fact is a one-fact file under `facts/`; this index is the routing table.

Confidence tags: ✅ verified by Claude against real files/tools · ⚠️ from a research agent, unverified ·
🔵 design decision (see DECISIONS.md).

| ID | Fact | Conf | File |
|---|---|---|---|
| 0001 | Claude-Code routine platform constraints (no completion callback; single-account identity + shared daily cap; best-effort webhooks; fire-URL `text` payload) | ⚠️ | `facts/0001-platform-constraints.md` |
| 0002 | Knovo spine file facts (worker-auth 73 ln; worker-api 133 ln; migrations 0001–0011; queue endpoint) | ✅ | `facts/0002-knovo-spine.md` |
| 0003 | GitHub MCP exposes `merge_pull_request`/`push_files`/`create_or_update_file` as directly-callable write tools | ✅ | `facts/0003-github-mcp-write-tools.md` |
| 0004 | Research grounding: what to adopt from MIRIX/MAGMA/GAM/Mem0/SemaClaw | 🔵 | `facts/0004-research-grounding.md` |
| 0005 | Stack, env vars, and local-dev facts | 🔵 | `facts/0005-stack-and-env.md` |
| 0006 | Supabase MCP access — run SQL/migrations directly in build sessions ($0 projects, postgres role) | ✅ | `facts/0006-supabase-access.md` |
| 0007 | LoopRR Supabase projects (`looprr-dev`/`looprr-prod` refs) + free-tier 2-active cap (knovo-prod paused) + schema `0001` | ✅ | `facts/0007-looprr-dbs.md` |

## Standing reminders
- Phase 0 + P1.1 are **merged to `main`** (PR #1, 2026-07-16). D-01…D-09 frozen. Build proceeds per the loop.
- Two repos exist locally: `/home/user/Knovo` (the spine to port from; DBs now paused) and `/home/user/looprr` (this).
- Each subphase gets its own branch/PR now. This slice (P1.2): `claude/looprr-phase-1-continue-mcvfik`.
