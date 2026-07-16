import { timingSafeEqual } from "crypto";

// Per-agent bearer-token auth for the governed LoopRR API. Each routine worker holds a token
// (in the user's routine env, server-compared here) that maps to an agent identity and a fixed set
// of allowed verbs. Least-privilege is enforced by the API per agent — NOT by the connector or the
// prompt (DECISIONS #3; ported from Knovo's lib/worker-auth.ts). Trust-sizing: the role that ingests
// the most untrusted text (Planner) gets the smallest verb set.

export type AgentId = "planner" | "implementer" | "reviewer" | "supervisor";

export type Verb =
  // shared
  | "ledger" // write clock/heartbeat/check events (all roles)
  | "comment"
  | "pull_queue" // pull the work queue on session start (all roles; DECISIONS #4 / D-09)
  // planner
  | "dedup"
  | "create_ticket"
  | "update_ticket"
  // implementer
  | "claim"
  | "push_commit"
  | "open_pr"
  | "transition_status"
  // reviewer
  | "review_targets"
  | "run_tests"
  | "read_ci"
  | "flag"
  // supervisor (merge/deploy are gated by the GitHub-native gate; the DB verb is the audit record)
  | "sequence"
  | "reconcile_harness"
  | "request_review"
  | "merge"
  | "deploy";

const VERBS: Record<AgentId, ReadonlySet<Verb>> = {
  // Planner: pull the queue, ground & draft/refine tickets. No code, no merge. Lowest trust →
  // smallest set (still smallest even with the ticket-doc verbs — none touch code or merge).
  planner: new Set<Verb>([
    "ledger",
    "comment",
    "pull_queue",
    "dedup",
    "create_ticket",
    "update_ticket",
  ]),
  // Implementer: claim a ticket, push to its own claude/* branch, open a PR, move status. No merge.
  implementer: new Set<Verb>([
    "ledger",
    "comment",
    "pull_queue",
    "claim",
    "push_commit",
    "open_pr",
    "transition_status",
  ]),
  // Reviewer: run tests, read CI, flag issues (flag-not-fix), move status. No create, no merge.
  reviewer: new Set<Verb>([
    "ledger",
    "comment",
    "pull_queue",
    "review_targets",
    "run_tests",
    "read_ci",
    "flag",
    "transition_status",
  ]),
  // Supervisor / Tech-Lead: sequence work, reconcile the harness, request review, and execute the
  // merge/deploy — but only behind the human-directed, GitHub-native gate (the verb is the audit
  // record, not the enforcement; DECISIONS #3).
  supervisor: new Set<Verb>([
    "ledger",
    "comment",
    "pull_queue",
    "sequence",
    "reconcile_harness",
    "request_review",
    "merge",
    "deploy",
  ]),
};

function tokenFor(agent: AgentId): string | undefined {
  switch (agent) {
    case "planner":
      return process.env.LOOPRR_AGENT_TOKEN_PLANNER;
    case "implementer":
      return process.env.LOOPRR_AGENT_TOKEN_IMPLEMENTER;
    case "reviewer":
      return process.env.LOOPRR_AGENT_TOKEN_REVIEWER;
    case "supervisor":
      return process.env.LOOPRR_AGENT_TOKEN_SUPERVISOR;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type Agent = { id: AgentId; can: (verb: Verb) => boolean };

// Resolve the Authorization bearer token to an agent identity (constant-time compare).
// Returns null when the header is missing/malformed or no configured token matches.
export function authenticateAgent(req: Request): Agent | null {
  const header = req.headers.get("authorization") ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const presented = m[1].trim();
  for (const id of ["planner", "implementer", "reviewer", "supervisor"] as const) {
    const expected = tokenFor(id);
    if (expected && expected.length > 0 && safeEqual(presented, expected)) {
      return { id, can: (verb: Verb) => VERBS[id].has(verb) };
    }
  }
  return null;
}
