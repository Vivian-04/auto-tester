export type Verdict = "running" | "ready" | "ready_with_warnings" | "not_ready" | "error";

export type TestStatus = "passed" | "failed" | "flaky" | "skipped" | "error";

export interface TestResult {
  id: string;
  run_id: string;
  name: string;
  feature: string | null;
  priority: "P0" | "P1" | "P2";
  status: TestStatus;
  duration_ms: number | null;
  error: string | null;
  screenshot_path: string | null;
  screenshot_url: string | null;
  created_at: string;
}

export interface Run {
  id: string;
  project_id: string;
  branch: string;
  commit_sha: string | null;
  commit_message: string | null;
  trigger: string;
  environment: string;
  status: "running" | "completed" | "error";
  verdict: Verdict;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  duration_ms: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  tests?: TestResult[];
}

export interface Project {
  id: string;
  name: string;
  repo_url: string | null;
  branch: string;
  staging_url: string | null;
  alert_channel: string | null;
  created_at: string;
  last_run: { id: string; verdict: Verdict; created_at: string } | null;
}
