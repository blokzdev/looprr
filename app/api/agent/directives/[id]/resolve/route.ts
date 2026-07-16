import { z } from "zod";
import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json } from "@/lib/agent-api";

const body = z.object({
  status: z.enum(["addressed", "dismissed"]).default("addressed"),
  note: z.string().optional(),
});

// POST /api/agent/directives/:id/resolve — close out a directive after acting on it (any role, via
// the shared `comment` verb). Marks it addressed (default) or dismissed and stamps addressed_by/at, so
// the queue stops surfacing it. Audits against the ticket for traceability.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("comment")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot resolve directives.`);
  }

  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));

  const { id } = await params;
  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  const { data: current, error: readErr } = await db
    .from("directives")
    .select("id, ticket_id, status")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current) return err(404, "not_found", "Directive not found.");
  if (current.status !== "open") return err(409, "not_open", `Directive already ${current.status}.`);

  const { error: updErr } = await db
    .from("directives")
    .update({ status: parsed.data.status, addressed_at: new Date().toISOString(), addressed_by: actor })
    .eq("id", current.id);
  if (updErr) return err(500, "resolve_failed", updErr.message);

  await audit(db, actor, `directive:${parsed.data.status}`, current.ticket_id, {
    directive_id: current.id,
    note: parsed.data.note ?? null,
  });
  return json({ id: current.id, status: parsed.data.status });
}
