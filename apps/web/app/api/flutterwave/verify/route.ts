import { NextRequest, NextResponse } from "next/server";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";

function extractUserIdFromTxRef(txRef: string) {
  const prefix = "naijavid_";

  if (!txRef.startsWith(prefix)) {
    return null;
  }

  const withoutPrefix = txRef.slice(prefix.length);
  const lastUnderscoreIndex = withoutPrefix.lastIndexOf("_");

  if (lastUnderscoreIndex === -1) {
    return null;
  }

  return withoutPrefix.slice(0, lastUnderscoreIndex);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transaction_id = String(body.transaction_id || "").trim();
    const tx_ref = String(body.tx_ref || "").trim();

    if (!transaction_id || !tx_ref) {
      return NextResponse.json(
        { error: "Missing transaction data." },
        { status: 400 }
      );
    }

    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { error: "Missing FLUTTERWAVE_SECRET_KEY." },
        { status: 500 }
      );
    }

    const flutterwaveResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(
        transaction_id
      )}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const flutterwaveData = await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok || flutterwaveData?.status !== "success") {
      return NextResponse.json(
        { error: "Verification failed." },
        { status: 400 }
      );
    }

    const payment = flutterwaveData?.data;

    if (!payment) {
      return NextResponse.json(
        { error: "Missing payment data." },
        { status: 400 }
      );
    }

    if (payment.status !== "successful") {
      return NextResponse.json(
        { error: "Payment was not successful." },
        { status: 400 }
      );
    }

    if (Number(payment.amount) !== PRO_AMOUNT || payment.currency !== PRO_CURRENCY) {
      return NextResponse.json(
        { error: "Invalid payment details." },
        { status: 400 }
      );
    }

    if (String(payment.tx_ref || "").trim() !== tx_ref) {
      return NextResponse.json(
        { error: "Transaction reference mismatch." },
        { status: 400 }
      );
    }

    const userId = extractUserIdFromTxRef(tx_ref);

    if (!userId) {
      return NextResponse.json(
        { error: "Could not resolve user from tx_ref." },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", userId);
    const paymentRef = doc(db, "payments", String(payment.id));

    await updateDoc(userRef, {
      plan: "pro",
      subscriptionStatus: "active",
      upgradedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(
      paymentRef,
      {
        paymentId: String(payment.id),
        userId,
        txRef: tx_ref,
        transactionId: String(transaction_id),
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        customerEmail: payment.customer?.email || "",
        provider: "flutterwave",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified and user upgraded to Pro.",
      userId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification failed." },
      { status: 500 }
    );
  }
}