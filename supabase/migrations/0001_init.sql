-- 0001_init.sql — LoopRR foundation schema (P1.2)
--
-- Repoints Knovo's governance-spine schema *shape* to LoopRR's coordination model. The unit of work
-- becomes a `ticket` (was Knovo `artifacts`); provenance/dedup becomes `upstream_refs` (was
-- `sources`), keyed UNIQUE(kind, uid); the human→agent instruction becomes a `directive` (was the
-- admin `comments` table), two-axis: action × merge_after. Recoverability + audit come across
-- verbatim (`revisions`, `audit_log`), plus `routine_runs` (Knovo migration 0010) for the
-- "Open the Claude session" deep link. See foundation/data-model.md and foundation/knovo-reuse.md.
--
-- Governance model (D-01/D-03/D-10): routine workers reach the DB ONLY through the governed LoopRR
-- API, which authenticates as the service-role (bypasses RLS) and is the single write chokepoint that
-- validates ticket *shape*, enforces transitions, snapshots revisions, audit-logs, and soft-deletes.
-- The `merged` status is NOT reachable by a DB write alone — the real merge gate is GitHub-native
-- (branch protection + required reviews + live CI-green), so a DB status is audit, never enforcement.
--
-- Baked-in operational lessons from Knovo's *unrun* spine (P1 hardens the borrowed spine):
--   • service_role gets explicit table grants HERE (Knovo hit "permission denied for table" the first
--     time the loop ran and had to back-fill in 0009 — the modern Data API default revokes the
--     auto-exposed grants, so we grant up front).
--   • every function pins `search_path` (Knovo hardened this after the fact in 0002/0003).
--   • RLS is ENABLED on every table from creation (default-deny; no browser/admin policies yet — those
--     land in P1.3 with the HUD/auth). The agent path is service-role, which bypasses RLS by design.
--
-- tenant_id is intentionally OMITTED here: single-operator first (D-06 sequence wall). The tenant
-- discriminator + isolation-first test land in P5, when a second principal is in sight.

-- gen_random_uuid() is built into Postgres core (>= 13); looprr-dev/-prod are PG17, so no pgcrypto
-- extension is needed (keeps the public schema free of an extension the advisors would flag).

-- ── Enums ──────────────────────────────────────────────────────────────────────
-- Ticket lifecycle. Worker-reachable transitions are a strict subset (see lib/agent-api.ts):
-- draft → planned → claimed → in_progress → in_review ⇄ changes_requested → approved → merged;
-- any → archived; rejected is terminal (feeds upstream dedup). approved/rejected are human-owned;
-- merged is the GitHub-native gate (never a bare DB write).
create type public.ticket_status as enum (
  'draft',
  'planned',
  'claimed',
  'in_progress',
  'in_review',
  'changes_requested',
  'approved',
  'merged',
  'rejected',
  'archived'
);

-- Why a ticket exists (provenance) + the dedup key so two workers don't draft the same ticket and a
-- rejected request isn't reopened.
create type public.upstream_kind as enum (
  'client_request',
  'spec',
  'issue',
  'design_doc',
  'parent_ticket'
);

create type public.upstream_role as enum ('primary', 'supporting');

-- A directive is two axes: WHAT to do (action) × whether to MERGE after (merge_after), plus a free
-- note + optional advanced params. null action = a plain note (a human record, not an agent task).
create type public.directive_action as enum (
  'revise',        -- change the ticket / work per the note
  'split',         -- break one over-broad ticket into several focused tickets
  'reprioritize',  -- change sequence / priority
  'reassign',      -- hand the ticket to a different role / worker
  'block',         -- mark blocked pending something (human or dependency)
  'archive'        -- remove from the active workflow (keep for audit)
);

create type public.directive_status as enum ('open', 'addressed', 'dismissed');

