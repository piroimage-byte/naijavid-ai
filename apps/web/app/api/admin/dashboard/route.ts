import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

function getAdminEmail() {
  const email =
    process.env.NAIJAVID_ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  if (!email) {
    throw new Error(
      "NAIJAVID_ADMIN_EMAIL is not configured."
    );
  }

  return email;
}

function timestampToISOString(
  value: any
): string | null {
  try {
    if (
      value &&
      typeof value.toDate === "function"
    ) {
      return value
        .toDate()
        .toISOString();
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    // ---------------------------------------------
    // VERIFY AUTHENTICATION
    // ---------------------------------------------

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
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
            "Authentication token missing.",
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
    } catch (error) {
      console.error(
        "ADMIN TOKEN ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired login.",
        },
        {
          status: 401,
        }
      );
    }

    // ---------------------------------------------
    // VERIFY ADMIN
    // ---------------------------------------------

    const authenticatedEmail =
      decodedToken.email
        ?.trim()
        .toLowerCase();

    const adminEmail =
      getAdminEmail();

    if (
      !authenticatedEmail ||
      authenticatedEmail !==
        adminEmail
    ) {
      console.warn(
        "ADMIN ACCESS DENIED:",
        {
          uid:
            decodedToken.uid,
          email:
            authenticatedEmail ||
            null,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator access required.",
        },
        {
          status: 403,
        }
      );
    }

    const db =
      getAdminDb();

    // ---------------------------------------------
    // LOAD USERS
    // ---------------------------------------------

    const usersSnapshot =
      await db
        .collection("users")
        .get();

    let freeUsers = 0;
    let proUsers = 0;

    const now =
      Date.now();

    usersSnapshot.docs.forEach(
      (document) => {
        const data =
          document.data();

        const plan =
          String(
            data.plan || "free"
          ).toLowerCase();

        let activePro = false;

        if (
          plan === "pro" &&
          data.subscriptionStatus ===
            "active"
        ) {
          const expiry =
            data.subscriptionExpiresAt;

          if (
            expiry &&
            typeof expiry.toDate ===
              "function"
          ) {
            activePro =
              expiry
                .toDate()
                .getTime() >
              now;
          }
        }

        if (activePro) {
          proUsers += 1;
        } else {
          freeUsers += 1;
        }
      }
    );

    // ---------------------------------------------
    // LOAD VIDEO HISTORY
    // ---------------------------------------------

    const videosSnapshot =
      await db
        .collection(
          "videoHistory"
        )
        .get();

    const recentVideos =
      videosSnapshot.docs
        .map((document) => {
          const data =
            document.data();

          return {
            id:
              document.id,

            userId:
              String(
                data.userId || ""
              ),

            prompt:
              String(
                data.prompt || ""
              ),

            mode:
              String(
                data.mode || ""
              ),

            language:
              String(
                data.language ||
                  "English"
              ),

            duration:
              Number(
                data.duration || 0
              ),

            status:
              String(
                data.status ||
                  "unknown"
              ),

            plan:
              String(
                data.planAtGeneration ||
                  "unknown"
              ),

            createdAt:
              timestampToISOString(
                data.createdAt
              ),

            expiresAt:
              timestampToISOString(
                data.expiresAt
              ),
          };
        })
        .sort((a, b) => {
          const aTime =
            a.createdAt
              ? new Date(
                  a.createdAt
                ).getTime()
              : 0;

          const bTime =
            b.createdAt
              ? new Date(
                  b.createdAt
                ).getTime()
              : 0;

          return bTime - aTime;
        })
        .slice(0, 10);

    // ---------------------------------------------
    // LOAD PAYMENTS
    // ---------------------------------------------

    const paymentsSnapshot =
      await db
        .collection("payments")
        .get();

    const recentPayments =
      paymentsSnapshot.docs
        .map((document) => {
          const data =
            document.data();

          return {
            id:
              document.id,

            userId:
              String(
                data.userId || ""
              ),

            amount:
              Number(
                data.amount || 0
              ),

            currency:
              String(
                data.currency ||
                  "NGN"
              ),

            status:
              String(
                data.status ||
                  "unknown"
              ),

            transactionId:
              String(
                data.transactionId ||
                  ""
              ),

            createdAt:
              timestampToISOString(
                data.createdAt
              ),
          };
        })
        .sort((a, b) => {
          const aTime =
            a.createdAt
              ? new Date(
                  a.createdAt
                ).getTime()
              : 0;

          const bTime =
            b.createdAt
              ? new Date(
                  b.createdAt
                ).getTime()
              : 0;

          return bTime - aTime;
        })
        .slice(0, 10);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return NextResponse.json(
      {
        success: true,

        admin: {
          email:
            authenticatedEmail,
        },

        stats: {
          totalUsers:
            usersSnapshot.size,

          freeUsers,

          proUsers,

          totalVideos:
            videosSnapshot.size,

          totalPayments:
            paymentsSnapshot.size,
        },

        recentVideos,

        recentPayments,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to load admin dashboard.",
      },
      {
        status: 500,
      }
    );
  }
}