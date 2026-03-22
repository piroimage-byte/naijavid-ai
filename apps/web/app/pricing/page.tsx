"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/providers/auth-provider";

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function handleSelect(plan: "FREE" | "BASIC" | "PRO") {
    if (!user) {
      alert("Please sign in first.");
      return;
    }

    try {
      setSubmitting(plan);
      setMessage("");

      // temporary logic (no backend yet)
      await new Promise((res) => setTimeout(res, 1000));

      setMessage(`You selected ${plan} plan (mock).`);

      if (plan !== "FREE") {
        alert("Payment integration (Paystack) will be added next.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setMessage(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-4xl font-bold">Pricing</h1>
        <p className="mb-10 text-white/70">
          Choose a plan to generate AI videos.
        </p>

        {loading && <p>Checking account...</p>}

        {!loading && !user && (
          <p className="mb-6 text-red-400">
            You must sign in before selecting a plan.
          </p>
        )}

        {message && (
          <div className="mb-6 rounded border border-white/20 p-4">
            {message}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {/* FREE */}
          <div className="rounded border border-white/10 p-6">
            <h2 className="text-xl font-bold">Free</h2>
            <p className="mt-2 text-white/70">Basic access</p>

            <button
              onClick={() => handleSelect("FREE")}
              disabled={submitting === "FREE"}
              className="mt-6 w-full rounded bg-white px-4 py-2 text-black"
            >
              {submitting === "FREE" ? "Processing..." : "Start Free"}
            </button>
          </div>

          {/* BASIC */}
          <div className="rounded border border-white/10 p-6">
            <h2 className="text-xl font-bold">Basic</h2>
            <p className="mt-2 text-white/70">More videos</p>

            <button
              onClick={() => handleSelect("BASIC")}
              disabled={submitting === "BASIC"}
              className="mt-6 w-full rounded bg-white px-4 py-2 text-black"
            >
              {submitting === "BASIC" ? "Processing..." : "Choose Basic"}
            </button>
          </div>

          {/* PRO */}
          <div className="rounded border border-white/10 p-6">
            <h2 className="text-xl font-bold">Pro</h2>
            <p className="mt-2 text-white/70">Unlimited access</p>

            <button
              onClick={() => handleSelect("PRO")}
              disabled={submitting === "PRO"}
              className="mt-6 w-full rounded bg-white px-4 py-2 text-black"
            >
              {submitting === "PRO" ? "Processing..." : "Go Pro"}
            </button>
          </div>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-white/70 underline">
            ← Back Home
          </Link>
        </div>
      </div>
    </main>
  );
}