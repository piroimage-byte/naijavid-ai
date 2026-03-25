import { NextRequest, NextResponse } from "next/server";

type FlutterwaveVerifyResponse = {
  status?: string;
  message?: string;
  data?: {
    id?: number | string;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number | string;
    currency?: string;
    status?: string;
    customer?: {
      email?: string;
      name?: string;
      phone_number?: string;
    };
  };
};

const EXPECTED_AMOUNT = 5000;
const EXPECTED_CURRENCY = "NGN";

async function verifyFlutterwaveTransaction(transactionId: string) {
  const secretKey = process.env.FLW_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing FLW_SECRET_KEY");
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data: FlutterwaveVerifyResponse = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Failed to verify Flutterwave transaction");
  }

  return data;
}

function extractUserIdFromTxRef(txRef: string) {
  // Expected format from initialize route:
  // naijavid_USERID_timestamp
  const parts = txRef.split("_");

  if (parts.length < 3) return "";
  return parts[1] || "";
}

async function upgradeUserToPro(userId: string) {
  // TODO:
  // Replace this stub with your real database update logic.
  // Example options:
  // 1. Firestore update
  // 2. Supabase update
  // 3. Prisma / SQL update
  // 4. Internal user-service call
  //
  // Example pseudo code:
  // await setUserPlan(userId, "pro");

  console.log(`User ${userId} upgraded to pro`);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transactionId = String(body.transaction_id || "").trim();

    if (!transactionId) {
      return NextResponse.json(
        { error: "transaction_id is required." },
        { status: 400 }
      );
    }

    const verification = await verifyFlutterwaveTransaction(transactionId);
    const data = verification?.data;

    if (!data) {
      return NextResponse.json(
        { error: "Invalid verification response from Flutterwave." },
        { status: 400 }
      );
    }

    const paymentStatus = String(data.status || "").toLowerCase();
    const txRef = String(data.tx_ref || "").trim();
    const amount = Number(data.amount || 0);
    const currency = String(data.currency || "").toUpperCase();

    if (!txRef) {
      return NextResponse.json(
        { error: "Missing tx_ref in verification response." },
        { status: 400 }
      );
    }

    if (paymentStatus !== "successful") {
      return NextResponse.json(
        {
          error: "Payment was not successful.",
          details: {
            status: paymentStatus,
          },
        },
        { status: 400 }
      );
    }

    if (currency !== EXPECTED_CURRENCY) {
      return NextResponse.json(
        {
          error: "Invalid payment currency.",
          details: {
            expected: EXPECTED_CURRENCY,
            received: currency,
          },
        },
        { status: 400 }
      );
    }

    if (amount < EXPECTED_AMOUNT) {
      return NextResponse.json(
        {
          error: "Invalid payment amount.",
          details: {
            expected: EXPECTED_AMOUNT,
            received: amount,
          },
        },
        { status: 400 }
      );
    }

    const userId = extractUserIdFromTxRef(txRef);

    if (!userId) {
      return NextResponse.json(
        { error: "Could not extract userId from tx_ref." },
        { status: 400 }
      );
    }

    await upgradeUserToPro(userId);

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully and plan upgraded.",
      userId,
      tx_ref: txRef,
      transaction_id: data.id || transactionId,
      flw_ref: data.flw_ref || "",
    });
  } catch (error: any) {
    console.error("Flutterwave verify error:", error);

    return NextResponse.json(
      {
        error: error?.message || "Verification failed.",
      },
      { status: 500 }
    );
  }
}