"use client";

import { useState } from "react";

type InitResponse = {
  checkoutLink?: string;
  tx_ref?: string;
  message?: string;
  error?: string;
};

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    try {
      setLoading(true);

      // TODO:
      // Replace these with your real signed-in user values.
      // For example, pull them from your auth provider or user profile.
      const payload = {
        userId: "user_123",
        email: "user@example.com",
        name: "Mandate User",
        phone: "08000000000",
      };

      const response = await fetch("/api/flutterwave/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data: InitResponse = await response.json();

      if (!response.ok) {
        alert(data.error || "Unable to initialize payment.");
        return;
      }

      if (!data.checkoutLink) {
        alert("Checkout link was not returned.");
        return;
      }

      window.location.href = data.checkoutLink;
    } catch (error) {
      console.error("Flutterwave initialize error:", error);
      alert("Something went wrong while starting payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <p className="mb-3 inline-flex rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium">
              Current Plan
            </p>

            <h1 className="text-3xl font-bold tracking-tight">Naijavid AI Pricing</h1>

            <p className="mt-4 text-base text-neutral-600">
              Upgrade to Pro to unlock longer generations and premium access.
            </p>

            <div className="mt-8 rounded-2xl border border-neutral-200 p-6">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">₦5,000</span>
                <span className="pb-1 text-neutral-500">/ month</span>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-neutral-700">
                <li>10-second video generation for Pro users</li>
                <li>Priority access to premium generation flow</li>
                <li>Cleaner upgrade and billing experience</li>
                <li>Ready for future plan enforcement</li>
              </ul>

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Redirecting to Flutterwave..." : "Upgrade with Flutterwave"}
              </button>

              <p className="mt-4 text-xs text-neutral-500">
                You will be redirected to Flutterwave secure checkout.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
            <h2 className="text-2xl font-bold">What happens next</h2>

            <div className="mt-6 space-y-5 text-sm text-neutral-700">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="font-semibold">1. Start payment</p>
                <p className="mt-1">
                  This page calls your backend to create a Flutterwave payment link.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="font-semibold">2. Complete checkout</p>
                <p className="mt-1">
                  The user pays on Flutterwave hosted checkout.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="font-semibold">3. Verify transaction</p>
                <p className="mt-1">
                  Your server confirms the transaction before you upgrade the user.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="font-semibold">4. Activate Pro</p>
                <p className="mt-1">
                  After verification passes, your app updates the user plan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}