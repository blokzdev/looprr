import { z } from "zod";
import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  archiveMergedAuthorized,
  audit,
  err,
  isWorkerTransitionAllowed,
  json,
  openDirectives,
  type TicketStatus,
} from "@/lib/agent-api";

const body = z.object({
  to: z.enum(["planned", "claimed", "in_progress", "in_review", "archived"]),
  note: z.string().optional(),
});

// POST /api/agent/tickets/:id/status — move a ticket through the workflow (Implementer/Reviewer).
// Workers may target only worker-reachable statuses (the zod enum here mirrors WORKER_TARGETS; the
// human owns approved/changes_requested/rejected). `merged` is the GitHub-native gate (D-03) — never
// settable by a DB write. Archiving a MERGED ticket requires an 'archive' directive.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("transition_status")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot transition status.`);
  }

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const to = parsed.data.to as TicketStatus;

  // Defense in depth: the zod enum already restricts `to`, but re-check against the policy set so the
  // route and lib can never drift.
  if (!isWorkerTransitionAllowed(to)) {
    return err(403, "transition_forbidden", `Workers cannot set status '${to}'.`);
  }

  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  const { data: current, error: readErr } = await db
    .from("tickets")
    .select("id, status, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Ticket not found.");

  if (to === "archived" && current.status === "merged") {
    const directives = await openDirectives(db, current.id);
    if (!archiveMergedAuthorized(directives)) {
      return err(403, "archive_not_authorized", "Archiving a merged ticket requires an 'archive' directive.");
    }
  }

  const { error: updErr } = await db
    .from("tickets")
    .update({ status: to, last_worker: actor })
    .eq("id", current.id);
  if (updErr) return err(500, "update_failed", updErr.message);

  await audit(db, actor, `status:${to}`, current.id, { from: current.status, note: parsed.data.note ?? null });
  return json({ id: current.id, status: to });
}
