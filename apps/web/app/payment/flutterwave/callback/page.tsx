"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function FlutterwaveCallbackPage() {
  const params = useSearchParams();

  const [status, setStatus] = useState("Processing payment...");

  useEffect(() => {
    const tx_ref = params.get("tx_ref");
    const transaction_id = params.get("transaction_id");
    const payment_status = params.get("status");

    if (!tx_ref || !transaction_id) {
      setStatus("Invalid payment response.");
      return;
    }

    async function verifyPayment() {
      try {
        const res = await fetch("/api/flutterwave/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_id,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus("Payment successful. You are now Pro.");
        } else {
          setStatus("Payment verification failed.");
        }
      } catch {
        setStatus("Error verifying payment.");
      }
    }

    verifyPayment();
  }, [params]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <h1 className="text-2xl font-semibold">{status}</h1>
    </main>
  );
}