# 0001 — Claude-Code routine platform constraints ⚠️ UNVERIFIED

Source: the Phase-0 platform-research agent (succeeded). **Not yet verified by Claude firsthand.**
These are **load-bearing** for D-04 (clock-out) and D-06 (multi-tenancy) and the heartbeat-sweep
design. The human runs Knovo's routines and can confirm (HUMAN.md Q-01). Self-heal this file on
contradiction.

Claimed facts:
1. **No run-completion callback.** At dispatch the platform returns a session id/url only; there is no
   webhook/callback when a routine run *finishes*. → server-side `clock_out`/`duration` cannot be
   derived from authoritative signals (D-04).
2. **Single-account identity + shared cap.** Routines belong to one claude.ai account, are unshared,
   act AS the operator's GitHub + connector identity, and draw on one shared per-account daily run
   cap. → no platform substrate for *multi-tenant routines* (drives BYO-routines, D-01) and a
   livelock starves the whole fleet (cost red line).
3. **Best-effort GitHub webhooks.** Webhook events are rate-capped during the research preview and
   silently dropped over cap. → event-driven coordination is best-effort; back it with a ≥1h
   reconciling poll sweep.
4. **Fire-URL `text` payload.** A routine's API fire trigger accepts a free `text` payload → an
   injection channel; pull structured work, treat `text` as opaque (D-09).
5. **Routine setup surface.** A routine selects a repo + a cloud environment (name, network access,
   env vars in `.env` format) + connectors + triggers (API / GitHub event / schedule). (Confirmed by
   the seeding screenshots.) → this *is* the "compose your dream team" UX.

Action: confirm 1–4 with the human; if any is wrong, update D-04/D-06 and the affected specs.
