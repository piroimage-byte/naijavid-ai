"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../components/providers/auth-provider";

export default function SiteNavbar() {
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleAuthAction() {
    try {
      setBusy(true);

      if (user) {
        await logout();
      } else {
        await signInWithGoogle();
      }
    } catch (error) {
      console.error(error);
      alert("Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="border-b border-white/10 bg-black text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold">
          NaijaVid AI
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/">Home</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/history">History</Link>
          <Link href="/projects">Projects</Link>

          {!loading && (
            <button
              onClick={handleAuthAction}
              disabled={busy}
              className="rounded bg-white px-4 py-2 text-black disabled:opacity-50"
            >
              {busy ? "Please wait..." : user ? "Logout" : "Sign in"}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}