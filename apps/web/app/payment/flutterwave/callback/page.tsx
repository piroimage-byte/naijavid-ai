"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function FlutterwaveCallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying payment...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyPayment() {
      try {
        const status = searchParams.get("status");
        const transaction_id = searchParams.get("transaction_id");
        const tx_ref = searchParams.get("tx_ref");

        if (status !== "successful" || !transaction_id) {
          setMessage("Payment was not completed successfully.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/flutterwave/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id,
            tx_ref,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data?.error || "Payment verification failed.");
          setLoading(false);
          return;
        }

        setMessage("Payment verified successfully. Your Pro plan is now active.");
      } catch (error) {
        setMessage("Something went wrong while verifying payment.");
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [searchParams]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-4">
          Flutterwave Payment Status
        </h1>

        <p className="text-white/80 text-base">
          {loading ? "Please wait..." : message}
        </p>
      </div>
    </main>
  );
}

export default function FlutterwaveCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-black px-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
            <h1 className="text-2xl font-bold text-white mb-4">
              Flutterwave Payment Status
            </h1>
            <p className="text-white/80 text-base">Loading payment details...</p>
          </div>
        </main>
      }
    >
      <FlutterwaveCallbackContent />
    </Suspense>
  );
}