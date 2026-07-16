import { describe, expect, it } from "vitest";
import {
  archiveMergedAuthorized,
  editMergedAuthorized,
  isActionableDirective,
  isWorkerTransitionAllowed,
  slugify,
  type OpenDirective,
  type TicketStatus,
} from "./agent-api";

describe("slugify", () => {
  it("lowercases, strips punctuation, and hyphenates", () => {
    expect(slugify("Add OAuth login!")).toBe("add-oauth-login");
  });
  it("trims leading/trailing separators and collapses runs", () => {
    expect(slugify("  --Hello,   World--  ")).toBe("hello-world");
  });
  it("caps length at 80 chars", () => {
    expect(slugify("a".repeat(200)).length).toBe(80);
  });
  it("falls back to 'ticket' when nothing survives", () => {
    expect(slugify("!!!")).toBe("ticket");
    expect(slugify("")).toBe("ticket");
  });
});

describe("isWorkerTransitionAllowed (D-03: no DB merge; human owns approval)", () => {
  it("allows the worker-reachable statuses", () => {
    for (const s of ["planned", "claimed", "in_progress", "in_review", "archived"] as TicketStatus[]) {
      expect(isWorkerTransitionAllowed(s)).toBe(true);
    }
  });
  it("forbids merged (GitHub-native gate), approved/changes_requested/rejected (human), and draft", () => {
    for (const s of ["merged", "approved", "changes_requested", "rejected", "draft"] as TicketStatus[]) {
      expect(isWorkerTransitionAllowed(s)).toBe(false);
    }
  });
});

describe("isActionableDirective (queue filter)", () => {
  it("is actionable with an action", () => {
    expect(isActionableDirective({ action: "revise", merge_after: false })).toBe(true);
  });
  it("is actionable when flagged merge_after even with no action", () => {
    expect(isActionableDirective({ action: null, merge_after: true })).toBe(true);
  });
  it("is NOT actionable for a plain note (no action, no merge_after)", () => {
    expect(isActionableDirective({ action: null, merge_after: false })).toBe(false);
  });
});

describe("merged-ticket gates (editing/archiving 'live' work needs a directive)", () => {
  const none: OpenDirective[] = [];
  it("editMergedAuthorized requires an open directing action", () => {
    expect(editMergedAuthorized(none)).toBe(false);
    expect(editMergedAuthorized([{ action: "revise", merge_after: false }])).toBe(true);
    expect(editMergedAuthorized([{ action: "split", merge_after: false }])).toBe(true);
    // archive/merge_after alone do not authorize a content edit.
    expect(editMergedAuthorized([{ action: "archive", merge_after: false }])).toBe(false);
    expect(editMergedAuthorized([{ action: null, merge_after: true }])).toBe(false);
  });
  it("archiveMergedAuthorized requires an explicit 'archive' directive", () => {
    expect(archiveMergedAuthorized(none)).toBe(false);
    expect(archiveMergedAuthorized([{ action: "archive", merge_after: false }])).toBe(true);
    expect(archiveMergedAuthorized([{ action: "revise", merge_after: false }])).toBe(false);
  });
});
