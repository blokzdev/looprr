import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json } from "@/lib/agent-api";

// POST /api/agent/tickets/:id/claim — claim a planned ticket (Implementer). Sets claimed_by and moves
// planned → claimed (round-robin / single-owner). Refuses a ticket that is not claimable or is already
// claimed by another actor. This is the ADVISORY ownership record; the deterministic anti-race
// enforcement is the Supervisor's scope-aware dispatch + git (P2), not this row.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("claim")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot claim tickets.`);
  }

  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  const { data: current, error: readErr } = await db
    .from("tickets")
    .select("id, status, claimed_by, deleted_at")
    .eq("id", params.id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Ticket not found.");

  if (current.status !== "planned" && current.status !== "claimed") {
    return err(409, "not_claimable", `Ticket in status '${current.status}' is not claimable.`);
  }
  if (current.claimed_by && current.claimed_by !== actor) {
    return err(409, "already_claimed", `Ticket already claimed by ${current.claimed_by}.`);
  }

  const { error: updErr } = await db
    .from("tickets")
    .update({ status: "claimed", claimed_by: actor, last_worker: actor })
    .eq("id", current.id);
  if (updErr) return err(500, "claim_failed", updErr.message);

  await audit(db, actor, "claim", current.id, { from: current.status });
  return json({ id: current.id, status: "claimed", claimed_by: actor });
}
