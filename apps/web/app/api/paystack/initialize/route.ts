import { NextRequest, NextResponse } from "next/server";
import { PRO_PLAN_AMOUNT_KOBO, generateReference } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const uid = String(body.uid || "").trim();

    if (!email || !uid) {
      return NextResponse.json(
        { success: false, error: "Email and uid are required." },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "Missing PAYSTACK_SECRET_KEY." },
        { status: 500 }
      );
    }

    if (!appUrl) {
      return NextResponse.json(
        { success: false, error: "Missing NEXT_PUBLIC_APP_URL." },
        { status: 500 }
      );
    }

    const reference = generateReference(uid);

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: PRO_PLAN_AMOUNT_KOBO,
          reference,
          callback_url: `${appUrl}/pricing/callback`,
          metadata: {
            uid,
            plan: "pro",
            source: "naijavid-ai",
          },
        }),
        cache: "no-store",
      }
    );

    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status) {
      return NextResponse.json(
        {
          success: false,
          error: result.message || "Failed to initialize payment.",
          details: result,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: result.data.authorization_url,
      access_code: result.data.access_code,
      reference: result.data.reference,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to initialize Paystack payment." },
      { status: 500 }
    );
  }
}