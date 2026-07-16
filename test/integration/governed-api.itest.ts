import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { POST as createTicket } from "@/app/api/agent/tickets/route";
import { PATCH as patchTicket, DELETE as deleteTicket } from "@/app/api/agent/tickets/[id]/route";
import { POST as transitionStatus } from "@/app/api/agent/tickets/[id]/status/route";
import { POST as dedup } from "@/app/api/agent/dedup/route";
import { GET as queue } from "@/app/api/agent/queue/route";
import { POST as resolveDirective } from "@/app/api/agent/directives/[id]/resolve/route";

// End-to-end verification of the governed agent API against looprr-dev. Exercises the real write path
// (validate-shape → dedup → provenance → revision → audit → soft-delete) and the verb-scoped auth
// denials. Self-skips unless the Supabase env is present (see vitest.integration.config.ts).
// Everything created here is namespaced with an `itest-` slug / `ITEST-` uid and cleaned up.

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HAS_ENV = Boolean(URL && KEY);

// Arbitrary per-role tokens for the run (the routes only need them to resolve an identity).
const TOKENS = {
  planner: "itest-planner-tok-000000000000000000000000",
  implementer: "itest-implementer-tok-1111111111111111111111",
  reviewer: "itest-reviewer-tok-22222222222222222222222222",
  supervisor: "itest-supervisor-tok-3333333333333333333333333",
};

function req(token: string | null, body?: unknown): Request {
  return new Request("http://localhost/api/agent", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validDoc = {
  schemaVersion: 1,
  title: "ITEST ticket",
  summary: "An integration-test ticket.",
  goal: "Verify the governed loop end to end.",
  acceptanceCriteria: ["create → revision + audit", "dedup blocks duplicates"],
};

describe.skipIf(!HAS_ENV)("governed agent API (looprr-dev, end to end)", () => {
  let admin: SupabaseClient<Database>;
  let ticketId: string;

  beforeAll(async () => {
    process.env.LOOPRR_AGENT_TOKEN_PLANNER = TOKENS.planner;
    process.env.LOOPRR_AGENT_TOKEN_IMPLEMENTER = TOKENS.implementer;
    process.env.LOOPRR_AGENT_TOKEN_REVIEWER = TOKENS.reviewer;
    process.env.LOOPRR_AGENT_TOKEN_SUPERVISOR = TOKENS.supervisor;
    admin = createClient<Database>(URL!, KEY!, { auth: { persistSession: false } });
    await cleanup(admin);
  });

  afterAll(async () => {
    await cleanup(admin);
  });

  it("creates a draft ticket with provenance, an initial revision, and an audit row", async () => {
    const res = await createTicket(
      req(TOKENS.planner, {
        doc: validDoc,
        upstream: [{ kind: "issue", uid: "ITEST-1", role: "primary" }],
        slug: "itest-ticket",
        repo: "blokzdev/looprr",
      }),
    );
    expect(res.status).toBe(201);
    ticketId = (await res.json()).id;

    const [{ count: revs }, { count: audits }, { count: links }] = await Promise.all([
      admin.from("revisions").select("*", { count: "exact", head: true }).eq("ticket_id", ticketId),
      admin.from("audit_log").select("*", { count: "exact", head: true }).eq("ticket_id", ticketId).eq("action", "create_ticket"),
      admin.from("ticket_upstream_refs").select("*", { count: "exact", head: true }).eq("ticket_id", ticketId),
    ]);
    expect(revs).toBe(1);
    expect(audits).toBe(1);
    expect(links).toBe(1);
  });

  it("reports the primary upstream ref as seen, and blocks a duplicate draft", async () => {
    const dres = await dedup(req(TOKENS.planner, { upstream: [{ kind: "issue", uid: "ITEST-1" }] }));
    expect((await dres.json()).results[0].seen).toBe(true);

    const dup = await createTicket(
      req(TOKENS.planner, { doc: validDoc, upstream: [{ kind: "issue", uid: "ITEST-1", role: "primary" }] }),
    );
    expect(dup.status).toBe(409);
  });

  it("re-validates + snapshots a prior revision on update", async () => {
    const res = await patchTicket(
      req(TOKENS.planner, { doc: { ...validDoc, summary: "Edited summary." }, note: "tighten" }),
      { params: { id: ticketId } },
    );
    expect(res.status).toBe(200);
    const { count } = await admin.from("revisions").select("*", { count: "exact", head: true }).eq("ticket_id", ticketId);
    expect(count).toBe(2); // initial draft + pre-update snapshot
  });

  it("enforces verb-scoped denials (least privilege)", async () => {
    // Planner cannot transition status (no transition_status verb).
    const t = await transitionStatus(req(TOKENS.planner, { to: "in_review" }), { params: { id: ticketId } });
    expect(t.status).toBe(403);
    // Reviewer cannot create tickets (no create_ticket verb).
    const c = await createTicket(req(TOKENS.reviewer, { doc: validDoc, upstream: [{ kind: "issue", uid: "ITEST-9", role: "primary" }] }));
    expect(c.status).toBe(403);
    // Missing token → 401.
    const u = await dedup(req(null, { upstream: [{ kind: "issue", uid: "ITEST-1" }] }));
    expect(u.status).toBe(401);
  });

  it("surfaces an actionable directive in the queue, then drops it on resolve", async () => {
    const { data: dir } = await admin
      .from("directives")
      .insert({ ticket_id: ticketId, author: "admin:itest", note: "revise please", action: "revise", status: "open" })
      .select("id")
      .single();

    const q1 = await queue(req(TOKENS.implementer));
    const items1 = (await q1.json()).items as { directive_id: string }[];
    expect(items1.some((i) => i.directive_id === dir!.id)).toBe(true);

    const r = await resolveDirective(req(TOKENS.implementer, { status: "addressed" }), { params: { id: dir!.id } });
    expect(r.status).toBe(200);

    const q2 = await queue(req(TOKENS.implementer));
    const items2 = (await q2.json()).items as { directive_id: string }[];
    expect(items2.some((i) => i.directive_id === dir!.id)).toBe(false);
  });

  it("soft-deletes (recoverable) and then 404s", async () => {
    const del = await deleteTicket(req(TOKENS.planner), { params: { id: ticketId } });
    expect(del.status).toBe(200);
    const { data } = await admin.from("tickets").select("deleted_at").eq("id", ticketId).single();
    expect(data?.deleted_at).not.toBeNull();
    const again = await deleteTicket(req(TOKENS.planner), { params: { id: ticketId } });
    expect(again.status).toBe(404);
  });
});

// Remove test rows (tickets cascade to links/revisions/directives; upstream refs are deleted directly).
async function cleanup(admin: SupabaseClient<Database>) {
  await admin.from("tickets").delete().like("slug", "itest-%");
  await admin.from("upstream_refs").delete().like("uid", "ITEST-%");
}
