export const dynamic = "force-dynamic";

// GET /api/health — liveness probe. No auth, no DB: confirms the Vercel deployment is serving. Used
// by the operator and by the post-deploy live verification (SETUP.md §6).
export async function GET() {
  return Response.json({ ok: true, service: "looprr", ts: new Date().toISOString() });
}
