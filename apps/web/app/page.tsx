"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-4xl font-bold">NaijaVid AI</h1>
        <p className="mb-8 max-w-2xl text-white/80">
          Create short AI videos from images with simple workflow and local-first development.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/pricing"
            className="rounded bg-white px-5 py-3 text-black"
          >
            View Pricing
          </Link>
          <Link
            href="/history"
            className="rounded border border-white/20 px-5 py-3"
          >
            View History
          </Link>
        </div>

        <div className="mt-10 rounded border border-white/10 p-6">
          <p className="text-sm text-white/70">Authentication status</p>
          <p className="mt-2 text-lg">
            {loading ? "Checking account..." : user ? `Signed in as ${user.email}` : "Not signed in"}
          </p>
        </div>
      </div>
    </main>
  );
}