# Zedu Auto Tester — Setup Guide

Auto Tester runs automated browser checks against Zedu staging and shows one
verdict: **Ready**, **Ready with warnings**, **Not Ready** or **Running**.

| Piece | Tech | Where it runs |
| --- | --- | --- |
| Dashboard | Next.js + React + Tailwind | Vercel (or `npm run dev` locally) |
| Results API | FastAPI | Coolify (this repo's Dockerfile) |
| Data, login, screenshots | Supabase | supabase.com free tier |
| Test runner | Playwright in GitHub Actions | pushes results to the API |

Both apps live in this repo: `app/` (FastAPI) and `frontend/` (Next.js).

## 1. Run locally (no Supabase needed yet)

Without Supabase credentials the backend uses an in-memory store and the
frontend skips login — handy while building.

```bash
# backend (port 8000)
pip install -r requirements.txt
uvicorn app.main:app --reload

# frontend (port 3000) — separate terminal
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. To see data, post a demo run (see step 4).

## 2. Create the Supabase project

1. https://supabase.com → New project (free tier; note the project **pauses
   after inactivity** — wake it before the demo).
2. **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → Run.
3. **Project Settings → API** → copy:
   - Project URL → `SUPABASE_URL` (backend) and `NEXT_PUBLIC_SUPABASE_URL` (frontend)
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (backend only, never in the frontend)
   - Auth JWT secret → `SUPABASE_JWT_SECRET` (backend only, optional but faster)

## 3. Enable Google sign-in

1. **Google Cloud Console** → https://console.cloud.google.com/apis/credentials →
   Create credentials → **OAuth client ID** → Web application.
2. Authorized redirect URI:
   `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
3. In Supabase **Authentication → Providers → Google**: enable, paste the client
   ID and secret, Save.
4. In Supabase **Authentication → URL Configuration**: set Site URL to your
   dashboard URL (e.g. `http://localhost:3000` in dev) and add it to Redirect
   URLs so `/auth/callback` is allowed.
5. Copy `.env.example` → `.env` (backend) and `frontend/.env.example` →
   `frontend/.env.local`, fill in the values, restart both apps.

## 4. Create a project and send your first run

```bash
# 1. Create a project (needs a dashboard login token when Supabase is on)
curl -s -X POST http://localhost:8000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"Zedu Web","repo_url":"https://github.com/zedu-yodaa/zedu","branch":"main","staging_url":"https://staging.zedu.chat"}'
# Response includes "api_key" — shown ONCE. Store it as a GitHub secret AUTOTESTER_API_KEY.

# 2. Post a run (this is what GitHub Actions does; see examples/auto-tester-workflow.yml)
curl -s -X POST http://localhost:8000/api/runs \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: <the api_key from step 1>' \
  -d '{
    "branch": "main", "commit": "abc1234", "commit_message": "demo run",
    "trigger": "manual", "environment": "staging", "status": "completed",
    "started_at": "2026-10-16T10:00:00Z", "finished_at": "2026-10-16T10:04:30Z",
    "tests": [
      {"name":"login shows the sidebar","feature":"auth","priority":"P0","status":"passed","duration_ms":2100},
      {"name":"message reaches a second user","feature":"messaging","priority":"P0","status":"failed",
       "duration_ms":4300,"error":"Timeout waiting for .message-list to contain \"hello\""}
    ]
  }'
```

The dashboard now shows the run with a **Not Ready** verdict (a P0 test failed)
and the failing test with its error. Add `"screenshot_base64"` to a test to see
the screenshot viewer too.

## 5. Deploy

- **Backend** (FastAPI): already wired to Coolify via the Dockerfile and the
  `Deploy (Coolify)` workflow. Set the `SUPABASE_*` env vars in Coolify.
- **Frontend** (Next.js): import the repo into Vercel, set Root Directory to
  `frontend`, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  and `FASTAPI_BASE_URL` (your Coolify URL, e.g. https://tester.zedu.chat),
  then deploy.

## Security rules (from the PRD — do not skip)

- Only **staging** URLs are accepted by the API; test accounts only.
- The project API key is stored hashed; the raw key is shown once.
- Screenshots live in a **private** bucket; the dashboard receives short-lived
  signed URLs after login.
- `npm ci --ignore-scripts` in CI; no new dependencies without tech-lead approval.
