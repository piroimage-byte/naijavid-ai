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
          "Google sign-in was blocked by your browser. Allow pop-ups for this site and try again."
        );
      } else if (err?.code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized in Firebase Authentication. Add your production domain to Firebase Authorized Domains."
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
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white sm:px-6">
        <p className="text-sm text-white/60 sm:text-base">
          Checking account...
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-black px-3 py-6 text-white sm:px-5 sm:py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center sm:rounded-3xl sm:p-8">
        <h1 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">
          NaijaVid AI
        </h1>

        <p className="mb-6 text-sm leading-6 text-white/60 sm:mb-8 sm:text-base">
          Sign in to create, save and manage your AI videos.
        </p>

        {error && (
          <div className="mb-5 break-words rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-5 text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="min-h-12 w-full rounded-xl bg-white px-5 py-3.5 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
        >
          {signingIn
            ? "Opening Google..."
            : "Continue with Google"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-3 min-h-12 w-full rounded-xl border border-white/10 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10 sm:mt-4 sm:py-4"
        >
          Back to Home
        </button>

        <p className="mt-5 text-center text-[11px] leading-5 text-white/40 sm:mt-6 sm:text-xs">
          By continuing, you agree to NaijaVid AI terms and privacy policy.
        </p>
      </div>
    </main>
  );
}
