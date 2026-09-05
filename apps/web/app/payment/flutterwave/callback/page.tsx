"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useAuth,
} from "@/components/providers/auth-provider";

function FlutterwaveCallbackContent() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    user,
    loading,
  } = useAuth();

  const [message, setMessage] =
    useState(
      "Verifying your payment..."
    );

  const [success, setSuccess] =
    useState<boolean | null>(
      null
    );

  useEffect(() => {
    // Wait until Firebase has finished restoring
    // the authenticated user after returning
    // from Flutterwave.
    if (loading) {
      return;
    }

    let cancelled = false;

    async function verifyPayment() {
      try {
        // ===============================================
        // REQUIRE AUTHENTICATED USER
        // ===============================================

        if (!user) {
          if (!cancelled) {
            setSuccess(false);

            setMessage(
              "Please sign in to the account that started this payment before verification can continue."
            );
          }

          return;
        }

        // ===============================================
        // READ FLUTTERWAVE CALLBACK PARAMETERS
        // ===============================================

        const status =
          searchParams.get(
            "status"
          );

        const transactionId =
          searchParams.get(
            "transaction_id"
          );

        const txRef =
          searchParams.get(
            "tx_ref"
          );

        // ===============================================
        // BASIC CALLBACK CHECKS
        // ===============================================

        if (
          status !==
          "successful"
        ) {
          if (!cancelled) {
            setSuccess(false);

            setMessage(
              "Payment was not completed successfully."
            );
          }

          return;
        }

        if (!transactionId) {
          if (!cancelled) {
            setSuccess(false);

            setMessage(
              "Missing Flutterwave transaction ID."
            );
          }

          return;
        }

        // ===============================================
        // GET FRESH FIREBASE ID TOKEN
        // ===============================================

        const idToken =
          await user.getIdToken();

        if (!idToken) {
          throw new Error(
            "Unable to authenticate your account."
          );
        }

        // ===============================================
        // VERIFY PAYMENT ON SERVER
        // ===============================================

        const response =
          await fetch(
            "/api/flutterwave/verify",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${idToken}`,
              },

              body:
                JSON.stringify({
                  transactionId,
                  txRef,
                }),
            }
          );

        let data: any = null;

        try {
          data =
            await response.json();
        } catch {
          throw new Error(
            "Payment server returned an invalid response."
          );
        }

        // ===============================================
        // HANDLE VERIFICATION FAILURE
        // ===============================================

        if (
          !response.ok ||
          !data?.success
        ) {
          throw new Error(
            data?.error ||
              data?.message ||
              "Payment verification failed."
          );
        }

        // ===============================================
        // SUCCESS
        // ===============================================

        if (!cancelled) {
          setSuccess(true);

          setMessage(
            "Payment verified successfully. Your Founding Pro subscription is now active."
          );
        }
      } catch (error) {
        console.error(
          "PAYMENT CALLBACK ERROR:",
          error
        );

        if (!cancelled) {
          setSuccess(false);

          setMessage(
            error instanceof Error
              ? error.message
              : "Payment verification failed."
          );
        }
      }
    }

    verifyPayment();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    user,
    searchParams,
  ]);

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-black px-3 py-6 text-white sm:px-5 sm:py-8">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111] p-5 text-center sm:rounded-3xl sm:p-8">

        {/* STATUS ICON */}

        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold ${
            success === true
              ? "bg-green-500/10 text-green-400"
              : success === false
                ? "bg-red-500/10 text-red-400"
                : "bg-white/10 text-white"
          }`}
        >
          {success === true
            ? "✓"
            : success === false
              ? "!"
              : "…"}
        </div>

        {/* TITLE */}

        <h1 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">
          Flutterwave Payment Status
        </h1>

        {/* MESSAGE */}

        <p
          className={`break-words text-sm leading-6 sm:text-base sm:leading-7 ${
            success === true
              ? "text-green-400"
              : success === false
                ? "text-red-400"
                : "text-white/80"
          }`}
        >
          {loading
            ? "Restoring your account..."
            : message}
        </p>

        {/* VERIFYING */}

        {success === null && (
          <div className="mt-6">
            <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-white/70" />
            </div>

            <p className="mt-3 text-xs leading-5 text-white/40 sm:text-sm">
              Please keep this page open while we confirm your payment.
            </p>
          </div>
        )}

        {/* SUCCESS */}

        {success === true && (
          <button
            type="button"
            onClick={() =>
              router.push(
                "/generator"
              )
            }
            className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 py-3.5 font-bold text-black transition hover:bg-gray-200 sm:mt-7 sm:w-auto sm:px-6"
          >
            Continue to Generator
          </button>
        )}

        {/* FAILURE */}

        {success === false && (
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="min-h-12 w-full rounded-xl bg-white px-5 py-3.5 font-bold text-black transition hover:bg-gray-200 sm:w-auto sm:px-6"
            >
              Return to Pricing
            </button>

            {!user && (
              <div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/login"
                    )
                  }
                  className="min-h-12 w-full rounded-xl border border-white/10 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10 sm:w-auto sm:px-6"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

// ========================================================
// PAGE EXPORT
// ========================================================

export default function FlutterwaveCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white sm:px-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-white/10" />

            <p className="text-sm text-white/60 sm:text-base">
              Loading payment status...
            </p>
          </div>
        </main>
      }
    >
      <FlutterwaveCallbackContent />
    </Suspense>
  );
}