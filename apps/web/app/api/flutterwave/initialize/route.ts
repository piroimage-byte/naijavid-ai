import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminAuth,
} from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRO_AMOUNT = 5000;
const PRO_CURRENCY = "NGN";

type FlutterwaveInitializeResponse = {
  status?: string;
  message?: string;
  data?: {
    link?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const secretKey =
      process.env.FLUTTERWAVE_SECRET_KEY?.trim();

    if (!secretKey) {
      console.error(
        "FLUTTERWAVE_SECRET_KEY is missing."
      );

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

    const authorization =
      req.headers.get("authorization");

    if (
      !authorization?.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const idToken =
      authorization.slice(7).trim();

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
        await getAdminAuth().verifyIdToken(
          idToken
        );
    } catch (error) {
      console.error(
        "FLUTTERWAVE AUTH ERROR:",
        error
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

    const userId = decodedToken.uid;

    const email =
      typeof decodedToken.email === "string"
        ? decodedToken.email.trim()
        : "";

    const name =
      typeof decodedToken.name === "string" &&
      decodedToken.name.trim()
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

    const configuredAppUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (
      process.env.NODE_ENV === "production" &&
      !configuredAppUrl
    ) {
      console.error(
        "NEXT_PUBLIC_APP_URL is missing in production."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Application payment URL is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const appUrl =
      configuredAppUrl ||
      "http://localhost:3000";

    let redirectUrl: string;

    try {
      redirectUrl = new URL(
        "/payment/flutterwave/callback",
        appUrl
      ).toString();
    } catch {
      console.error(
        "Invalid NEXT_PUBLIC_APP_URL:",
        appUrl
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Application payment URL is invalid.",
        },
        {
          status: 500,
        }
      );
    }

    const txRef =
      `naijavid_${userId}_${Date.now()}`;

    const payload = {
      tx_ref: txRef,
      amount: PRO_AMOUNT,
      currency: PRO_CURRENCY,
      redirect_url: redirectUrl,

      customer: {
        email,
        name,
      },

      customizations: {
        title:
          "NaijaVid AI Founding Pro",
        description:
          "Founding Pro subscription",
      },

      meta: {
        userId,
        plan: "founding_pro",
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
          Accept: "application/json",
        },

        body: JSON.stringify(payload),
        cache: "no-store",
      }
    );

    let data: FlutterwaveInitializeResponse;

    try {
      data = await response.json();
    } catch {
      console.error(
        "Flutterwave returned invalid JSON."
      );

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
        httpStatus: response.status,
        flutterwaveStatus: data.status,
        message: data.message,
        userId,
        txRef,
      }
    );

    if (
      !response.ok ||
      data.status !== "success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            data.message ||
            "Flutterwave payment initialization failed.",
        },
        {
          status:
            response.status >= 400 &&
            response.status <= 599
              ? response.status
              : 502,
        }
      );
    }

    const checkoutLink =
      data.data?.link;

    if (
      typeof checkoutLink !== "string" ||
      !checkoutLink.trim()
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

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment initialized successfully.",
        checkoutLink,
        tx_ref: txRef,
        redirectUrl,
      },
      {
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error(
      "FLUTTERWAVE INITIALIZE ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Initialization failed.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}