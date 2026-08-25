"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/generator");
        return;
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function handleGoogleSignIn() {
    try {
      setSigningIn(true);
      setError("");

      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      const result = await signInWithPopup(auth, provider);

      if (result.user) {
        router.replace("/generator");
      }
    } catch (err: any) {
      console.error("GOOGLE SIGN-IN ERROR:", err);

      if (err?.code === "auth/popup-blocked") {
        setError(
          "Google sign-in was blocked by your browser. Allow pop-ups for localhost and try again."
        );
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized in Firebase Authentication. Add localhost and your Vercel domain to Firebase Authorized Domains."
        );
      } else if (err?.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError(
          err?.message ||
            "Unable to sign in with Google."
        );
      }
    } finally {
      setSigningIn(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">
          Checking account...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
        <h1 className="text-4xl font-bold mb-3">
          NaijaVid AI
        </h1>

        <p className="text-white/60 mb-8">
          Sign in to create, save and manage your AI videos.
        </p>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full rounded-xl bg-white px-5 py-4 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {signingIn
            ? "Opening Google..."
            : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-xl border border-white/10 px-5 py-4 font-semibold text-white transition hover:bg-white/10"
        >
          Back to Home
        </button>

        <p className="mt-6 text-center text-xs text-white/40">
          By continuing, you agree to NaijaVid AI terms and privacy policy.
        </p>
      </div>
    </main>
  );
}