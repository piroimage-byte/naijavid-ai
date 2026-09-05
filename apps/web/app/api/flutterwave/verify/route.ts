import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";
const SUBSCRIPTION_DAYS = 30;

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

// ========================================================
// GET DATE FROM FIRESTORE VALUE
// ========================================================

function getExpiryDate(
  value: unknown
): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate();
    } catch {
      return null;
    }
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed;
    }
  }

  return null;
}

// ========================================================
// ADD SUBSCRIPTION DAYS
// ========================================================

function addSubscriptionDays(
  date: Date,
  days: number
) {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() +
      days
  );

  return result;
}

// ========================================================
// EXTRACT USER ID FROM TX REF
// ========================================================

function getUserIdFromTxRef(
  txRef: string
) {
  if (
    !txRef.startsWith(
      "naijavid_"
    )
  ) {
    return "";
  }

  const withoutPrefix =
    txRef.substring(
      "naijavid_".length
    );

  const lastUnderscore =
    withoutPrefix.lastIndexOf(
      "_"
    );

  if (
    lastUnderscore === -1
  ) {
    return "";
  }

  return withoutPrefix
    .substring(
      0,
      lastUnderscore
    )
    .trim();
}

// ========================================================
// VERIFY PAYMENT
// ========================================================

export async function POST(
  request: NextRequest
) {
  try {
    // ====================================================
    // FLUTTERWAVE CONFIGURATION
    // ====================================================

    const secretKey =
      process.env
        .FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    // ====================================================
    // VERIFY FIREBASE AUTHENTICATION
    // ====================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const idToken =
      authorization
        .slice(7)
        .trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication token is missing.",
        },
        {
          status: 401,
        }
      );
    }

    let decodedToken;

    try {
      decodedToken =
        await getAdminAuth()
          .verifyIdToken(
            idToken
          );
    } catch (authError) {
      console.error(
        "FLUTTERWAVE VERIFY AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired authentication token.",
        },
        {
          status: 401,
        }
      );
    }

    const authenticatedUserId =
      decodedToken.uid;

    if (
      !authenticatedUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to identify authenticated user.",
        },
        {
          status: 401,
        }
      );
    }

    // ====================================================
    // REQUEST BODY
    // ====================================================

    const body =
      await request.json();

    const transactionId =
      String(
        body.transactionId ||
          ""
      ).trim();

    const callbackTxRef =
      String(
        body.txRef ||
          ""
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

    // ====================================================
    // VERIFY DIRECTLY WITH FLUTTERWAVE
    // ====================================================

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

          cache:
            "no-store",
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

    // ====================================================
    // FLUTTERWAVE API RESULT
    // ====================================================

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
          status: 502,
        }
      );
    }

    // ====================================================
    // PAYMENT STATUS
    // ====================================================

    if (
      transaction.status !==
      "successful"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            `Payment status is ${
              transaction.status ||
              "unknown"
            }.`,
        },
        {
          status: 400,
        }
      );
    }

    // ====================================================
    // CURRENCY
    // ====================================================

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

    // ====================================================
    // AMOUNT
    // ====================================================

    const paidAmount =
      Number(
        transaction
          .charged_amount ??
          transaction.amount ??
          0
      );

    if (
      !Number.isFinite(
        paidAmount
      ) ||
      paidAmount <
        PRO_AMOUNT
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

    // ====================================================
    // TX REF
    // ====================================================

    const verifiedTxRef =
      String(
        transaction.tx_ref ||
          ""
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

    // ====================================================
    // PLAN
    // ====================================================

    const verifiedPlan =
      typeof transaction.meta
        ?.plan === "string"
        ? transaction.meta.plan
            .trim()
            .toLowerCase()
        : "";

    if (
      verifiedPlan !==
      "founding_pro"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Transaction is not for the Founding Pro plan.",
        },
        {
          status: 400,
        }
      );
    }

    // ====================================================
    // PAYMENT OWNER
    // ====================================================

    const metaUserId =
      typeof transaction.meta
        ?.userId === "string"
        ? transaction.meta.userId
            .trim()
        : "";

    const txRefUserId =
      getUserIdFromTxRef(
        verifiedTxRef
      );

    if (
      metaUserId &&
      txRefUserId &&
      metaUserId !==
        txRefUserId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ownership information does not match.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentUserId =
      metaUserId ||
      txRefUserId;

    if (!paymentUserId) {
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

    // ====================================================
    // AUTHENTICATED OWNERSHIP
    // ====================================================

    if (
      paymentUserId !==
      authenticatedUserId
    ) {
      console.warn(
        "PAYMENT OWNERSHIP MISMATCH:",
        {
          authenticatedUserId,
          paymentUserId,
          transactionId,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "This payment does not belong to the authenticated account.",
        },
        {
          status: 403,
        }
      );
    }

    // ====================================================
    // FIRESTORE REFERENCES
    // ====================================================

    const db =
      getAdminDb();

    const userRef =
      db
        .collection("users")
        .doc(
          authenticatedUserId
        );

    const paymentId =
      String(
        transaction.id ||
          transactionId
      );

    const paymentRef =
      db
        .collection(
          "payments"
        )
        .doc(
          paymentId
        );

    const now =
      new Date();

    // ====================================================
    // FIRESTORE TRANSACTION
    // ====================================================

    const result =
      await db.runTransaction(
        async (
          firestoreTransaction
        ) => {
          // ==============================================
          // READ PAYMENT AND USER BEFORE WRITING
          // ==============================================

          const [
            existingPayment,
            userSnapshot,
          ] = await Promise.all([
            firestoreTransaction.get(
              paymentRef
            ),

            firestoreTransaction.get(
              userRef
            ),
          ]);

          // ==============================================
          // DUPLICATE TRANSACTION PROTECTION
          // ==============================================

          if (
            existingPayment.exists &&
            existingPayment.data()
              ?.verified === true
          ) {
            const existingPaymentData =
              existingPayment.data() ||
              {};

            const existingUserId =
              String(
                existingPaymentData
                  .userId ||
                  ""
              );

            if (
              existingUserId &&
              existingUserId !==
                authenticatedUserId
            ) {
              throw new Error(
                "This transaction has already been assigned to another account."
              );
            }

            const existingExpiry =
              getExpiryDate(
                existingPaymentData
                  .subscriptionExpiresAt
              );

            return {
              duplicate:
                true,

              expiresAt:
                existingExpiry,
            };
          }

          // ==============================================
          // CURRENT USER SUBSCRIPTION
          // ==============================================

          const userData =
            userSnapshot.exists
              ? userSnapshot.data() ||
                {}
              : {};

          const currentExpiry =
            getExpiryDate(
              userData
                .subscriptionExpiresAt
            );

          const currentPlan =
            userData.plan === "pro"
              ? "pro"
              : "free";

          const currentStatus =
            userData
              .subscriptionStatus ===
            "active"
              ? "active"
              : "inactive";

          const hasActiveFutureSubscription =
            currentPlan === "pro" &&
            currentStatus ===
              "active" &&
            currentExpiry !== null &&
            currentExpiry.getTime() >
              now.getTime();

          // ==============================================
          // RENEWAL BASE DATE
          // ==============================================

          const renewalBaseDate =
            hasActiveFutureSubscription &&
            currentExpiry
              ? currentExpiry
              : now;

          // ==============================================
          // ADD 30 DAYS
          // ==============================================

          const newExpiry =
            addSubscriptionDays(
              renewalBaseDate,
              SUBSCRIPTION_DAYS
            );

          // ==============================================
          // USER UPDATE
          // ==============================================

          const userUpdate:
            Record<string, unknown> =
            {
              plan:
                "pro",

              subscriptionStatus:
                "active",

              foundingMember:
                true,

              generationLimit:
                999999,

              subscriptionExpiresAt:
                Timestamp.fromDate(
                  newExpiry
                ),

              lastPaymentTransactionId:
                paymentId,

              lastPaymentTxRef:
                verifiedTxRef,

              lastPaymentAt:
                FieldValue
                  .serverTimestamp(),

              updatedAt:
                FieldValue
                  .serverTimestamp(),
            };

          // ==============================================
          // NEW OR EXPIRED SUBSCRIPTION
          // ==============================================

          if (
            !hasActiveFutureSubscription
          ) {
            userUpdate
              .subscriptionStartedAt =
              FieldValue
                .serverTimestamp();
          } else {
            // Existing Pro user renewed
            // before expiry.

            userUpdate
              .subscriptionRenewedAt =
              FieldValue
                .serverTimestamp();
          }

          firestoreTransaction.set(
            userRef,
            userUpdate,
            {
              merge:
                true,
            }
          );

          // ==============================================
          // PAYMENT RECORD
          // ==============================================

          firestoreTransaction.set(
            paymentRef,
            {
              userId:
                authenticatedUserId,

              transactionId:
                paymentId,

              txRef:
                verifiedTxRef,

              flutterwaveRef:
                String(
                  transaction
                    .flw_ref ||
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
                    ?.email ||
                    ""
                ),

              customerName:
                String(
                  transaction.customer
                    ?.name ||
                    ""
                ),

              verified:
                true,

              verifiedAt:
                FieldValue
                  .serverTimestamp(),

              subscriptionDaysAdded:
                SUBSCRIPTION_DAYS,

              renewalBaseDate:
                Timestamp.fromDate(
                  renewalBaseDate
                ),

              subscriptionExpiresAt:
                Timestamp.fromDate(
                  newExpiry
                ),

              wasRenewal:
                hasActiveFutureSubscription,
            },
            {
              merge:
                true,
            }
          );

          return {
            duplicate:
              false,

            expiresAt:
              newExpiry,
          };
        }
      );

    // ====================================================
    // FINAL EXPIRY
    // ====================================================

    const finalExpiry =
      result.expiresAt;

    if (!finalExpiry) {
      throw new Error(
        "Unable to determine subscription expiry date."
      );
    }

    // ====================================================
    // SUCCESS
    // ====================================================

    return NextResponse.json(
      {
        success:
          true,

        message:
          result.duplicate
            ? "Payment was already verified. Founding Pro remains active."
            : "Payment verified successfully. Founding Pro is now active.",

        plan:
          "pro",

        subscriptionStatus:
          "active",

        foundingMember:
          true,

        duplicate:
          result.duplicate,

        amount:
          paidAmount,

        currency:
          transaction.currency,

        txRef:
          verifiedTxRef,

        transactionId:
          paymentId,

        subscriptionExpiresAt:
          finalExpiry.toISOString(),
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