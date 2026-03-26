"use client";

import { useState } from "react";

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<"free" | "pro" | null>(null);

  async function handleUpgrade() {
    try {
      setLoadingPlan("pro");

      const response = await fetch("/api/flutterwave/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "demo-user",
          email: "demo@example.com",
          name: "NaijaVid User",
          phone: "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data?.error || "Failed to initialize payment.");
        return;
      }

      if (!data?.checkoutLink) {
        alert("Payment link was not returned.");
        return;
      }

      window.location.href = data.checkoutLink;
    } catch (error) {
      alert("Something went wrong while starting payment.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Pricing</h1>
          <p className="text-white/70 text-lg">
            Choose the plan that fits your video generation needs.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold mb-3">Free</h2>
              <p className="text-white/70 mb-4">For testing and light usage.</p>
              <p className="text-4xl font-bold">₦0</p>
            </div>

            <ul className="space-y-3 text-white/80 mb-8">
              <li>Limited daily generations</li>
              <li>Basic features</li>
              <li>Standard speed</li>
              <li>Best for testing workflow</li>
            </ul>

            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-semibold text-white/60 cursor-not-allowed"
            >
              Current Starter Plan
            </button>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold mb-3">Pro</h2>
              <p className="text-white/70 mb-4">
                For serious creators and businesses.
              </p>
              <p className="text-4xl font-bold">₦5,000</p>
            </div>

            <ul className="space-y-3 text-white/80 mb-8">
              <li>More generations</li>
              <li>Priority access</li>
              <li>Premium workflow</li>
              <li>Built for paid usage and scale</li>
            </ul>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loadingPlan === "pro"}
              className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingPlan === "pro" ? "Starting payment..." : "Upgrade to Pro"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}