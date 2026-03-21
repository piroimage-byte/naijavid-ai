"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function navClass(active: boolean) {
  return active
    ? "rounded-xl bg-white px-4 py-2 font-semibold text-[#03133d]"
    : "rounded-xl px-4 py-2 font-semibold text-white/85 transition hover:bg-white/10 hover:text-white";
}

export default function SiteNavbar() {
  const pathname = usePathname();
  const { user, loading, signInWithGoogle, logout, profile } = useAuth();

  const currentPlan = profile?.plan || "FREE";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#03133d] text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold">
          NaijaVid AI
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/" className={navClass(pathname === "/")}>
            Home
          </Link>
          <Link
            href="/generator"
            className={navClass(pathname.startsWith("/generator"))}
          >
            Generator
          </Link>
          <Link
            href="/history"
            className={navClass(pathname.startsWith("/history"))}
          >
            My Videos
          </Link>
          <Link
            href="/pricing"
            className={navClass(pathname.startsWith("/pricing"))}
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right md:block">
                <p className="text-sm font-semibold">{user.email}</p>
                <p className="text-xs text-white/70">Plan: {currentPlan}</p>
              </div>

              <button
                onClick={logout}
                className="rounded-xl bg-white px-4 py-2 font-semibold text-[#03133d] transition hover:bg-white/90"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="rounded-xl bg-white px-4 py-2 font-semibold text-[#03133d] transition hover:bg-white/90 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Sign in"}
            </button>
          )}
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-4 md:hidden">
        <Link href="/" className={navClass(pathname === "/")}>
          Home
        </Link>
        <Link
          href="/generator"
          className={navClass(pathname.startsWith("/generator"))}
        >
          Generator
        </Link>
        <Link
          href="/history"
          className={navClass(pathname.startsWith("/history"))}
        >
          My Videos
        </Link>
        <Link
          href="/pricing"
          className={navClass(pathname.startsWith("/pricing"))}
        >
          Pricing
        </Link>
      </div>
    </header>
  );
}