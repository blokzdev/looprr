import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authenticateAgent, type Verb, type AgentId } from "./agent-auth";

// Distinct per-agent tokens (length-distinct so a constant-time compare can never cross-match).
const TOKENS: Record<AgentId, string> = {
  planner: "planner-token-0000000000000000000000000000",
  implementer: "implementer-token-11111111111111111111111111111",
  reviewer: "reviewer-token-222222222222222222222222222222222",
  supervisor: "supervisor-token-3333333333333333333333333333333333",
};

// The verb scope each agent is granted (mirrors VERBS in agent-auth.ts).
const EXPECTED_VERBS: Record<AgentId, Verb[]> = {
  planner: ["ledger", "comment", "dedup", "create_ticket"],
  implementer: ["ledger", "comment", "claim", "push_commit", "open_pr", "transition_status"],
  reviewer: ["ledger", "comment", "review_targets", "run_tests", "read_ci", "flag", "transition_status"],
  supervisor: ["ledger", "comment", "sequence", "reconcile_harness", "request_review", "merge", "deploy"],
};

const ALL_VERBS: Verb[] = [
  "ledger",
  "comment",
  "dedup",
  "create_ticket",
  "claim",
  "push_commit",
  "open_pr",
  "transition_status",
  "review_targets",
  "run_tests",
  "read_ci",
  "flag",
  "sequence",
  "reconcile_harness",
  "request_review",
  "merge",
  "deploy",
];

function reqWith(auth?: string): Request {
  return new Request("http://localhost/api/agent/tickets", {
    headers: auth ? { authorization: auth } : {},
  });
}

describe("authenticateAgent", () => {
  beforeEach(() => {
    process.env.LOOPRR_AGENT_TOKEN_PLANNER = TOKENS.planner;
    process.env.LOOPRR_AGENT_TOKEN_IMPLEMENTER = TOKENS.implementer;
    process.env.LOOPRR_AGENT_TOKEN_REVIEWER = TOKENS.reviewer;
    process.env.LOOPRR_AGENT_TOKEN_SUPERVISOR = TOKENS.supervisor;
  });
  afterEach(() => {
    delete process.env.LOOPRR_AGENT_TOKEN_PLANNER;
    delete process.env.LOOPRR_AGENT_TOKEN_IMPLEMENTER;
    delete process.env.LOOPRR_AGENT_TOKEN_REVIEWER;
    delete process.env.LOOPRR_AGENT_TOKEN_SUPERVISOR;
  });

  it.each(
    (["planner", "implementer", "reviewer", "supervisor"] as AgentId[]).map((id) => [id] as const),
  )("authenticates the %s token and grants exactly its verb scope", (id) => {
    const agent = authenticateAgent(reqWith(`Bearer ${TOKENS[id]}`));
    expect(agent).not.toBeNull();
    expect(agent!.id).toBe(id);
    for (const verb of EXPECTED_VERBS[id]) expect(agent!.can(verb)).toBe(true);
    for (const verb of ALL_VERBS.filter((v) => !EXPECTED_VERBS[id].includes(v))) {
      expect(agent!.can(verb)).toBe(false);
    }
  });

  // Load-bearing least-privilege denials (ROADMAP G1): trust-sized verb scopes hold.
  it("denies cross-role verbs that would break the trust model", () => {
    const planner = authenticateAgent(reqWith(`Bearer ${TOKENS.planner}`))!;
    const implementer = authenticateAgent(reqWith(`Bearer ${TOKENS.implementer}`))!;
    const reviewer = authenticateAgent(reqWith(`Bearer ${TOKENS.reviewer}`))!;
    // Planner ingests the most untrusted text → no code, no merge.
    expect(planner.can("push_commit")).toBe(false);
    expect(planner.can("merge")).toBe(false);
    // Implementer writes code but cannot merge (only the gated Supervisor executes merges).
    expect(implementer.can("merge")).toBe(false);
    // Reviewer flags, never merges or pushes code.
    expect(reviewer.can("merge")).toBe(false);
    expect(reviewer.can("push_commit")).toBe(false);
    expect(reviewer.can("create_ticket")).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    expect(authenticateAgent(reqWith())).toBeNull();
  });

  it("rejects a malformed / non-bearer header", () => {
    expect(authenticateAgent(reqWith(TOKENS.planner))).toBeNull(); // no "Bearer " prefix
    expect(authenticateAgent(reqWith("Basic abc123"))).toBeNull();
  });

  it("rejects an unknown token", () => {
    expect(authenticateAgent(reqWith("Bearer definitely-not-a-configured-token"))).toBeNull();
  });

  it("does not match an agent whose token env var is unset", () => {
    delete process.env.LOOPRR_AGENT_TOKEN_SUPERVISOR;
    expect(authenticateAgent(reqWith(`Bearer ${TOKENS.supervisor}`))).toBeNull();
  });

  it("accepts a lowercase bearer scheme (case-insensitive)", () => {
    expect(authenticateAgent(reqWith(`bearer ${TOKENS.implementer}`))?.id).toBe("implementer");
  });
});
