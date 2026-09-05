import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminAuth,
} from "@/lib/firebase-admin";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";

export async function POST(
  req: NextRequest
) {
  try {
    // =====================================================
    // FLUTTERWAVE SECRET KEY
    // =====================================================

    const secretKey =
      process.env.FLUTTERWAVE_SECRET_KEY;

    if (!secretKey) {
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

    // =====================================================
    // VERIFY FIREBASE AUTHENTICATION
    // =====================================================

    const authorization =
      req.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
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
          .verifyIdToken(idToken);
    } catch (authError) {
      console.error(
        "FLUTTERWAVE INITIALIZE AUTH ERROR:",
        authError
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

    // =====================================================
    // AUTHENTICATED USER
    // =====================================================

    const userId =
      decodedToken.uid;

    const email =
      typeof decodedToken.email === "string"
        ? decodedToken.email.trim()
        : "";

    const name =
      typeof decodedToken.name === "string"
        ? decodedToken.name.trim()
        : "NaijaVid AI User";

    if (!userId) {
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

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your authenticated account does not have an email address.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // TRANSACTION REFERENCE
    // =====================================================

    const txRef =
      `naijavid_${userId}_${Date.now()}`;

    // =====================================================
    // CALLBACK URL
    // =====================================================

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const redirectUrl =
      `${appUrl}/payment/flutterwave/callback`;

    // =====================================================
    // SERVER-CONTROLLED PAYMENT PAYLOAD
    // =====================================================

    const payload = {
      tx_ref:
        txRef,

      amount:
        PRO_AMOUNT,

      currency:
        PRO_CURRENCY,

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

    // =====================================================
    // INITIALIZE WITH FLUTTERWAVE
    // =====================================================

    const response =
      await fetch(
        "https://api.flutterwave.com/v3/payments",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${secretKey}`,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify(payload),

          cache:
            "no-store",
        }
      );

    let data: any;

    try {
      data =
        await response.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Flutterwave returned an invalid response.",
        },
        {
          status: 502,
        }
      );
    }

    console.log(
      "FLUTTERWAVE INITIALIZE RESPONSE:",
      {
        status:
          data?.status,

        message:
          data?.message,

        userId,

        txRef,
      }
    );

    // =====================================================
    // FLUTTERWAVE ERROR
    // =====================================================

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
        },
        {
          status:
            response.status || 500,
        }
      );
    }

    const checkoutLink =
      data?.data?.link;

    if (
      !checkoutLink ||
      typeof checkoutLink !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Flutterwave did not return a checkout link.",
        },
        {
          status: 502,
        }
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

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