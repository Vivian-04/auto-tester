"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { Logo } from "@/components/Navbar";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    if (!supabaseConfigured) {
      setError("Login is not configured yet — set the Supabase env variables first.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // On success the browser redirects to Google; no state update needed.
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-panel p-8">
      <div className="flex items-center gap-3 mb-8">
        <Logo size="md" />
        <span className="text-lg font-semibold">Auto Tester</span>
      </div>

      <h1 className="text-xl font-semibold mb-2">Sign in to Auto Tester</h1>
      <p className="text-sm text-muted mb-6">
        Sign in with your Google account to see whether a build is safe to release.
      </p>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 font-medium text-zinc-800 hover:bg-zinc-100 transition-colors disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.3-2.1 3.7-5.2 3.7-8.6z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2.1-6.9-5.1L1.2 17c2 3.7 5.7 7 10.8 7z"
          />
          <path
            fill="#FBBC05"
            d="M5.1 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.2 6.7C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l3.9-3z"
          />
          <path
            fill="#EA4335"
            d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 6.9 0 3.2 3.3 1.2 6.7l3.9 3C6 6.7 8.8 4.6 12 4.6z"
          />
        </svg>
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
