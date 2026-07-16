# SETUP.md — running LoopRR (operator guide)

How to stand up LoopRR: the databases (done), the environment variables, the Vercel deployment, and
the "bring-your-own-routines" (BYOR) workers that drive the loop. This is the **canonical setup
reference** — kept in lockstep with `.env.example` and the code.

> **Golden rule: zero secrets in this repo.** Every value below is either public (URLs, project refs)
> or lives only in Vercel's env / your routine's env. Never paste a secret into a file that gets
> committed.

---

## 1. Architecture in one breath

LoopRR is the **coordination backend**: a governed API (`/api/agent/*`) + a Postgres ledger on
Supabase, deployed on Vercel. It does **not** run the agents — **you** configure Claude Code
**routines** (in your own Claude app) that authenticate to LoopRR's API with a per-role token and
pull their work. Merge/deploy stay behind a **GitHub-native** gate (branch protection), never a DB
flag.

```
Claude routine (your app)  --Bearer token-->  LoopRR API on Vercel  --service role-->  Supabase (prod)
        ▲ pulls work on session start                │ governed writes (audit + revisions + soft-delete)
        └──────────────── GitHub (branches/PRs; the real merge gate) ◄────────────────┘
```

---

## 2. Supabase — already provisioned ✅

| Project | Ref | URL | Role |
|---|---|---|---|
| `looprr-dev` | `ihqjffqwmzxweqeidybi` | `https://ihqjffqwmzxweqeidybi.supabase.co` | build/refinement sandbox |
| `looprr-prod` | `dwniuzjlvhgjczlqpeud` | `https://dwniuzjlvhgjczlqpeud.supabase.co` | production (Vercel points here) |

Both are on the **same schema** (`0001_init`, verified byte-for-byte identical). Region us-east-1,
$0/mo. **Migration flow:** versioned SQL in `supabase/migrations/` → apply to dev → verify → apply to
prod at PR-merge. `knovo-prod` is paused to stay under the free-tier 2-active-project cap.

**Where to get the keys** (Supabase dashboard → the project → **Settings → API**):
- **Project URL** — public (the URLs above).
- **`anon` / publishable key** — public; browser-safe. *(Not needed until the HUD exists.)*
- **`service_role` key** — **SECRET**. Bypasses RLS; used only server-side by the LoopRR API. Never
  ship to a browser, never commit, never give to a routine.

---

## 3. Environment variables

Canonical list lives in `.env.example` (empty values). What each one is and when it's needed:

| Variable | Secret? | Needed | Value / source |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | no | **now** (deploy) | prod URL: `https://dwniuzjlvhgjczlqpeud.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | **now** (deploy) | Supabase → prod → Settings → API → `service_role` |
| `LOOPRR_AGENT_TOKEN_PLANNER` | **yes** | **now** (deploy) | you generate — see §5 |
| `LOOPRR_AGENT_TOKEN_IMPLEMENTER` | **yes** | **now** (deploy) | you generate |
| `LOOPRR_AGENT_TOKEN_REVIEWER` | **yes** | **now** (deploy) | you generate |
| `LOOPRR_AGENT_TOKEN_SUPERVISOR` | **yes** | **now** (deploy) | you generate |
| `LOOPRR_API_BASE` | no | routine setup | your deployed URL, e.g. `https://looprr.vercel.app` (set in the **routine's** env, not the app's) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | later (HUD) | Supabase → prod → Settings → API → `anon` |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` / `GITHUB_WEBHOOK_SECRET` | **yes** | later (P2) | GitHub App (the merge gate) |

**So: `SUPABASE_SERVICE_ROLE_KEY` is not the only var** — the app also needs `NEXT_PUBLIC_SUPABASE_URL`
and the four `LOOPRR_AGENT_TOKEN_*`, or every `/api/agent/*` call returns `401`.

---

## 4. Deploy to Vercel

> **Prerequisite:** the Next.js framework must be wired up first (roadmap **P1.4** — the routes are
> already Next-compatible handlers, so this is a mechanical slice with no rework). Until then there is
> no build for Vercel to run. The steps below are what you'll do **once P1.4 lands**.

1. **Vercel → Add New → Project →** import `blokzdev/looprr`. Framework preset: **Next.js**.
2. **Settings → Environment Variables** — add the six "now" vars from §3 (prod URL, service-role key,
   the four agent tokens) for the **Production** environment. Mark the key + tokens as sensitive.
3. **Deploy.** Vercel builds `next build` and serves `/api/agent/*` on your production URL.
4. Tell me the production URL — I verify live over HTTP (see §6) and via the Vercel/Supabase MCP.

*(The Supabase project is already Vercel-org-managed under "Blokz Team", so you can also link it from
the Vercel dashboard's Storage tab if you prefer that over pasting the URL/key.)*

---

## 5. Agent tokens (BYOR routines)

Each routine presents a **per-role bearer token**; the API maps it to a role and its allowed verbs
(`lib/agent-auth.ts`). Generate four independent random secrets:

```bash
# one per role — run 4×
openssl rand -hex 32
# or: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Each token lives in **two places that must match**:
1. **Vercel** — as `LOOPRR_AGENT_TOKEN_<ROLE>` (so the API can compare it).
2. **The routine's env** in your Claude app — the matching one for that routine's role, plus
   `LOOPRR_API_BASE` (your deployed URL).

Trust-sizing (enforced in the API, not the prompt): **Planner** holds the smallest verb set (it
ingests the most untrusted text — no code, no merge); **Supervisor** is the only role that can execute
a merge, and only behind the GitHub-native gate.

Full routine prompts + trigger setup land in `docs/routines/` (roadmap P2).

---

## 6. Local dev & live verification

```bash
npm ci
npm run typecheck        # tsc
npm test                 # 28 unit tests (auth scopes, transition policy, schema, dedup/queue logic)
```

**End-to-end route test** (drives the real handlers against `looprr-dev`) — needs the dev
service-role key in env; self-skips without it:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://ihqjffqwmzxweqeidybi.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<dev service_role key>" \
npm run test:integration
```

**How I verify as we go** (no secret ever needs to reach me):
- **DB layer** — I inspect/replay against dev/prod via the Supabase MCP (`execute_sql`, `get_advisors`).
- **Live app** — once deployed, I call `https://<app>/api/agent/*` with an agent bearer token and read
  Vercel build/runtime logs via the Vercel MCP.
- **Parity** — I fingerprint dev vs prod schemas on demand to *prove* they match before a prod change.

---

## 7. What the human owns (can't be automated)

- Setting the **Vercel env vars** (§3) and connecting the repo — the service-role key is a secret the
  tooling won't hand out (`HUMAN.md` H-04).
- Creating the **GitHub App** + branch protection on target repos — the real merge gate (P2; `HUMAN.md` H-01).
- Generating + distributing the **agent tokens** (§5).
- Applying **prod migrations** is human-gated (done at PR-merge with your standing OK).
