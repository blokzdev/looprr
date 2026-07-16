import { z } from "zod";
import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, json } from "@/lib/agent-api";

export const dynamic = "force-dynamic";

const body = z.object({
  upstream: z
    .array(
      z.object({
        kind: z.enum(["client_request", "spec", "issue", "design_doc", "parent_ticket"]),
        uid: z.string().min(1),
      }),
    )
    .min(1),
});

// POST /api/agent/dedup — check upstream (kind, uid) keys against already-seen and previously-rejected
// tickets BEFORE drafting (Planner). Returns per-key { seen, rejected } so the Planner skips
// duplicates and never reopens a rejected request. Dedup is a property of the data, not the routine's
// memory (Knovo's pattern).
export async function POST(req: Request) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("dedup")) return err(403, "forbidden", `Agent '${agent.id}' cannot dedup.`);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));

  const db = createAdminClient();
  const results = await Promise.all(
    parsed.data.upstream.map(async (u) => {
      const [{ data: seen }, { data: rejected }] = await Promise.all([
        db.from("seen_upstream_keys").select("uid").eq("kind", u.kind).eq("uid", u.uid).maybeSingle(),
        db.from("rejected_upstream_keys").select("uid").eq("kind", u.kind).eq("uid", u.uid).maybeSingle(),
      ]);
      return { kind: u.kind, uid: u.uid, seen: Boolean(seen), rejected: Boolean(rejected) };
    }),
  );
  return json({ results });
}
