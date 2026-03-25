"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function FlutterwaveCallbackPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying payment...");

  useEffect(() => {
    async function verifyPayment() {
      try {
        const status = searchParams.get("status");
        const transaction_id = searchParams.get("transaction_id");

        if (status !== "successful" || !transaction_id) {
          setMessage("Payment was not completed successfully.");
          return;
        }

        const response = await fetch("/api/flutterwave/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transaction_id }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Verification failed.");
          return;
        }

        setMessage("Payment successful. Your Pro plan is now active.");
      } catch (error) {
        setMessage("Something went wrong during verification.");
      }
    }

    verifyPayment();
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <h1 className="text-2xl font-bold mb-3">Flutterwave Payment</h1>
        <p>{message}</p>
      </div>
    </main>
  );
}