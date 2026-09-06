import crypto from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import {
  getAdminDb,
} from "@/lib/firebase-admin";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";
const SUBSCRIPTION_DAYS = 30;

type FlutterwaveWebhookPayload = {
  event?: string;
  type?: string;

  data?: {
    id?: number | string;
    status?: string;
    tx_ref?: string;
    reference?: string;
  };
};

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
  };
};

// ========================================================
// CONSTANT-TIME STRING COMPARISON
// ========================================================

function safeCompare(
  valueA: string,
  valueB: string
) {
  try {
    const a = Buffer.from(valueA);
    const b = Buffer.from(valueB);

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      a,
      b
    );
  } catch {
    return false;
  }
}

// ========================================================
// VERIFY WEBHOOK SIGNATURE
// ========================================================

function verifyWebhookSignature(
  rawBody: string,
  request: NextRequest,
  secretHash: string
) {
  // Current Flutterwave webhook signature.

  const flutterwaveSignature =
    request.headers.get(
      "flutterwave-signature"
    );

  if (flutterwaveSignature) {
    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          secretHash
        )
        .update(rawBody)
        .digest("base64");

    if (
      safeCompare(
        flutterwaveSignature,
        expectedSignature
      )
    ) {
      return true;
    }
  }

  // Backward compatibility with
  // Flutterwave v3 verif-hash.

  const legacyHash =
    request.headers.get(
      "verif-hash"
    );

  if (
    legacyHash &&
    safeCompare(
      legacyHash,
      secretHash
    )
  ) {
    return true;
  }

  return false;
}

// ========================================================
// FIRESTORE DATE HELPER
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
// VERIFY TRANSACTION WITH LIVE/TEST KEY FALLBACK
// ========================================================

