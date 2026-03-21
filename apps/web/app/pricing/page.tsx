"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { setUserPlan } from "@/lib/user-service";

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, profile, refreshProfile } = useAuth();

  const [submittingPlan, setSubmittingPlan] = useState<
    "FREE" | "BASIC" | "PRO" | null
  >(null);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const currentPlan = profile?.plan || "FREE";
  const reference = searchParams.get("reference") || "";

  useEffect(() => {
    async function autoVerifyPayment() {
      if (!reference || !user) return;

      try {
        setVerifying(true);
        setError("");
        setMessage("");

        const response = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(
            reference
          )}&userId=${encodeURIComponent(user.uid)}`,
          {
            method: "GET",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Payment verification failed.");
        }

        const verifiedPlan = String(result?.plan || "PRO").toUpperCase() as
          | "BASIC"
          | "PRO";

        await setUserPlan(user.uid, verifiedPlan);
        await refreshProfile();

        setMessage(`Payment verified. ${verifiedPlan} plan activated successfully.`);
        router.replace("/pricing");
      } catch (err: any) {
        setError(err?.message || "Could not verify payment.");
        setMessage("");
      } finally {
        setVerifying(false);
      }
    }

    autoVerifyPayment();
  }, [reference, user, router, refreshProfile]);

  async function handleChooseFree() {
    if (!user) {
      setError("Please sign in first.");
      setMessage("");
      return;
    }

    try {
      setSubmittingPlan("FREE");
      setError("");
      setMessage("");

      await setUserPlan(user.uid, "FREE");
      await refreshProfile();

      setMessage("You are now on the Free plan.");
    } catch (err: any) {
      setError(err?.message || "Could not update your plan.");
      setMessage("");
    } finally {
      setSubmittingPlan(null);
    }
  }

  async function handleUpgradeWithPaystack(plan: "BASIC" | "PRO") {
    if (!user) {
      setError("Please sign in first.");
      setMessage("");
      return;
    }

    const email = user.email || profile?.email || "";

    if (!email) {
      setError("No email found for your account.");
      setMessage("");
      return;
    }

    try {
      setSubmittingPlan(plan);
      setError("");
      setMessage("");

      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          userId: user.uid,
          plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to initialize payment.");
      }

      if (!data?.authorization_url) {
        throw new Error("No payment link returned.");
      }

      window.location.href = data.authorization_url;
    } catch (err: any) {
      setError(err?.message || "Upgrade failed.");
      setMessage("");
      setSubmittingPlan(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#03133d] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Pricing</h1>
            <p className="mt-2 text-lg text-white/85">
              Choose a plan that fits your video creation needs.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-[#03133d]"
            >
              Home
            </Link>
            <Link
              href="/generator"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white"
            >
              Generator
            </Link>
          </div>
        </div>

        <div className="mb-8 rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
          <h2 className="text-2xl font-bold">Your Current Plan</h2>
          <p className="mt-2 text-lg">{loading ? "Loading..." : currentPlan}</p>

          {verifying ? (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 font-semibold text-blue-800">
              Verifying payment...
            </div>
          ) : null}

          {message ? (
            <div className="mt-6 rounded-2xl bg-green-100 px-4 py-4 font-semibold text-green-800">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-100 px-4 py-4 font-semibold text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
            <h2 className="text-3xl font-bold">Free</h2>
            <p className="mt-3 text-4xl font-extrabold">₦0</p>
            <p className="mt-3 text-slate-600">
              Good for testing and first-time users.
            </p>

            <div className="mt-6 space-y-3 text-base text-slate-700">
              <div>• 5 generations</div>
              <div>• Up to 5-second video</div>
              <div>• Video history</div>
              <div>• Basic generator access</div>
            </div>

            <button
              onClick={handleChooseFree}
              disabled={!user || submittingPlan !== null || currentPlan === "FREE"}
              className="mt-8 w-full rounded-2xl bg-slate-900 px-6 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {currentPlan === "FREE"
                ? "Current Plan"
                : submittingPlan === "FREE"
                ? "Processing..."
                : "Choose Free"}
            </button>
          </div>

          <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl ring-4 ring-blue-500">
            <h2 className="text-3xl font-bold">Basic</h2>
            <p className="mt-3 text-4xl font-extrabold">₦7,500</p>
            <p className="mt-1 text-slate-500">per month</p>
            <p className="mt-3 text-slate-600">
              For consistent creators and growing content needs.
            </p>

            <div className="mt-6 space-y-3 text-base text-slate-700">
              <div>• 30 generations</div>
              <div>• Up to 5-second video</div>
              <div>• Video history</div>
              <div>• Faster workflow</div>
            </div>

            <button
              onClick={() => handleUpgradeWithPaystack("BASIC")}
              disabled={
                !user || submittingPlan !== null || verifying || currentPlan === "BASIC"
              }
              className="mt-8 w-full rounded-2xl bg-blue-600 px-6 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {currentPlan === "BASIC"
                ? "Current Plan"
                : submittingPlan === "BASIC"
                ? "Processing..."
                : "Choose Basic"}
            </button>
          </div>

          <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
            <h2 className="text-3xl font-bold">Pro</h2>
            <p className="mt-3 text-4xl font-extrabold">₦20,000</p>
            <p className="mt-1 text-slate-500">per month</p>
            <p className="mt-3 text-slate-600">
              Best for creators, marketers, and business users.
            </p>

            <div className="mt-6 space-y-3 text-base text-slate-700">
              <div>• Unlimited generations</div>
              <div>• Up to 10-second video</div>
              <div>• Video history</div>
              <div>• Faster workflow</div>
              <div>• Ready for premium features</div>
            </div>

            <button
              onClick={() => handleUpgradeWithPaystack("PRO")}
              disabled={
                !user || submittingPlan !== null || verifying || currentPlan === "PRO"
              }
              className="mt-8 w-full rounded-2xl bg-[#2563eb] px-6 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {currentPlan === "PRO"
                ? "Current Plan"
                : submittingPlan === "PRO"
                ? "Processing..."
                : "Choose Pro"}
            </button>
          </div>
        </div>

        <div className="mt-10 rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
          <h2 className="text-2xl font-bold">Important</h2>
          <p className="mt-3 text-slate-700">
            Free and Basic support up to 5-second videos. Pro supports up to
            10-second videos. Basic and Pro buttons now use Paystack
            initialization so you can connect real payment flow.
          </p>
        </div>
      </div>
    </main>
  );
}