"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FlutterwaveCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [message, setMessage] = useState(
    "Verifying your payment..."
  );

  const [success, setSuccess] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    async function verifyPayment() {
      try {
        const status =
          searchParams.get("status");

        const transactionId =
          searchParams.get("transaction_id");

        const txRef =
          searchParams.get("tx_ref");

        if (status !== "successful") {
          setSuccess(false);
          setMessage(
            "Payment was not completed successfully."
          );
          return;
        }

        if (!transactionId) {
          setSuccess(false);
          setMessage(
            "Missing Flutterwave transaction ID."
          );
          return;
        }

        const response = await fetch(
          "/api/flutterwave/verify",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              transactionId,
              txRef,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              "Payment verification failed."
          );
        }

        setSuccess(true);

        setMessage(
          "Payment verified successfully. Your Founding Pro subscription is now active."
        );
      } catch (error) {
        console.error(
          "PAYMENT CALLBACK ERROR:",
          error
        );

        setSuccess(false);

        setMessage(
          error instanceof Error
            ? error.message
            : "Payment verification failed."
        );
      }
    }

    verifyPayment();
  }, [searchParams]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          border: "1px solid #333",
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
          background: "#111",
        }}
      >
        <h1
          style={{
            fontSize: 32,
            marginBottom: 20,
          }}
        >
          Flutterwave Payment Status
        </h1>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.6,
            color:
              success === true
                ? "#4ade80"
                : success === false
                  ? "#f87171"
                  : "#fff",
          }}
        >
          {message}
        </p>

        {success === true && (
          <button
            type="button"
            onClick={() =>
              router.push("/generator")
            }
            style={{
              marginTop: 24,
              padding: "14px 22px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Continue to Generator
          </button>
        )}

        {success === false && (
          <button
            type="button"
            onClick={() =>
              router.push("/pricing")
            }
            style={{
              marginTop: 24,
              padding: "14px 22px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Return to Pricing
          </button>
        )}
      </div>
    </main>
  );
}