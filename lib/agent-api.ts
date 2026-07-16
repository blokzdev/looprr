import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Shared helpers + policy for the governed LoopRR agent API (`app/api/agent/*`). Ported from Knovo's
// lib/worker-api.ts and re-pointed to the ticket model. The API is the single DB write boundary;
// these helpers keep the per-action policy in ONE place so routes stay thin and auditable.
//
// Governance honesty (DECISIONS D-03): `merged` is the GitHub-native gate (branch protection +
// required review + live CI-green), never a bare DB write — so it is NOT a worker-reachable
// transition. A DB status is audit, never enforcement.

export type Db = SupabaseClient<Database>;
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type DirectiveAction = Database["public"]["Enums"]["directive_action"];

// ── Response helpers (web-standard Response — framework-agnostic + unit-testable; a Next.js App
//    Router route handler may return a plain Response, so no next/server coupling) ───────────────
export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
export function err(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

// ── Slug ─────────────────────────────────────────────────────────────────────
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "ticket"
  );
}

// Resolve a unique ticket slug (append a short numeric suffix on collision).
export async function uniqueSlug(db: Db, base: string): Promise<string> {
  const root = slugify(base);
  const { data } = await db.from("tickets").select("slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// ── Directives (human→agent instructions) + queue logic ──────────────────────
export type OpenDirective = { action: DirectiveAction | null; merge_after: boolean };

// "Actionable" = has an action OR is flagged merge_after. A plain note (no action, no merge_after) is
// a human record, not an agent task — it never enters the queue and never authorizes a gated action.
export function isActionableDirective(d: OpenDirective): boolean {
  return d.action !== null || d.merge_after;
}

// Open, actionable directives currently attached to a ticket.
export async function openDirectives(db: Db, ticketId: string): Promise<OpenDirective[]> {
  const { data } = await db
    .from("directives")
    .select("action, merge_after")
    .eq("ticket_id", ticketId)
    .eq("status", "open");
  return (data ?? [])
    .map((r) => ({ action: r.action, merge_after: r.merge_after }))
    .filter(isActionableDirective);
}

// ── Transition policy ─────────────────────────────────────────────────────────
// Status targets a routine may set via the API. The human owns approved / changes_requested /
// rejected (data-model.md); `merged` is the GitHub-native gate (D-03) and is deliberately NOT here —
// no DB write can merge. `draft` is the create state, not a transition target.
// NOTE (P2): the reviewer-flag → changes_requested loop-back wiring and the merge subsystem land in
// Phase 2 (close-the-loop); this is the P1.2 baseline policy.
const WORKER_TARGETS: ReadonlySet<TicketStatus> = new Set<TicketStatus>([
  "planned",
  "claimed",
  "in_progress",
  "in_review",
  "archived",
]);
export function isWorkerTransitionAllowed(to: TicketStatus): boolean {
  return WORKER_TARGETS.has(to);
}

// Actions that direct a change to the ticket/work — used to authorize touching a MERGED ticket.
export const EDIT_ACTIONS: ReadonlySet<DirectiveAction> = new Set<DirectiveAction>([
  "revise",
  "split",
  "reprioritize",
  "reassign",
]);

// A MERGED ticket is "live" (the work landed): editing it requires an open directing action, and
// archiving it requires an explicit 'archive' directive (the human asked for it). Mirrors Knovo's
// edit/archive-live gates, re-pointed from "published" to "merged".
export function editMergedAuthorized(directives: OpenDirective[]): boolean {
  return directives.some((d) => d.action !== null && EDIT_ACTIONS.has(d.action));
}
export function archiveMergedAuthorized(directives: OpenDirective[]): boolean {
  return directives.some((d) => d.action === "archive");
}

// ── Recoverability + audit (write on EVERY mutation) ──────────────────────────
// Snapshot the ticket's current doc into revision history BEFORE a content write.
export async function snapshotRevision(
  db: Db,
  ticket: { id: string; schema_version: number; doc: unknown; title: string; summary: string | null },
  createdBy: string,
  note?: string,
): Promise<void> {
  await db.from("revisions").insert({
    ticket_id: ticket.id,
    schema_version: ticket.schema_version,
    doc: ticket.doc as Database["public"]["Tables"]["revisions"]["Insert"]["doc"],
    title: ticket.title,
    summary: ticket.summary,
    note: note ?? null,
    created_by: createdBy,
  });
}

export async function audit(
  db: Db,
  actor: string,
  action: string,
  ticketId: string | null,
  detail?: Record<string, unknown>,
  runId?: string | null,
): Promise<void> {
  await db.from("audit_log").insert({
    actor,
    action,
    ticket_id: ticketId,
    run_id: runId ?? null,
    detail: (detail ?? null) as Database["public"]["Tables"]["audit_log"]["Insert"]["detail"],
  });
}