-- ── Helpers ────────────────────────────────────────────────────────────────────
-- Trigger to stamp updated_at. search_path pinned empty (only pg_catalog implicit) — no unqualified
-- object is referenced, so this is safe and passes the "mutable search_path" advisor.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── tickets (the unit of work; repurposed from Knovo `artifacts`) ───────────────
create table public.tickets (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,                       -- stable handle: claude/<slug> branch
  title          text not null,
  summary        text,
  status         public.ticket_status not null default 'draft',
  schema_version int  not null default 1,                    -- ticket-doc schema version (migrate-on-read)
  doc            jsonb not null,                             -- ticket body; zod *shape*-validated in the API
  repo           text,                                       -- target repo (owner/name)
  branch         text,                                       -- claude/<slug> feature branch
  pr_number      int,                                        -- set when the PR opens
  merge_after    boolean not null default false,             -- "…and merge when done" toggle (set via a directive)
  claimed_by     text,                                       -- worker actor holding the ticket (agent:<role>)
  reviewed_by    text,                                       -- human approver (admin:<uid>)
  reviewed_at    timestamptz,
  last_worker    text,                                       -- last actor to touch it
  deleted_at     timestamptz,                                -- soft-delete (recoverable)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index tickets_status_idx  on public.tickets (status);
create index tickets_deleted_idx on public.tickets (deleted_at);
create index tickets_repo_branch_idx on public.tickets (repo, branch);
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- ── upstream_refs (provenance registry + dedup key; repurposed from `sources`) ──
create table public.upstream_refs (
  id           uuid primary key default gen_random_uuid(),
  kind         public.upstream_kind not null,
  uid          text not null,                                -- stable external id (issue #, doc id, request id)
  url          text,
  title        text,
  detail       text,
  raw_meta     jsonb,
  retrieved_at timestamptz not null default now(),
  unique (kind, uid)                                         -- ← the dedup key
);

-- ── ticket_upstream_refs (provenance links; like Knovo `artifact_sources`) ──────
create table public.ticket_upstream_refs (
  ticket_id       uuid not null references public.tickets(id)       on delete cascade,
  upstream_ref_id uuid not null references public.upstream_refs(id) on delete restrict,
  role            public.upstream_role not null default 'primary',
  note            text,                                            -- why this ref grounds the ticket
  primary key (ticket_id, upstream_ref_id)
);
create index ticket_upstream_refs_ref_idx on public.ticket_upstream_refs (upstream_ref_id);

-- ── directives (human→agent instructions; repurposed from admin `comments`) ─────
create table public.directives (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.tickets(id) on delete cascade,
  author       text,                                            -- admin:<uid> | null for system
  note         text,                                            -- natural-language instruction
  action       public.directive_action,                         -- optional structured cue (null = note)
  merge_after  boolean not null default false,                  -- "…and merge when done"
  options      jsonb,                                            -- optional advanced params (future)
  status       public.directive_status not null default 'open',
  created_at   timestamptz not null default now(),
  addressed_at timestamptz,
  addressed_by text                                             -- worker that handled it (agent:<role>)
);
create index directives_ticket_idx on public.directives (ticket_id);
-- "Actionable" = open AND (has an action OR is flagged merge_after). Plain notes are excluded from
-- the agent queue but kept as a human record. Partial index powers the queue read cheaply.
create index directives_actionable_idx on public.directives (ticket_id)
  where status = 'open' and (action is not null or merge_after);

-- ── revisions (snapshot-before-write → recoverability; inherited verbatim) ──────
create table public.revisions (
  id             uuid primary key default gen_random_uuid(),
  ticket_id      uuid not null references public.tickets(id) on delete cascade,
  schema_version int  not null,
  doc            jsonb not null,
  title          text,
  summary        text,
  note           text,
  created_by     text,                                          -- agent:<role> | admin:<uid>
  created_at     timestamptz not null default now()
);
create index revisions_ticket_idx on public.revisions (ticket_id, created_at desc);

-- ── routine_runs (dispatch → Claude session deep link; Knovo migration 0010) ────
-- Created when a worker is dispatched; records which worker, who dispatched it, the optional ticket
-- scope, and the Claude session id/url ("Open session"). We deliberately store only what dispatch
-- knows (session id/url, status, error, the freeform nudge) — NOT live worker telemetry (the ledger
-- is the moat substrate and lands in P2; scope wall, CLAUDE.md invariant #6). text_context is the
-- fire-URL nudge and is UNTRUSTED (D-09) — stored opaque, never parsed as a command.
create table public.routine_runs (
  id           uuid primary key default gen_random_uuid(),
  worker       text not null,                                  -- planner|implementer|reviewer|supervisor
  status       text not null default 'dispatched',             -- dispatched|failed (no completion callback)
  session_id   text,
  session_url  text,
  ticket_id    uuid references public.tickets(id) on delete set null,
  dispatched_by text,                                          -- admin:<uid>
  text_context text,                                           -- freeform nudge (untrusted; truncated)
  error        text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);
create index routine_runs_worker_started_idx on public.routine_runs (worker, started_at desc);
create index routine_runs_ticket_idx on public.routine_runs (ticket_id);

-- ── audit_log (who/what changed on EVERY API mutation; inherited verbatim + run_id) ─
create table public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,                                    -- agent:<role> | admin:<uid>
  action     text not null,
  ticket_id  uuid references public.tickets(id)       on delete set null,
  run_id     uuid references public.routine_runs(id)  on delete set null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_ticket_idx  on public.audit_log (ticket_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_run_idx     on public.audit_log (run_id);

-- ── Dedup views (security_invoker so the caller's RLS applies, not the view owner's) ─
-- The Planner checks these before drafting, making dedup a property of the data (Knovo's pattern).
-- seen = any (kind, uid) already grounding a live (non-deleted) ticket; rejected = a (kind, uid) that
-- was the PRIMARY upstream of a rejected ticket (don't reopen).
create view public.seen_upstream_keys with (security_invoker = true) as
  select distinct u.kind, u.uid
  from public.upstream_refs u
  join public.ticket_upstream_refs x on x.upstream_ref_id = u.id
  join public.tickets t on t.id = x.ticket_id
  where t.deleted_at is null;

create view public.rejected_upstream_keys with (security_invoker = true) as
  select distinct u.kind, u.uid
  from public.upstream_refs u
  join public.ticket_upstream_refs x on x.upstream_ref_id = u.id
  join public.tickets t on t.id = x.ticket_id
  where t.status = 'rejected' and x.role = 'primary';

-- ── Row-Level Security: ENABLE on every table (default-deny; no policies yet) ────
-- The agent path is the governed API (service-role, bypasses RLS). Browser/admin read policies are
-- authored in P1.3 alongside the HUD/auth. Enabling RLS now = secure-by-default + a clean advisors
-- sweep (no "RLS disabled in public" findings).
alter table public.tickets              enable row level security;
alter table public.upstream_refs        enable row level security;
alter table public.ticket_upstream_refs enable row level security;
alter table public.directives           enable row level security;
alter table public.revisions            enable row level security;
alter table public.routine_runs         enable row level security;
alter table public.audit_log            enable row level security;

-- ── Grants for the trusted server (service-role) — the single governed write path ─
-- Granted up front (the Knovo 0009 lesson). service_role bypasses RLS but still needs table privileges.
grant all on
  public.tickets,
  public.upstream_refs,
  public.ticket_upstream_refs,
  public.directives,
  public.revisions,
  public.routine_runs,
  public.audit_log
to service_role;

-- Dedup views are read-only; the API selects from them on create/dedup.
grant select on
  public.seen_upstream_keys,
  public.rejected_upstream_keys
to service_role;
