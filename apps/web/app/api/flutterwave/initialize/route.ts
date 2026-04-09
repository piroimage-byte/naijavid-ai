import { NextRequest, NextResponse } from "next/server";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";

function generateTxRef(userId: string) {
  return `naijavid_${userId}_${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const userId = String(body.userId || "").trim();
    const email = String(body.email || "").trim();
    const name = String(body.name || "User").trim();
    const phone = String(body.phone || "").trim();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required." },
        { status: 400 }
      );
    }

    const amount = 5000;
    const tx_ref = generateTxRef(userId);

    const redirect_url =
      "https://naijavid-ai.vercel.app/payment/flutterwave/callback";

    const payment = await createFlutterwavePaymentLink({
      amount,
      tx_ref,
      redirect_url,
      currency: "NGN",
      customer: {
        email,
        name,
        phonenumber: phone,
      },
      customizations: {
        title: "NaijaVid AI Subscription",
        description: "Pro plan upgrade",
      },
    });

    return NextResponse.json({
      message: "Payment initialized successfully.",
      checkoutLink: payment?.link,
      tx_ref,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Initialization failed." },
      { status: 500 }
    );
  }
}