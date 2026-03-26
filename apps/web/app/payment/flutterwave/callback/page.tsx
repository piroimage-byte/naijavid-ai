"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CallbackContent() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Processing payment...");

  useEffect(() => {
    async function verifyPayment() {
      try {
        const transaction_id = searchParams.get("transaction_id");
        const tx_ref = searchParams.get("tx_ref");
        const status = searchParams.get("status");

        if (!transaction_id || !tx_ref) {
          setMessage("Invalid payment response.");
          return;
        }

        if (status !== "successful") {
          setMessage("Payment was not successful.");
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
          return;
        }

        setMessage("Payment successful. Your Pro plan is now active.");
      } catch {
        setMessage("Something went wrong while verifying payment.");
      }
    }

    verifyPayment();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Flutterwave Payment Status</h1>
        <p className="text-white/80">{message}</p>
      </div>
    </main>
  );
}

function CallbackFallback() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Flutterwave Payment Status</h1>
        <p className="text-white/80">Loading payment details...</p>
      </div>
    </main>
  );
}

export default function FlutterwaveCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <CallbackContent />
    </Suspense>
  );
}