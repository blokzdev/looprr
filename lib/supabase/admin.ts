import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role Supabase client for TRUSTED SERVER-ONLY code — the governed LoopRR API
// (`app/api/agent/*`). It BYPASSES RLS, so it must never be imported into client code, shipped to the
// browser, or exposed as a NEXT_PUBLIC var. This is the single DB write chokepoint: it authenticates
// the per-role agent bearer token (lib/agent-auth.ts), validates ticket *shape*, enforces status
// transitions, snapshots revisions, audit-logs every mutation, and soft-deletes. Env is read at call
// time (not import time) so the module is safe to bundle without secrets present at build.
// See foundation/security-and-privacy.md and DECISIONS D-01/D-10.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
