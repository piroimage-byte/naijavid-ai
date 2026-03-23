"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserPlan, type UserPlan } from "@/lib/user-service";

export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [loading, setLoading] = useState(true);
  const [startingPayment, setStartingPayment] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlan() {
      if (!user?.uid) {
        setPlan("free");
        setLoading(false);
        return;
      }

      try {
        const currentPlan = await getUserPlan(user.uid);
        setPlan(currentPlan);
      } catch {
        setPlan("free");
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [user]);

  async function handleUpgrade() {
    if (!user?.uid || !user.email) {
      setMessage("Please log in with a valid email first.");
      return;
    }

    try {
      setStartingPayment(true);
      setMessage("");

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
        }),
      });

      const result = await response.json();

      if (!result.success || !result.authorization_url) {
        setMessage(result.error || "Failed to start payment.");
        return;
      }

      window.location.href = result.authorization_url;
    } catch {
      setMessage("Unable to initialize payment.");
    } finally {
      setStartingPayment(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-5xl mx-auto">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Pricing</h1>
          <p className="text-sm text-gray-400 mt-2">
            Choose the plan that fits your video generation needs.
          </p>
          <p className="text-sm text-gray-300 mt-3">
            Current plan: <span className="font-semibold uppercase">{plan}</span>
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <p className="text-gray-400 mb-6">Start and test the platform.</p>
            <div className="text-3xl font-bold mb-6">₦0</div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>5-second video generation</p>
              <p>Basic prompt workflow</p>
              <p>History page access</p>
              <p>Watermarked output</p>
            </div>

            <button
              type="button"
              disabled
              className="mt-8 w-full rounded-xl bg-zinc-700 text-white font-semibold px-5 py-3 opacity-70"
            >
              Current or Default Plan
            </button>
          </div>

          <div className="rounded-2xl border border-white bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <p className="text-gray-400 mb-6">For serious creators and teams.</p>
            <div className="text-3xl font-bold mb-6">₦5,000/month</div>

            <div className="space-y-3 text-sm text-gray-300">
              <p>10-second video generation</p>
              <p>Priority access to premium features</p>
              <p>Better workflow for commercial use</p>
              <p>Future advanced generation tools</p>
            </div>

            <button
              type="button"
              onClick={handleUpgrade}
              disabled={startingPayment || plan === "pro"}
              className="mt-8 w-full rounded-xl bg-white text-black font-semibold px-5 py-3 disabled:opacity-60"
            >
              {plan === "pro"
                ? "Already on Pro"
                : startingPayment
                ? "Redirecting..."
                : "Upgrade to Pro"}
            </button>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}