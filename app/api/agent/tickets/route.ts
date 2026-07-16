import { z } from "zod";
import { authenticateAgent } from "@/lib/agent-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, err, json, snapshotRevision, uniqueSlug } from "@/lib/agent-api";
import { CURRENT_SCHEMA_VERSION, safeParseTicketDoc } from "@/lib/ticket-schema";

export const dynamic = "force-dynamic";

const upstreamInput = z.object({
  kind: z.enum(["client_request", "spec", "issue", "design_doc", "parent_ticket"]),
  uid: z.string().min(1),
  url: z.string().optional(),
  title: z.string().optional(),
  detail: z.string().optional(),
  raw_meta: z.unknown().optional(),
  role: z.enum(["primary", "supporting"]).default("supporting"),
  note: z.string().optional(),
});

const createBody = z
  .object({
    doc: z.record(z.string(), z.unknown()),
    upstream: z.array(upstreamInput).min(1),
    slug: z.string().optional(),
    repo: z.string().optional(),
    branch: z.string().optional(),
  })
  .refine((b) => b.upstream.some((u) => u.role === "primary"), {
    message: "at least one primary upstream ref is required",
  });

// POST /api/agent/tickets — create a new DRAFT ticket (Planner). Validates the ticket doc SHAPE
// against the versioned zod schema (D-08 — never a correctness gate), blocks re-drafting of a
// seen/rejected primary upstream ref (dedup), records provenance, snapshots an initial revision, and
// audits. Ported from Knovo's worker artifacts POST, re-pointed to the ticket model.
export async function POST(req: Request) {
  const agent = authenticateAgent(req);
  if (!agent) return err(401, "unauthorized", "Missing or invalid agent token.");
  if (!agent.can("create_ticket")) {
    return err(403, "forbidden", `Agent '${agent.id}' cannot create tickets.`);
  }

  const parsed = createBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err(400, "bad_request", parsed.error.issues.map((i) => i.message).join("; "));
  const { doc } = parsed.data;

  // Dedupe the upstream list by (kind, uid) so a repeated ref can't produce a duplicate provenance
  // link (ticket_upstream_refs PK is (ticket_id, upstream_ref_id)). Keep the strongest role (primary).
  const upstreamMap = new Map<string, (typeof parsed.data.upstream)[number]>();
  for (const u of parsed.data.upstream) {
    const key = `${u.kind}:${u.uid}`;
    const existing = upstreamMap.get(key);
    if (!existing || (u.role === "primary" && existing.role !== "primary")) upstreamMap.set(key, u);
  }
  const upstream = [...upstreamMap.values()];

  const db = createAdminClient();
  const actor = `agent:${agent.id}`;
  // Best-effort observability: record drafts the API *rejects* (validation/dedup) as audit-only rows
  // (no ticket, no content mutation) so the HUD can count drops. Never changes the response contract.
  const observe = (action: string, detail: Record<string, unknown>) =>
    audit(db, actor, action, null, detail).catch(() => {});

  const version = Number((doc as { schemaVersion?: number }).schemaVersion ?? CURRENT_SCHEMA_VERSION);
  const docCheck = safeParseTicketDoc(version, doc);
  if (!docCheck.success) {
    const message =
      typeof docCheck.error === "string"
        ? docCheck.error
        : docCheck.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    await observe("validation_rejected", { reason: message.slice(0, 500) });
    return err(422, "invalid_document", message);
  }
  const validDoc = docCheck.data;

  // Dedup the PRIMARY upstream ref against already-seen and previously-rejected keys.
  const primary = upstream.find((u) => u.role === "primary")!;
  const [{ data: rejected }, { data: seen }] = await Promise.all([
    db.from("rejected_upstream_keys").select("uid").eq("kind", primary.kind).eq("uid", primary.uid).maybeSingle(),
    db.from("seen_upstream_keys").select("uid").eq("kind", primary.kind).eq("uid", primary.uid).maybeSingle(),
  ]);
  if (rejected) {
    await observe("dedup_suppressed", { upstream: `${primary.kind}:${primary.uid}`, reason: "rejected" });
    return err(409, "rejected_upstream", `Primary upstream ${primary.kind}:${primary.uid} was previously rejected; not re-drafted.`);
  }
  if (seen) {
    await observe("dedup_suppressed", { upstream: `${primary.kind}:${primary.uid}`, reason: "duplicate" });
    return err(409, "duplicate_upstream", `Primary upstream ${primary.kind}:${primary.uid} already grounds an existing ticket.`);
  }

  // Upsert upstream refs (idempotent on the dedup key) and collect their ids.
  const refIds: { id: string; role: "primary" | "supporting"; note?: string }[] = [];
  for (const u of upstream) {
    const { data: row, error } = await db
      .from("upstream_refs")
      .upsert(
        {
          kind: u.kind,
          uid: u.uid,
          url: u.url ?? null,
          title: u.title ?? null,
          detail: u.detail ?? null,
          raw_meta: (u.raw_meta ?? null) as never,
        },
        { onConflict: "kind,uid" },
      )
      .select("id")
      .single();
    if (error || !row) return err(500, "upstream_write_failed", error?.message ?? "upstream upsert failed");
    refIds.push({ id: row.id, role: u.role, note: u.note });
  }

  const slug = await uniqueSlug(db, parsed.data.slug ?? validDoc.title);
  const branch = parsed.data.branch ?? `claude/${slug}`;
  const { data: ticket, error: tErr } = await db
    .from("tickets")
    .insert({
      slug,
      title: validDoc.title,
      summary: validDoc.summary,
      status: "draft",
      schema_version: version,
      doc: validDoc as never,
      repo: parsed.data.repo ?? null,
      branch,
      last_worker: actor,
    })
    .select("id, slug, status")
    .single();
  if (tErr || !ticket) return err(500, "ticket_write_failed", tErr?.message ?? "ticket insert failed");

  const { error: linkErr } = await db.from("ticket_upstream_refs").insert(
    refIds.map((r) => ({
      ticket_id: ticket.id,
      upstream_ref_id: r.id,
      role: r.role,
      note: r.note ?? null,
    })),
  );
  if (linkErr) return err(500, "provenance_write_failed", linkErr.message);

  await snapshotRevision(
    db,
    { id: ticket.id, schema_version: version, doc: validDoc, title: validDoc.title, summary: validDoc.summary },
    actor,
    "initial draft",
  );
  await audit(db, actor, "create_ticket", ticket.id, { slug });

  return json({ id: ticket.id, slug: ticket.slug, status: ticket.status }, 201);
}
