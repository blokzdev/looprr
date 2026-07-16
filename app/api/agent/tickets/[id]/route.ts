import { z } from "zod";
import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, editMergedAuthorized, err, json, openDirectives, snapshotRevision } from "@/lib/agent-api";
import { CURRENT_SCHEMA_VERSION, safeParseTicketDoc } from "@/lib/ticket-schema";

const patchBody = z.object({
  doc: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});

// PATCH /api/agent/tickets/:id — update a ticket's doc in place (Planner). Re-validates shape,
// snapshots the prior version to `revisions` (recoverability), audits. Editing a MERGED ticket (the
// "live" state — the work landed) additionally requires an open directing directive.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("update_ticket")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot update tickets.`);
  }

  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { doc, note } = parsed.data;

  const { id } = await params;
  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  const { data: current, error: readErr } = await db
    .from("tickets")
    .select("id, schema_version, doc, title, summary, status, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Ticket not found.");

  if (current.status === "merged") {
    const directives = await openDirectives(db, current.id);
    if (!editMergedAuthorized(directives)) {
      return err(403, "needs_directive", "Editing a merged ticket requires an open directing directive (revise/split/reprioritize/reassign).");
    }
  }

  const version = Number(
    (doc as { schemaVersion?: number }).schemaVersion ?? current.schema_version ?? CURRENT_SCHEMA_VERSION,
  );
  const docCheck = safeParseTicketDoc(version, doc);
  if (!docCheck.success) {
    const message =
      typeof docCheck.error === "string"
        ? docCheck.error
        : docCheck.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(422, "invalid_document", message);
  }
  const validDoc = docCheck.data;

  // Snapshot the prior version before overwriting.
  await snapshotRevision(db, current, actor, note);

  const { error: updErr } = await db
    .from("tickets")
    .update({
      doc: validDoc as never,
      title: validDoc.title,
      summary: validDoc.summary,
      schema_version: version,
      last_worker: actor,
    })
    .eq("id", current.id);
  if (updErr) return err(500, "update_failed", updErr.message);

  await audit(db, actor, "update_ticket", current.id, { note: note ?? null });
  return json({ id: current.id, status: current.status });
}

// DELETE /api/agent/tickets/:id — soft-delete a ticket (Planner). Sets deleted_at (recoverable) and
// audits. Hard deletes never happen (invariant #2: soft-delete only; every mutation audited).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("update_ticket")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot delete tickets.`);
  }

  const { id } = await params;
  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  const { data: current, error: readErr } = await db
    .from("tickets")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return err(500, "read_failed", readErr.message);
  if (!current || current.deleted_at) return err(404, "not_found", "Ticket not found.");

  const { error: delErr } = await db
    .from("tickets")
    .update({ deleted_at: new Date().toISOString(), last_worker: actor })
    .eq("id", current.id);
  if (delErr) return err(500, "delete_failed", delErr.message);

  await audit(db, actor, "soft_delete", current.id);
  return json({ id: current.id, deleted: true });
}
