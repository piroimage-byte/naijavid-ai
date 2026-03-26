import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transaction_id, tx_ref } = body;

    if (!transaction_id || !tx_ref) {
      return NextResponse.json(
        { error: "Missing transaction data" },
        { status: 400 }
      );
    }

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Missing FLUTTERWAVE_SECRET_KEY" },
        { status: 500 }
      );
    }

    // Verify with Flutterwave
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data = await response.json();

    if (data.status !== "success") {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const payment = data.data;

    // Validate amount + currency
    if (payment.amount !== 5000 || payment.currency !== "NGN") {
      return NextResponse.json(
        { error: "Invalid payment details" },
        { status: 400 }
      );
    }

    // Extract userId from tx_ref
    const parts = tx_ref.split("_");
    const userId = parts[1];

    // TODO: upgrade user to PRO in your DB
    // Example (replace with your logic):
    // await setUserPlan(userId, "pro");

    return NextResponse.json({
      success: true,
      message: "Payment verified",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}