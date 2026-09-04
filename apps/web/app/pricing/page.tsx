"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";

type InitializeResponse = {
  success?: boolean;
  message?: string;
  checkoutLink?: string;
  tx_ref?: string;
  redirectUrl?: string;
  error?: string;
};

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [startingPayment, setStartingPayment] = useState(false);
  const [message, setMessage] = useState("");

  async function startFoundingProPayment() {
    if (!user) {
      setMessage("Please sign in before upgrading.");
      return;
    }

    if (!user.uid) {
      setMessage("Unable to identify your account.");
      return;
    }

    if (!user.email) {
      setMessage(
        "Your account does not have an email address. Please sign in with an account that has an email address."
      );
      return;
    }

    try {
      setStartingPayment(true);
      setMessage("Starting Flutterwave payment...");

      const response = await fetch(
        "/api/flutterwave/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: user.uid,
            email: user.email,
            name:
              user.displayName ||
              user.email.split("@")[0] ||
              "NaijaVid AI User",
          }),
        }
      );

      let data: InitializeResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Payment server returned an invalid response."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to initialize Flutterwave payment."
        );
      }

      if (!data.checkoutLink) {
        throw new Error(
          "Flutterwave did not return a checkout link."
        );
      }

      console.log("PAYMENT INITIALIZED:", {
        txRef: data.tx_ref,
        redirectUrl: data.redirectUrl,
        userId: user.uid,
      });

      window.location.href = data.checkoutLink;
    } catch (error) {
      console.error("PAYMENT START ERROR:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start payment."
      );
    } finally {
      setStartingPayment(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 sm:px-6">
        <p className="text-white/70">Loading account...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-8 text-center">
          <h1 className="mb-3 sm:mb-4 text-2xl sm:text-3xl font-bold">
            Sign in required
          </h1>

          <p className="mb-5 sm:mb-6 text-sm sm:text-base text-white/70">
            Sign in before choosing a NaijaVid AI plan.
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Return Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-black px-3 py-6 text-white sm:px-5 sm:py-10 md:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-7 sm:mb-10">
          <h1 className="mb-2 sm:mb-3 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Pricing
          </h1>

          <p className="text-base sm:text-lg text-white/60">
            Choose the plan that fits your video creation needs.
          </p>
        </div>

        {message && (
          <div className="mb-6 sm:mb-8 break-words rounded-2xl border border-white/10 bg-white/5 p-4 text-sm sm:text-base text-white/90">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8">
          {/* FREE PLAN */}

          <section className="min-w-0 rounded-2xl sm:rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 md:p-8">
            <h2 className="mb-2 sm:mb-3 text-2xl sm:text-3xl font-bold">
              Free
            </h2>

            <p className="mb-6 sm:mb-8 text-sm sm:text-base text-white/60">
              For testing and light usage.
            </p>

            <div className="mb-6 sm:mb-8 text-3xl sm:text-4xl font-bold">
              ₦0
            </div>

            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-white/75">
              <p>3 video generations per day</p>
              <p>5-second videos</p>
              <p>Text-to-video</p>
              <p>Image-to-video</p>
              <p>Video history</p>
              <p>Standard access</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/generator")}
              className="mt-8 sm:mt-10 min-h-12 w-full rounded-xl border border-white/10 bg-white/5 px-5 sm:px-6 py-3.5 sm:py-4 font-semibold text-white hover:bg-white/10"
            >
              Continue with Free
            </button>
          </section>

          {/* FOUNDING PRO */}

          <section className="min-w-0 rounded-2xl sm:rounded-3xl border border-green-500/30 bg-green-500/[0.06] p-5 sm:p-6 md:p-8">
            <div className="mb-4 inline-flex max-w-full rounded-full border border-green-500/30 bg-green-500/10 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-green-400">
              INTRODUCTORY OFFER
            </div>

            <h2 className="mb-2 sm:mb-3 text-2xl sm:text-3xl font-bold">
              Founding Pro
            </h2>

            <p className="mb-6 sm:mb-8 text-sm sm:text-base text-white/60">
              For creators who want unlimited access during the launch period.
            </p>

            <div className="mb-1 sm:mb-2 text-3xl sm:text-4xl font-bold">
              ₦5,000
            </div>

            <p className="mb-6 sm:mb-8 text-sm sm:text-base text-white/50">
              per month
            </p>

            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-white/75">
              <p>Unlimited video generations*</p>
              <p>5-second and 8-second videos</p>
              <p>Text-to-video</p>
              <p>Image-to-video</p>
              <p>Full video history</p>
              <p>Priority access</p>
              <p>Founding member status</p>
            </div>

            <p className="mt-5 text-xs leading-5 text-white/40">
              *Subject to fair-use and platform capacity limits.
            </p>

            <button
              type="button"
              onClick={startFoundingProPayment}
              disabled={startingPayment}
              className="mt-8 sm:mt-10 min-h-12 w-full rounded-xl bg-white px-5 sm:px-6 py-3.5 sm:py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startingPayment
                ? "Starting payment..."
                : "Upgrade to Founding Pro"}
            </button>
          </section>
        </div>

        <div className="mt-8 sm:mt-10">
          <button
            type="button"
            onClick={() => router.push("/generator")}
            className="w-full sm:w-auto rounded-xl border border-white/10 px-5 sm:px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Back to Generator
          </button>
        </div>
      </div>
    </main>
  );
}
