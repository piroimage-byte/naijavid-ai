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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    created_at?: string;

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
  };
};

type VerificationRequestBody = {
  transactionId?: string | number;
  txRef?: string;
};

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
    const parsedDate =
      new Date(value);

    if (
      !Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return parsedDate;
    }
  }

  return null;
}

function addSubscriptionDays(
  date: Date,
  days: number
): Date {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() + days
  );

  return result;
}

function getUserIdFromTxRef(
  txRef: string
): string {
  const prefix =
    "naijavid_";

  if (!txRef.startsWith(prefix)) {
    return "";
  }

  const withoutPrefix =
    txRef.substring(
      prefix.length
    );

  const lastUnderscore =
    withoutPrefix.lastIndexOf("_");

  if (lastUnderscore === -1) {
    return "";
  }

  return withoutPrefix
    .substring(
      0,
      lastUnderscore
    )
    .trim();
}

export async function POST(
  request: NextRequest
) {
  try {
    const secretKey =
      process.env
        .FLUTTERWAVE_SECRET_KEY
        ?.trim();

    if (!secretKey) {
      console.error(
        "FLUTTERWAVE_SECRET_KEY is missing."
      );

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

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
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
    } catch (error) {
      console.error(
        "FLUTTERWAVE VERIFY AUTH ERROR:",
        error
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

    const authenticatedEmail =
      typeof decodedToken.email ===
      "string"
        ? decodedToken.email
            .trim()
            .toLowerCase()
        : "";

    if (!authenticatedUserId) {
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

    let body:
      VerificationRequestBody;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const transactionId =
      String(
        body.transactionId ?? ""
      ).trim();

    const callbackTxRef =
      String(
        body.txRef ?? ""
      ).trim();

    if (
      !transactionId ||
      !/^\d+$/.test(transactionId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A valid transactionId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!callbackTxRef) {
      return NextResponse.json(
        {
          success: false,
          error:
            "txRef is required.",
        },
        {
          status: 400,
        }
      );
    }

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
      console.error(
        "Flutterwave returned invalid verification JSON."
      );

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
      {
        httpStatus:
          verificationResponse.status,

        flutterwaveStatus:
          verificationData.status,

        message:
          verificationData.message,

        transactionId,

        authenticatedUserId,
      }
    );

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
            verificationResponse
              .status >= 400 &&
            verificationResponse
              .status <= 599
              ? verificationResponse
                  .status
              : 502,
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

    const verifiedCurrency =
      String(
        transaction.currency ?? ""
      )
        .trim()
        .toUpperCase();

    if (
      verifiedCurrency !==
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

    const paidAmount =
      Number(
        transaction.amount ?? 0
      );

    const chargedAmount =
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

    if (
      !Number.isFinite(
        chargedAmount
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid charged payment amount.",
        },
        {
          status: 400,
        }
      );
    }

    const verifiedTxRef =
      String(
        transaction.tx_ref ?? ""
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
      metaUserId !== txRefUserId
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

    const paymentEmail =
      String(
        transaction.customer
          ?.email ?? ""
      )
        .trim()
        .toLowerCase();

    if (
      authenticatedEmail &&
      paymentEmail &&
      authenticatedEmail !==
        paymentEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment email does not match the authenticated account.",
        },
        {
          status: 403,
        }
      );
    }

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
        transaction.id ??
        transactionId
      ).trim();

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verified transaction has no transaction ID.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentRef =
      db
        .collection("payments")
        .doc(paymentId);

    const now =
      new Date();

    const result =
      await db.runTransaction(
        async (
          firestoreTransaction
        ) => {
          const existingPayment =
            await firestoreTransaction.get(
              paymentRef
            );

          const userSnapshot =
            await firestoreTransaction.get(
              userRef
            );

          if (
            existingPayment.exists &&
            existingPayment.data()
              ?.verified === true
          ) {
            const existingPaymentData =
              existingPayment.data() ??
              {};

            const existingUserId =
              String(
                existingPaymentData
                  .userId ?? ""
              ).trim();

            const existingTxRef =
              String(
                existingPaymentData
                  .txRef ?? ""
              ).trim();

            if (
              existingUserId !==
              authenticatedUserId
            ) {
              throw new Error(
                "This transaction has already been assigned to another account."
              );
            }

            if (
              existingTxRef &&
              existingTxRef !==
                verifiedTxRef
            ) {
              throw new Error(
                "The stored transaction reference does not match."
              );
            }

            const existingExpiry =
              getExpiryDate(
                existingPaymentData
                  .subscriptionExpiresAt
              );

            return {
              duplicate: true,
              expiresAt:
                existingExpiry,
            };
          }

          const userData =
            userSnapshot.exists
              ? userSnapshot.data() ??
                {}
              : {};

          const currentExpiry =
            getExpiryDate(
              userData
                .subscriptionExpiresAt
            );

          const hasActiveFutureSubscription =
            userData.plan === "pro" &&
            userData
              .subscriptionStatus ===
              "active" &&
            currentExpiry !== null &&
            currentExpiry.getTime() >
              now.getTime();

          const renewalBaseDate =
            hasActiveFutureSubscription &&
            currentExpiry
              ? currentExpiry
              : now;

          const newExpiry =
            addSubscriptionDays(
              renewalBaseDate,
              SUBSCRIPTION_DAYS
            );

          const userUpdate:
            Record<string, unknown> =
            {
              plan: "pro",

              subscriptionStatus:
                "active",

              foundingMember: true,

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

          if (
            hasActiveFutureSubscription
          ) {
            userUpdate
              .subscriptionRenewedAt =
              FieldValue
                .serverTimestamp();
          } else {
            userUpdate
              .subscriptionStartedAt =
              FieldValue
                .serverTimestamp();
          }

          firestoreTransaction.set(
            userRef,
            userUpdate,
            {
              merge: true,
            }
          );

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
                    .flw_ref ?? ""
                ),

              amount:
                paidAmount,

              chargedAmount,

              currency:
                verifiedCurrency,

              paymentStatus:
                transaction.status,

              plan:
                "founding_pro",

              customerEmail:
                paymentEmail,

              customerName:
                String(
                  transaction.customer
                    ?.name ?? ""
                ),

              verified: true,

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
              merge: true,
            }
          );

          return {
            duplicate: false,
            expiresAt:
              newExpiry,
          };
        }
      );

    const finalExpiry =
      result.expiresAt;

    if (!finalExpiry) {
      throw new Error(
        "Unable to determine subscription expiry date."
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          result.duplicate
            ? "Payment was already verified. Founding Pro remains active."
            : "Payment verified successfully. Founding Pro is now active.",

        plan: "pro",

        subscriptionStatus:
          "active",

        foundingMember: true,

        duplicate:
          result.duplicate,

        amount:
          paidAmount,

        chargedAmount,

        currency:
          verifiedCurrency,

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
  } catch (error: unknown) {
    console.error(
      "FLUTTERWAVE VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}