"use client";

import { createClient, supabaseConfigured } from "@/lib/supabase/client";

/**
 * All backend calls go through the /api/backend proxy (a Next.js route
 * handler), so the browser never needs to know the FastAPI URL and CORS
 * never applies. The Supabase access token is attached automatically;
 * FastAPI validates it (PRD FR-16). In dev mode (no Supabase configured)
 * no token is sent and FastAPI runs open against its in-memory store.
 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabaseConfigured) return {};
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.detail ?? `Request failed (${res.status})`);
  }
  return res.json();
}
