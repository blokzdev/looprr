import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, safeParseTicketDoc } from "./ticket-schema";

const validDoc = {
  schemaVersion: 1,
  title: "Add OAuth login",
  summary: "Let users sign in with GitHub OAuth.",
  goal: "A user can authenticate via GitHub and reach the dashboard.",
  acceptanceCriteria: ["Login button initiates OAuth", "Session persists across reloads"],
  plan: { steps: [{ title: "Wire the provider", detail: "next-auth GitHub provider" }] },
};

describe("safeParseTicketDoc", () => {
  it("accepts a well-formed v1 doc", () => {
    const res = safeParseTicketDoc(1, validDoc);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.title).toBe("Add OAuth login");
  });

  it("defaults schemaVersion + acceptanceCriteria when omitted", () => {
    const { schemaVersion, acceptanceCriteria, ...rest } = validDoc;
    const res = safeParseTicketDoc(CURRENT_SCHEMA_VERSION, rest);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.schemaVersion).toBe(1);
      expect(res.data.acceptanceCriteria).toEqual([]);
    }
  });

  it("rejects a doc missing required fields (goal)", () => {
    const { goal, ...missingGoal } = validDoc;
    const res = safeParseTicketDoc(1, missingGoal);
    expect(res.success).toBe(false);
  });

  it("rejects unknown keys (no-escape / strict)", () => {
    const res = safeParseTicketDoc(1, { ...validDoc, layoutHtml: "<div/>" });
    expect(res.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const res = safeParseTicketDoc(1, { ...validDoc, title: "" });
    expect(res.success).toBe(false);
  });

  it("rejects an unsupported schema version with a readable string error", () => {
    const res = safeParseTicketDoc(99, validDoc);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error).toBe("unsupported ticket schema version: 99");
  });
});
