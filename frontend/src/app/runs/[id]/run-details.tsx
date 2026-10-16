"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, ApiError } from "@/lib/api";
import type { Run, TestResult } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const STATUS_STYLES: Record<string, string> = {
  passed: "text-emerald-400",
  failed: "text-red-400",
  error: "text-red-400",
  flaky: "text-amber-400",
  skipped: "text-muted",
};

function TestRow({ test }: { test: TestResult }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-panel/60 list-none [&::-webkit-details-marker]:hidden">
        <span
          className={`w-16 text-xs font-medium uppercase ${STATUS_STYLES[test.status] ?? "text-muted"}`}
        >
          {test.status}
        </span>
        <span className="flex-1 truncate">{test.name}</span>
        {test.feature && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
            {test.feature}
          </span>
        )}
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">
          {test.priority}
        </span>
        {test.duration_ms != null && (
          <span className="w-16 text-right text-xs text-muted">{test.duration_ms}ms</span>
        )}
        <span className="text-muted group-open:rotate-90 transition-transform">›</span>
      </summary>
      <div className="border-t border-border bg-background/60 px-4 py-4 flex flex-col gap-4">
        {test.error && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted">Error</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-panel p-3 text-xs text-red-300 whitespace-pre-wrap">
              {test.error}
            </pre>
          </div>
        )}
        {test.screenshot_url && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted">Screenshot</p>
            {/* Screenshot comes from our own API / signed URL, not remote hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={test.screenshot_url}
              alt={`Failure screenshot: ${test.name}`}
              className="max-h-96 rounded-lg border border-border"
            />
          </div>
        )}
        {!test.error && !test.screenshot_url && (
          <p className="text-sm text-muted">No error details for this test.</p>
        )}
      </div>
    </details>
  );
}

export default function RunDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiGet<Run>(`/runs/${id}`)
      .then(setRun)
      .catch((e: ApiError) => setError(e.message));
  }, [id]);

  async function copyReport() {
    if (!run) return;
    const lines = [
      `## Auto Tester run ${run.id.slice(0, 8)}`,
      "",
      `- **Verdict:** ${run.verdict.replace("_", " ")}`,
      `- **Branch:** ${run.branch} @ ${run.commit_sha?.slice(0, 8) ?? "unknown"}`,
      `- **Trigger:** ${run.trigger} · environment: ${run.environment}`,
      `- **Tests:** ${run.passed} passed, ${run.failed} failed, ${run.flaky} flaky (of ${run.total})`,
      "",
      ...(run.tests ?? [])
        .filter((t) => t.status !== "passed")
        .map((t) => `- \`${t.status}\` **${t.name}**${t.error ? `: ${t.error.split("\n")[0]}` : ""}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-400">{error}</p>
      </main>
    );
  }
  if (!run) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-muted">Loading run…</p>
      </main>
    );
  }

  const tests = run.tests ?? [];
  const failing = tests.filter((t) => t.status === "failed" || t.status === "error");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          ← Dashboard
        </Link>
        <span>/</span>
        <span className="font-mono">{run.id.slice(0, 8)}</span>
      </div>

      {/* Summary bar — FR-19 */}
      <div className="rounded-2xl border border-border bg-panel/80 p-5 shadow-lg shadow-black/20 flex flex-wrap items-center gap-x-8 gap-y-3">
        <StatusBadge verdict={run.verdict} />
        <div className="text-sm">
          <span className="text-emerald-400 font-medium">{run.passed}</span>
          <span className="text-muted"> passed</span>
        </div>
        <div className="text-sm">
          <span className={run.failed > 0 ? "text-red-400 font-medium" : "text-muted"}>
            {run.failed}
          </span>
          <span className="text-muted"> failed</span>
        </div>
        <div className="text-sm">
          <span className={run.flaky > 0 ? "text-amber-400 font-medium" : "text-muted"}>
            {run.flaky}
          </span>
          <span className="text-muted"> flaky</span>
        </div>
        <div className="text-sm text-muted">
          {run.total} tests ·{" "}
          {run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "duration —"}
        </div>
        <div className="text-sm text-muted font-mono">
          {run.branch} @ {run.commit_sha?.slice(0, 8) ?? "unknown"} · {run.trigger}
        </div>
        <button
          onClick={copyReport}
          className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent transition-colors"
        >
          {copied ? "Copied ✓" : "Copy bug report"}
        </button>
      </div>

      {run.commit_message && <p className="text-sm text-muted">{run.commit_message}</p>}

      {failing.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-red-400">
            {failing.length} failing test{failing.length > 1 ? "s" : ""}
          </h2>
          <div className="rounded-xl border border-border overflow-hidden">
            {failing.map((t) => (
              <TestRow key={t.id} test={t} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">All tests ({tests.length})</h2>
        {tests.length === 0 ? (
          <p className="rounded-xl border border-border bg-panel p-6 text-muted">
            This run reported no tests.
          </p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {tests.map((t) => (
              <TestRow key={t.id} test={t} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

