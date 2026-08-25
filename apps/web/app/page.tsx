"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.refresh();
    } catch (error) {
      console.error("SIGN OUT ERROR:", error);
    }
  }

  function handleStartCreating() {
    if (user) {
      router.push("/generator");
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      {/* HEADER */}

      <header className="flex items-center justify-between max-w-6xl mx-auto mb-12 gap-6">
        <h1
          onClick={() => router.push("/")}
          className="text-2xl font-bold cursor-pointer"
        >
          NaijaVid AI
        </h1>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          {!checkingAuth && !user && (
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
          >
            Pricing
          </button>

          {!checkingAuth && user && (
            <>
              <button
                type="button"
                onClick={() => router.push("/generator")}
                className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
              >
                Generator
              </button>

              <button
                type="button"
                onClick={() => router.push("/history")}
                className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition"
              >
                History
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 border border-red-500/40 text-red-300 rounded-lg hover:bg-red-500/10 transition"
              >
                Sign Out
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleStartCreating}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition"
          >
            Start Creating
          </button>
        </div>
      </header>

      {/* AUTH STATUS */}

      {!checkingAuth && user && (
        <section className="max-w-6xl mx-auto mb-10">
          <div className="rounded-2xl border border-green-500/20 bg-green-500/5 px-5 py-4">
            <p className="text-sm text-white/70">
              Signed in as{" "}
              <span className="text-white font-medium">
                {user.displayName || user.email || "NaijaVid AI User"}
              </span>
            </p>
          </div>
        </section>
      )}

      {/* HERO */}

      <section className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-5xl font-bold mb-6 leading-tight">
          Create AI Videos in Seconds
        </h2>

        <p className="text-white/70 text-lg mb-8">
          Turn text or images into short videos instantly. Built for creators,
          marketers, and businesses.
        </p>

        <button
          type="button"
          onClick={handleStartCreating}
          className="px-6 py-3 bg-white text-black rounded-xl font-semibold text-lg hover:bg-gray-200 transition"
        >
          {user ? "Open Generator" : "Generate Video"}
        </button>
      </section>

      {/* FEATURES */}

      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">
            Text to Video
          </h3>

          <p className="text-white/60">
            Convert simple prompts into engaging videos instantly.
          </p>
        </div>

        <div className="p-6 bg-white/5 border border-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">
            Image to Video
          </h3>

          <p className="text-white/60">
            Upload images and transform them into animated clips.
          </p>
        </div>

        <div className="p-6 bg-white/5 border border-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">
            Nigerian Languages
          </h3>

          <p className="text-white/60">
            Create content designed for Nigerian audiences and local languages.
          </p>
        </div>
      </section>

      {/* PRO CTA */}

      <section className="max-w-4xl mx-auto text-center mb-20">
        <h3 className="text-3xl font-bold mb-4">
          Unlock Founding Pro
        </h3>

        <p className="text-white/70 mb-6">
          Get unlimited generations during the introductory launch period,
          subject to fair use.
        </p>

        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="px-6 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-500 transition"
        >
          View Founding Pro
        </button>
      </section>

      {/* FOOTER */}

      <footer className="max-w-6xl mx-auto border-t border-white/10 pt-8 pb-4 text-center text-white/40 text-sm">
        © {new Date().getFullYear()} NaijaVid AI. All rights reserved.
      </footer>
    </main>
  );
}