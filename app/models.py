"""Pydantic models for the results API and dashboard reads."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

TestPriority = Literal["P0", "P1", "P2"]
TestStatus = Literal["passed", "failed", "flaky", "skipped", "error"]
Verdict = Literal["running", "ready", "ready_with_warnings", "not_ready", "error"]


class TestResultIn(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    feature: Optional[str] = Field(default=None, max_length=100)
    priority: TestPriority = "P0"
    status: TestStatus
    duration_ms: Optional[int] = Field(default=None, ge=0)
    error: Optional[str] = Field(default=None, max_length=20000)
    # Failure evidence; raw base64 or a data: URL. Stored privately, never inline in the DB.
    screenshot_base64: Optional[str] = None


class RunIn(BaseModel):
    branch: str = Field(default="main", max_length=200)
    commit: Optional[str] = Field(default=None, max_length=64)
    commit_message: Optional[str] = Field(default=None, max_length=500)
    trigger: Literal["manual", "push", "pull_request", "nightly", "re-run"] = "manual"
    environment: Literal["staging"] = "staging"
    status: Literal["running", "completed", "error"] = "completed"
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    tests: list[TestResultIn] = Field(default_factory=list, max_length=500)

    @field_validator("tests")
    @classmethod
    def limit_screenshots(cls, tests: list[TestResultIn]) -> list[TestResultIn]:
        with_evidence = [t for t in tests if t.screenshot_base64]
        if len(with_evidence) > 25:
            raise ValueError("at most 25 screenshots per run")
        return tests


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    repo_url: Optional[str] = Field(default=None, max_length=300)
    branch: str = Field(default="main", max_length=200)
    staging_url: Optional[str] = Field(default=None, max_length=300)
    alert_channel: Optional[str] = Field(default=None, max_length=120)

    @field_validator("staging_url")
    @classmethod
    def https_only(cls, v: Optional[str]) -> Optional[str]:
        # NFR: registered staging URLs must be https (allow-list check happens in the store).
        if v and not v.startswith("https://"):
            raise ValueError("staging_url must start with https://")
        return v
