import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, isActionableDirective, json, type DirectiveAction } from "@/lib/agent-api";

export const dynamic = "force-dynamic";

type TicketEmbed = { id: string; slug: string; title: string; status: string; deleted_at: string | null };
type QueueRow = {
  id: string;
  note: string | null;
  action: DirectiveAction | null;
  merge_after: boolean;
  options: unknown;
  created_at: string;
  // PostgREST returns a to-one embed as an object; tolerate an array shape defensively.
  ticket: TicketEmbed | TicketEmbed[] | null;
};

// GET /api/agent/queue — the agent work queue: open, actionable human directives paired with their
// ticket. A routine PULLS this on session start (DECISIONS #4 / D-09) and acts. Only actionable
// directives (an action OR merge_after) surface; plain notes and directives on soft-deleted tickets
// are skipped. Ported verbatim from Knovo's /worker/queue, re-pointed to directives + tickets.
export async function GET(req: Request) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("pull_queue")) return err(403, "forbidden", `Agent '${agent.id}' cannot read the queue.`);

  const db = createAdminClient();
  const { data, error } = await db
    .from("directives")
    .select("id, note, action, merge_after, options, created_at, ticket:tickets(id, slug, title, status, deleted_at)")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) return err(500, "queue_read_failed", error.message);

  // Normalize the embedded ticket: a to-one FK returns an object, but tolerate an array shape too so
  // the queue can never silently empty out on a PostgREST/client embed-shape difference.
  const items = ((data ?? []) as unknown as QueueRow[])
    .map((r) => ({ ...r, ticket: Array.isArray(r.ticket) ? (r.ticket[0] ?? null) : r.ticket }))
    .filter(
      (r) =>
        r.ticket &&
        r.ticket.deleted_at === null &&
        isActionableDirective({ action: r.action, merge_after: r.merge_after }),
    )
    .map((r) => ({
      directive_id: r.id,
      action: r.action,
      merge_after: r.merge_after,
      note: r.note,
      options: r.options ?? null,
      created_at: r.created_at,
      ticket: r.ticket && {
        id: r.ticket.id,
        slug: r.ticket.slug,
        title: r.ticket.title,
        status: r.ticket.status,
      },
    }));
  return json({ items });
}
