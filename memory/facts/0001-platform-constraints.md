# 0001 — Claude-Code routine platform constraints ⚠️ UNVERIFIED

Source: the Phase-0 platform-research agent (succeeded). **Not yet verified by Claude firsthand.**
These are **load-bearing** for D-04 (clock-out) and D-06 (multi-tenancy) and the heartbeat-sweep
design. The human runs Knovo's routines and can confirm (HUMAN.md Q-01). Self-heal this file on
contradiction.

Claimed facts:
1. **No run-completion callback (from the platform).** At dispatch the platform returns a session
   id/url only; there is (likely) no webhook when a routine run *finishes*. **But we don't need one** —
   the worker self-reports completion in-band (`clock_out` as its last instruction), corroborated by the
   GitHub terminal artifact; only an abnormal end falls back to "last seen" (D-04, refined). Confirm
   the platform fact firsthand (the design is robust either way; if a callback *does* exist it's a bonus).
2. **Single-account identity + shared cap — REFRAMED for BYOR (D-01).** Routines belong to one
   claude.ai account and act AS that account's GitHub + connector identity, drawing on that account's
   run cap. Under **bring-your-own-routines this is the whitelabel mechanism, not a LoopRR limit**:
   each tenant runs routines in *their own* account/cap. The only design implication is **intra-tenant**
   — one tenant's own routines share that tenant's cap, so a Reviewer↔Implementer livelock starves
   *that tenant's* fleet (per-tenant cost red line; cap loop-backs). *(A LoopRR-hosted fleet — V2 — would
   instead run agents under LoopRR's own execution layer with per-tenant metering; see DECISIONS "V2
   north-star note".)*
3. **Best-effort GitHub webhooks.** Webhook events are rate-capped during the research preview and
   silently dropped over cap. → event-driven coordination is best-effort; back it with a ≥1h
   reconciling poll sweep.
4. **Fire-URL `text` payload.** A routine's API fire trigger accepts a free `text` payload → an
   injection channel; pull structured work, treat `text` as opaque (D-09).
5. **Routine setup surface.** A routine selects a repo + a cloud environment (name, network access,
   env vars in `.env` format) + connectors + triggers (API / GitHub event / schedule). (Confirmed by
   the seeding screenshots.) → this *is* the "compose your dream team" UX.

Action: confirm 1–4 with the human; if any is wrong, update D-04/D-06 and the affected specs.
