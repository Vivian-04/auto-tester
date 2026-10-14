# auto-tester

Placeholder service for the automated-testing platform, which will be built by the testing team.
Python + FastAPI serving a simple page, ready to deploy. Replace or extend freely
(Playwright / pytest work well alongside Python).

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Deploy (Coolify)
Dockerfile build pack, port 8000. GitHub secrets: COOLIFY_WEBHOOK_URL (optional COOLIFY_TOKEN); the
Deploy (Coolify) workflow runs only after Malware Scan (CI Gate) passes on main.
