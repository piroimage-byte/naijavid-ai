import { NextResponse } from "next/server";
import { setUserPlan } from "@/lib/user-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const reference = String(searchParams.get("reference") || "").trim();
    const userId = String(searchParams.get("userId") || "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required." },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    await setUserPlan(userId, "PRO");

    return NextResponse.json({
      verified: true,
      plan: "PRO",
      message: "Mock payment verified and account upgraded to Pro.",
      reference,
      userId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Verification failed." },
      { status: 500 }
    );
  }
}