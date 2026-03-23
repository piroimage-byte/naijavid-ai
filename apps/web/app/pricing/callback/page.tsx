"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PricingCallbackPage() {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    async function verifyPayment() {
      try {
        const url = new URL(window.location.href);
        const reference = url.searchParams.get("reference");

        if (!reference) {
          setSuccess(false);
          setMessage("Missing payment reference.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`
        );

        const result = await response.json();

        if (!result.success) {
          setSuccess(false);
          setMessage(result.error || "Payment verification failed.");
          setLoading(false);
          return;
        }

        setSuccess(true);
        setMessage("Payment verified successfully. Your plan is now Pro.");
      } catch {
        setSuccess(false);
        setMessage("Unable to verify payment.");
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-2xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
        <h1 className="text-3xl font-bold">Payment Status</h1>

        <p
          className={
            success ? "text-green-400 text-sm" : "text-red-300 text-sm"
          }
        >
          {message}
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm">Please wait...</p>
        ) : (
          <div className="flex gap-3">
            <Link
              href="/generator"
              className="rounded-xl bg-white text-black px-5 py-3 font-semibold"
            >
              Go to Generator
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-zinc-700 px-5 py-3 font-semibold"
            >
              Back to Pricing
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}