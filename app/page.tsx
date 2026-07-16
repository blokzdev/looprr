// Minimal landing page — LoopRR is an API service (the governed /api/agent/* write boundary + the
// ledger). A real operator HUD lands in a later phase; this just confirms the deployment is alive.
export default function Home() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: 640,
        margin: "4rem auto",
        padding: "0 1.25rem",
        lineHeight: 1.6,
      }}
    >
      <h1>LoopRR</h1>
      <p>
        The coordination backend for an autonomous multi-agent Claude Code dev team — a governed,
        append-only ledger plus the governed <code>/api/agent/*</code> write boundary.
      </p>
      <p>
        This deployment is the API service. Liveness:{" "}
        <a href="/api/health">
          <code>/api/health</code>
        </a>
        . Routine workers authenticate to <code>/api/agent/*</code> with a per-role bearer token.
      </p>
    </main>
  );
}
