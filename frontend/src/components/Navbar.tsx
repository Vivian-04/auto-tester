"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 rounded-2xl" : size === "sm" ? "h-8 w-8 rounded-lg" : "h-10 w-10 rounded-xl";
  const bolt = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span
      className={`flex ${box} items-center justify-center bg-gradient-to-br from-accent via-accent to-fuchsia-600 shadow-lg shadow-accent/40`}
    >
      <svg viewBox="0 0 24 24" className={bolt} aria-hidden="true">
        <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" fill="#ffffff" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const bare = pathname === "/login" || pathname.startsWith("/auth");

  async function signOut() {
    try {
      if (supabaseConfigured) await createClient().auth.signOut();
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-semibold tracking-tight">Auto Tester</span>
        </Link>
        {!bare && (
          <button
            onClick={signOut}
            className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-foreground"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
