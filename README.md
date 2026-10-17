# Zedu Auto Tester

Pre-release automated tester for Zedu (HNG internship task, Team Yoda).
It runs automated browser checks against staging and shows one verdict:
**Ready**, **Ready with warnings**, **Not Ready** or **Running**.

This repo hosts both pieces:

| Piece | Tech | Path |
| --- | --- | --- |
| Results API + data access | Python + FastAPI (Supabase behind it) | `app/` |
| Dashboard | Next.js (React) + Tailwind CSS + Supabase Auth (Google) | `frontend/` |

## Run locally

```bash
# API on :8000 — without SUPABASE_* env vars it runs an in-memory dev store
pip install -r requirements.txt
uvicorn app.main:app --reload

# Unit tests (standard library only, no extra install)
python -m unittest

# Dashboard on :3000 — without .env.local it skips login (dev mode)
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. Full setup (Supabase project, Google sign-in, first run,
deploy) is in [docs/SETUP.md](docs/SETUP.md).

### API at a glance

- `POST /api/projects` — connect a project; returns its API key **once**
  (dashboard login required once Supabase is configured).
- `POST /api/runs` — GitHub Actions posts run results here with the `X-API-Key`
  header; the verdict is computed server-side (FR-17). Staging only.
- `GET /api/projects`, `GET /api/runs`, `GET /api/runs/{id}` — dashboard reads
  (Supabase Auth token required once configured); failures include screenshot URLs.

An example runner workflow and its results poster live in `examples/`.

## Deploy (Coolify)

Dockerfile build pack, port 8000 — unchanged; add the `SUPABASE_*` env vars in
Coolify when the project exists. GitHub secrets: COOLIFY_WEBHOOK_URL (optional
COOLIFY_TOKEN); the Deploy (Coolify) workflow runs only after Malware Scan (CI
Gate) passes on main. The `frontend/` app deploys to Vercel (root directory
`frontend`).

## Live

API: https://tester.zedu.chat
