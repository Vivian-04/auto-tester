"""Results API — what the GitHub Actions runner posts to (PRD FR-15, FR-25).

POST /api/projects        create a project (dashboard login required), returns its API key once
POST /api/runs            ingest a run + test results, requires X-API-Key header
GET  /api/evidence/{path} dev-mode screenshot serving (Supabase mode uses signed URLs)
"""
import logging
import threading
import time

from fastapi import APIRouter, Depends, Header, HTTPException, Response

from ..auth import require_user
from ..config import get_settings
from ..models import ProjectCreate, RunIn
from ..store import MemoryStore, get_store

logger = logging.getLogger("autotester.api")
router = APIRouter(prefix="/api")


class RateLimiter:
    """Fixed-window per-key limiter so the results endpoint cannot be spammed."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        limit = get_settings().results_rate_limit
        now = time.monotonic()
        with self._lock:
            hits = [t for t in self._hits.get(key, []) if now - t < 60]
            if len(hits) >= limit:
                raise HTTPException(status_code=429, detail="Rate limit exceeded, retry later")
            hits.append(now)
            self._hits[key] = hits


limiter = RateLimiter()


@router.post("/projects", status_code=201)
def create_project(data: ProjectCreate, _user: dict = Depends(require_user)):
    project, raw_key = get_store().create_project(data.model_dump())
    # The raw key is shown once; only its hash is stored (NFR security).
    return {**project, "api_key": raw_key}


@router.get("/projects")
def list_projects(_user: dict = Depends(require_user)):
    return get_store().list_projects()


@router.post("/runs", status_code=201)
def ingest_run(data: RunIn, x_api_key: str = Header(default="")):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="X-API-Key header is required")
    limiter.check(x_api_key)
    project = get_store().get_project_by_api_key(x_api_key)
    if not project:
        raise HTTPException(status_code=403, detail="Unknown project API key")
    if data.environment != "staging":
        raise HTTPException(status_code=400, detail="Only the staging environment is allowed")
    run = get_store().create_run(project["id"], data)
    logger.info("run %s ingested for project %s -> %s", run["id"], project["name"], run["verdict"])
    return run


@router.get("/runs")
def list_runs(project_id: str | None = None, _user: dict = Depends(require_user)):
    return get_store().list_runs(project_id)


@router.get("/runs/{run_id}")
def get_run(run_id: str, _user: dict = Depends(require_user)):
    run = get_store().get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    # Attach screenshot URLs (signed in Supabase mode, local path in dev mode).
    store = get_store()
    for test in run["tests"]:
        test["screenshot_url"] = store.screenshot_url(run_id, test.get("screenshot_path"))
    return run


@router.get("/evidence/{run_id}/{file_path:path}")
def serve_evidence(run_id: str, file_path: str):
    if get_settings().supabase_configured:
        raise HTTPException(status_code=404, detail="Evidence is served by Supabase signed URLs")
    store = get_store()
    if not isinstance(store, MemoryStore):
        raise HTTPException(status_code=404, detail="Not found")
    result = store.get_evidence_file(f"{run_id}/{file_path}")
    if not result:
        raise HTTPException(status_code=404, detail="Not found")
    data, content_type = result
    return Response(content=data, media_type=content_type, headers={"Cache-Control": "private, max-age=300"})
