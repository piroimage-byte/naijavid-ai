import { NextRequest, NextResponse } from "next/server";
import { setUserPlan } from "@/lib/user-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = String(searchParams.get("reference") || "").trim();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Reference is required." },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: "Missing PAYSTACK_SECRET_KEY." },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const result = await paystackResponse.json();

    if (!paystackResponse.ok || !result.status) {
      return NextResponse.json(
        {
          success: false,
          error: result.message || "Failed to verify transaction.",
          details: result,
        },
        { status: 500 }
      );
    }

    const data = result.data;
    const paymentStatus = data?.status;
    const uid = String(data?.metadata?.uid || "").trim();
    const paidAmount = Number(data?.amount || 0);

    if (paymentStatus !== "success") {
      return NextResponse.json({
        success: false,
        error: `Payment not successful. Status: ${paymentStatus || "unknown"}`,
      });
    }

    if (!uid) {
      return NextResponse.json({
        success: false,
        error: "Missing user id in Paystack metadata.",
      });
    }

    if (paidAmount < 500000) {
      return NextResponse.json({
        success: false,
        error: "Paid amount is less than required plan amount.",
      });
    }

    await setUserPlan(uid, "pro");

    return NextResponse.json({
      success: true,
      message: "Payment verified and plan upgraded to Pro.",
      reference,
      uid,
      status: paymentStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to verify Paystack payment." },
      { status: 500 }
    );
  }
}