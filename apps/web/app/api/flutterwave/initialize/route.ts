import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const secretKey =
      process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing FLUTTERWAVE_SECRET_KEY",
        },
        {
          status: 500,
        }
      );
    }

    const body = await req.json();

    const {
      userId,
      email,
      name,
    } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "userId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "email is required.",
        },
        {
          status: 400,
        }
      );
    }

    const txRef =
      `naijavid_${userId}_${Date.now()}`;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const redirectUrl =
      `${appUrl}/payment/flutterwave/callback`;

    const payload = {
      tx_ref: txRef,
      amount: 5000,
      currency: "NGN",

      redirect_url:
        redirectUrl,

      customer: {
        email,
        name:
          name ||
          "NaijaVid AI User",
      },

      customizations: {
        title:
          "NaijaVid AI Founding Pro",

        description:
          "Founding Pro subscription",

        logo:
          "",
      },

      meta: {
        userId,
        plan:
          "founding_pro",
      },
    };

    const response = await fetch(
      "https://api.flutterwave.com/v3/payments",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${secretKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(payload),
      }
    );

    const data =
      await response.json();

    console.log(
      "FLUTTERWAVE INITIALIZE RESPONSE:",
      data
    );

    if (
      !response.ok ||
      data?.status !== "success"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            data?.message ||
            "Flutterwave payment initialization failed.",

          flutterwave: data,
        },
        {
          status:
            response.status || 500,
        }
      );
    }

    const checkoutLink =
      data?.data?.link;

    if (!checkoutLink) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Flutterwave did not return a checkout link.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        message:
          "Payment initialized successfully.",

        checkoutLink,

        tx_ref:
          txRef,

        redirectUrl,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "FLUTTERWAVE INITIALIZE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Initialization failed.",
      },
      {
        status: 500,
      }
    );
  }
}