async function verifyFlutterwaveTransaction(
  transactionId: string,
  liveSecretKey: string,
  testSecretKey?: string
): Promise<{
  verificationData: FlutterwaveVerificationResponse;
  verificationMode: "live" | "test";
}> {
  const candidates: Array<{
    mode: "live" | "test";
    key: string;
  }> = [
    {
      mode: "live",
      key: liveSecretKey,
    },
  ];

  if (
    testSecretKey &&
    testSecretKey !== liveSecretKey
  ) {
    candidates.push({
      mode: "test",
      key: testSecretKey,
    });
  }

  let lastErrorMessage =
    "Flutterwave verification failed.";

  for (const candidate of candidates) {
    const response =
      await fetch(
        `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
          transactionId
        )}/verify`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${candidate.key}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

    let data:
      FlutterwaveVerificationResponse;

    try {
      data =
        await response.json();
    } catch {
      lastErrorMessage =
        `Invalid Flutterwave ${candidate.mode} verification response.`;

      continue;
    }

    if (
      response.ok &&
      data.status === "success" &&
      data.data
    ) {
      return {
        verificationData: data,
        verificationMode:
          candidate.mode,
      };
    }

    lastErrorMessage =
      data.message ||
      `Flutterwave ${candidate.mode} verification failed.`;
  }

  throw new Error(
    lastErrorMessage
  );
}

// ========================================================
// WEBHOOK
// ========================================================

export async function POST(
  request: NextRequest
) {
  try {
    const secretHash =
      process.env
        .FLUTTERWAVE_SECRET_HASH;

    const secretKey =
      process.env
        .FLUTTERWAVE_SECRET_KEY;

    const testSecretKey =
      process.env
        .FLUTTERWAVE_TEST_SECRET_KEY;

    if (
      !secretHash ||
      !secretKey
    ) {
      console.error(
        "FLUTTERWAVE WEBHOOK CONFIGURATION MISSING"
      );

      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 500,
        }
      );
    }

    // ====================================================
    // RAW BODY
    // ====================================================

    const rawBody =
      await request.text();

    // ====================================================
    // SIGNATURE VERIFICATION
    // ====================================================

    const signatureValid =
      verifyWebhookSignature(
        rawBody,
        request,
        secretHash
      );

    if (!signatureValid) {
      console.warn(
        "INVALID FLUTTERWAVE WEBHOOK SIGNATURE"
      );

      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 401,
        }
      );
    }

    // ====================================================
    // PARSE PAYLOAD
    // ====================================================

    let payload:
      FlutterwaveWebhookPayload;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
        },
        {
          status: 400,
        }
      );
    }

    // ====================================================
    // ONLY PROCESS CHARGE COMPLETED EVENTS
    // ====================================================

    const eventType =
      String(
        payload.event ||
          payload.type ||
          ""
      )
        .trim()
        .toLowerCase();

    if (
      eventType !==
      "charge.completed"
    ) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // TRANSACTION ID
    // ====================================================

    const transactionId =
      String(
        payload.data?.id ||
          ""
      ).trim();

    if (!transactionId) {
      console.warn(
        "FLUTTERWAVE WEBHOOK HAS NO TRANSACTION ID"
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // RE-VERIFY WITH FLUTTERWAVE
    // ====================================================

    const {
      verificationData,
      verificationMode,
    } =
      await verifyFlutterwaveTransaction(
        transactionId,
        secretKey,
        testSecretKey
      );

    const transaction =
      verificationData.data;

    if (!transaction) {
      throw new Error(
        "Missing verified transaction."
      );
    }

    // ====================================================
    // VERIFY SUCCESSFUL STATUS
    // ====================================================

    if (
      transaction.status !==
      "successful"
    ) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // VERIFY CURRENCY
    // ====================================================

    if (
      transaction.currency !==
      PRO_CURRENCY
    ) {
      console.warn(
        "WEBHOOK CURRENCY MISMATCH:",
        transaction.currency
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // VERIFY AMOUNT
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
      console.warn(
        "WEBHOOK AMOUNT MISMATCH:",
        paidAmount
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // TX REF
    // ====================================================

    const txRef =
      String(
        transaction.tx_ref ||
          ""
      ).trim();

    if (!txRef) {
      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // VERIFY PLAN
    // ====================================================

    const plan =
      typeof transaction.meta
        ?.plan === "string"
        ? transaction.meta.plan
            .trim()
            .toLowerCase()
        : "";

    if (
      plan !==
      "founding_pro"
    ) {
      console.warn(
        "WEBHOOK PLAN MISMATCH:",
        plan
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // IDENTIFY PAYMENT OWNER
    // ====================================================

    const metaUserId =
      typeof transaction.meta
        ?.userId === "string"
        ? transaction.meta.userId
            .trim()
        : "";

    const txRefUserId =
      getUserIdFromTxRef(
        txRef
      );

    if (
      metaUserId &&
      txRefUserId &&
      metaUserId !==
        txRefUserId
    ) {
      console.error(
        "WEBHOOK PAYMENT OWNER MISMATCH"
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    const userId =
      metaUserId ||
      txRefUserId;

    if (!userId) {
      console.error(
        "WEBHOOK COULD NOT IDENTIFY USER"
      );

      return NextResponse.json(
        {
          success: true,
          ignored: true,
        },
        {
          status: 200,
        }
      );
    }

    // ====================================================
    // FIRESTORE
    // ====================================================

    const db =
      getAdminDb();

    const userRef =
      db
        .collection("users")
        .doc(userId);

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
        .doc(paymentId);

    const now =
      new Date();

    // ====================================================
    // IDEMPOTENT FIRESTORE TRANSACTION
    // ====================================================

    await db.runTransaction(
      async (
        firestoreTransaction
      ) => {
        const [
          paymentSnapshot,
          userSnapshot,
        ] = await Promise.all([
          firestoreTransaction.get(
            paymentRef
          ),

          firestoreTransaction.get(
            userRef
          ),
        ]);

        // ================================================
        // ALREADY PROCESSED
        // ================================================

        if (
          paymentSnapshot.exists &&
          paymentSnapshot.data()
            ?.verified === true
        ) {
          return;
        }

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

        const hasActiveSubscription =
          userData.plan ===
            "pro" &&
          userData
            .subscriptionStatus ===
            "active" &&
          currentExpiry !== null &&
          currentExpiry.getTime() >
            now.getTime();

        // ================================================
        // RENEWAL BASE
        // ================================================

        const renewalBaseDate =
          hasActiveSubscription &&
          currentExpiry
            ? currentExpiry
            : now;

        const newExpiry =
          addSubscriptionDays(
            renewalBaseDate,
            SUBSCRIPTION_DAYS
          );

        // ================================================
        // USER
        // ================================================

        const userUpdate:
          Record<
            string,
            unknown
          > = {
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
            txRef,

          lastPaymentAt:
            FieldValue
              .serverTimestamp(),

          updatedAt:
            FieldValue
              .serverTimestamp(),
        };

        if (
          hasActiveSubscription
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

        // ================================================
        // PAYMENT
        // ================================================

        firestoreTransaction.set(
          paymentRef,
          {
            userId,

            transactionId:
              paymentId,

            txRef,

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

            verificationSource:
              "flutterwave_webhook",

            flutterwaveEnvironment:
              verificationMode,

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
              hasActiveSubscription,
          },
          {
            merge: true,
          }
        );
      }
    );

    console.log(
      "FLUTTERWAVE WEBHOOK PROCESSED:",
      {
        transactionId:
          paymentId,
        userId,
        verificationMode,
      }
    );

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "FLUTTERWAVE WEBHOOK ERROR:",
      error
    );

    // Returning 500 allows Flutterwave
    // to retry genuine temporary failures.

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}