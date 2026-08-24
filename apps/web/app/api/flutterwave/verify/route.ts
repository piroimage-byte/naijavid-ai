import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";

type FlutterwaveVerificationResponse = {
  status?: string;
  message?: string;

  data?: {
    id?: number;
    tx_ref?: string;
    flw_ref?: string;

    amount?: number;
    charged_amount?: number;

    currency?: string;
    status?: string;

    customer?: {
      id?: number;
      name?: string;
      phone_number?: string;
      email?: string;
    };

    meta?: {
      userId?: string;
      plan?: string;

      [key: string]: unknown;
    };

    created_at?: string;
  };
};

// ----------------------------------------------------
// EXTRACT USER ID FROM TX REF
// ----------------------------------------------------

function getUserIdFromTxRef(txRef: string) {
  /*
    Expected format:

    naijavid_USERID_TIMESTAMP

    Example:
    naijavid_LjU4t5mEB6P5yUmZ8aIHCxf3giC2_1787486353548
  */

  if (!txRef.startsWith("naijavid_")) {
    return "";
  }

  const withoutPrefix =
    txRef.substring("naijavid_".length);

  const lastUnderscore =
    withoutPrefix.lastIndexOf("_");

  if (lastUnderscore === -1) {
    return "";
  }

  return withoutPrefix
    .substring(0, lastUnderscore)
    .trim();
}

// ----------------------------------------------------
// VERIFY PAYMENT
// ----------------------------------------------------

export async function POST(
  request: NextRequest
) {
  try {
    // ------------------------------------------------
    // FLUTTERWAVE SECRET KEY
    // ------------------------------------------------

    const secretKey =
      process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing FLUTTERWAVE_SECRET_KEY",
        },
        {
          status: 500,
        }
      );
    }

    // ------------------------------------------------
    // REQUEST BODY
    // ------------------------------------------------

    const body =
      await request.json();

    const transactionId =
      String(
        body.transactionId || ""
      ).trim();

    const callbackTxRef =
      String(
        body.txRef || ""
      ).trim();

    if (!transactionId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "transactionId is required.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // VERIFY WITH FLUTTERWAVE
    // ------------------------------------------------

    const verificationResponse =
      await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
          transactionId
        )}/verify`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${secretKey}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          cache: "no-store",
        }
      );

    let verificationData:
      FlutterwaveVerificationResponse;

    try {
      verificationData =
        await verificationResponse.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Flutterwave returned an invalid verification response.",
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "FLUTTERWAVE VERIFY RESPONSE:",
      verificationData
    );

    // ------------------------------------------------
    // FLUTTERWAVE API FAILURE
    // ------------------------------------------------

    if (
      !verificationResponse.ok ||
      verificationData.status !==
        "success"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            verificationData.message ||
            "Flutterwave verification failed.",
        },
        {
          status:
            verificationResponse.status ||
            500,
        }
      );
    }

    const transaction =
      verificationData.data;

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Flutterwave verification returned no transaction data.",
        },
        {
          status: 500,
        }
      );
    }

    // ------------------------------------------------
    // TRANSACTION STATUS
    // ------------------------------------------------

    if (
      transaction.status !==
      "successful"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Payment status is ${transaction.status || "unknown"}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // VERIFY CURRENCY
    // ------------------------------------------------

    if (
      transaction.currency !==
      PRO_CURRENCY
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Invalid payment currency. Expected ${PRO_CURRENCY}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // VERIFY AMOUNT
    // ------------------------------------------------

    const paidAmount =
      Number(
        transaction.charged_amount ??
          transaction.amount ??
          0
      );

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      paidAmount < PRO_AMOUNT
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Invalid payment amount. Expected at least NGN ${PRO_AMOUNT}.`,
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // VERIFY TX REF
    // ------------------------------------------------

    const verifiedTxRef =
      String(
        transaction.tx_ref || ""
      ).trim();

    if (!verifiedTxRef) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verified transaction has no tx_ref.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      callbackTxRef &&
      callbackTxRef !==
        verifiedTxRef
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Transaction reference mismatch.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // FIND USER ID
    // ------------------------------------------------

    const metaUserId =
      typeof transaction.meta
        ?.userId === "string"
        ? transaction.meta.userId.trim()
        : "";

    const txRefUserId =
      getUserIdFromTxRef(
        verifiedTxRef
      );

    const userId =
      metaUserId ||
      txRefUserId;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Unable to determine the user associated with this payment.",
        },
        {
          status: 400,
        }
      );
    }

    // ------------------------------------------------
    // FIRESTORE
    // ------------------------------------------------

    const db =
      getAdminDb();

    const userRef =
      db
        .collection("users")
        .doc(userId);

    const paymentRef =
      db
        .collection("payments")
        .doc(
          String(
            transaction.id ||
              transactionId
          )
        );

    // ------------------------------------------------
    // SUBSCRIPTION DATES
    // ------------------------------------------------

    const now =
      new Date();

    const expiresAt =
      new Date(now);

    expiresAt.setDate(
      expiresAt.getDate() + 30
    );

    // ------------------------------------------------
    // TRANSACTION
    // ------------------------------------------------

    await db.runTransaction(
      async (
        firestoreTransaction
      ) => {
        const existingPayment =
          await firestoreTransaction.get(
            paymentRef
          );

        // --------------------------------------------
        // IDEMPOTENCY
        // --------------------------------------------

        if (
          existingPayment.exists &&
          existingPayment.data()
            ?.verified === true
        ) {
          return;
        }

        // --------------------------------------------
        // ACTIVATE FOUNDING PRO
        // --------------------------------------------

        firestoreTransaction.set(
          userRef,
          {
            plan: "pro",

            subscriptionStatus:
              "active",

            foundingMember: true,

            generationLimit:
              999999,

            subscriptionStartedAt:
              FieldValue.serverTimestamp(),

            subscriptionExpiresAt:
              Timestamp.fromDate(
                expiresAt
              ),

            lastPaymentTransactionId:
              String(
                transaction.id ||
                  transactionId
              ),

            lastPaymentTxRef:
              verifiedTxRef,

            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        // --------------------------------------------
        // SAVE PAYMENT RECORD
        // --------------------------------------------

        firestoreTransaction.set(
          paymentRef,
          {
            userId,

            transactionId:
              String(
                transaction.id ||
                  transactionId
              ),

            txRef:
              verifiedTxRef,

            flutterwaveRef:
              String(
                transaction.flw_ref ||
                  ""
              ),

            amount:
              Number(
                transaction.amount ||
                  paidAmount
              ),

            chargedAmount:
              paidAmount,

            currency:
              transaction.currency,

            paymentStatus:
              transaction.status,

            plan:
              "founding_pro",

            customerEmail:
              String(
                transaction.customer
                  ?.email || ""
              ),

            customerName:
              String(
                transaction.customer
                  ?.name || ""
              ),

            verified: true,

            verifiedAt:
              FieldValue.serverTimestamp(),

            subscriptionExpiresAt:
              Timestamp.fromDate(
                expiresAt
              ),
          },
          {
            merge: true,
          }
        );
      }
    );

    // ------------------------------------------------
    // SUCCESS
    // ------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        message:
          "Payment verified successfully. Founding Pro is now active.",

        plan:
          "pro",

        subscriptionStatus:
          "active",

        foundingMember:
          true,

        userId,

        amount:
          paidAmount,

        currency:
          transaction.currency,

        txRef:
          verifiedTxRef,

        transactionId:
          String(
            transaction.id ||
              transactionId
          ),

        subscriptionExpiresAt:
          expiresAt.toISOString(),
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "FLUTTERWAVE VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Payment verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}