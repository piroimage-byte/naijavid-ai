import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

const FREE_DAILY_LIMIT = 3;

const SUCCESS_PAYMENT_STATUSES =
  new Set([
    "successful",
    "success",
    "completed",
    "paid",
  ]);

const FAILED_PAYMENT_STATUSES =
  new Set([
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "declined",
    "error",
  ]);

const SUCCESS_VIDEO_STATUSES =
  new Set([
    "completed",
    "success",
    "successful",
  ]);

const FAILED_VIDEO_STATUSES =
  new Set([
    "failed",
    "failure",
    "error",
  ]);

// =========================================================
// ADMIN CONFIG
// =========================================================

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

// =========================================================
// DATE HELPERS
// =========================================================

function timestampToDate(
  value: any
): Date | null {
  try {
    if (!value) {
      return null;
    }

    if (
      typeof value.toDate ===
      "function"
    ) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (
      typeof value === "number"
    ) {
      const milliseconds =
        value > 10_000_000_000
          ? value
          : value * 1000;

      const date =
        new Date(milliseconds);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    }

    if (
      typeof value === "string"
    ) {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return null;
      }

      return date;
    }

    return null;
  } catch {
    return null;
  }
}

function timestampToISOString(
  value: any
): string | null {
  const date =
    timestampToDate(value);

  if (!date) {
    return null;
  }

  return date.toISOString();
}

/**
 * Nigeria is UTC+1 year-round.
 *
 * This returns a YYYY-MM-DD day key
 * based on Nigeria local time.
 */
function nigeriaDayKey(
  value: Date
): string {
  const nigeriaMilliseconds =
    value.getTime() +
    60 * 60 * 1000;

  return new Date(
    nigeriaMilliseconds
  )
    .toISOString()
    .slice(0, 10);
}

function getTodayNigeriaKey() {
  return nigeriaDayKey(
    new Date()
  );
}

function getLastSevenNigeriaDays() {
  const days: {
    key: string;
    label: string;
  }[] = [];

  const now =
    new Date();

  for (
    let offset = 6;
    offset >= 0;
    offset -= 1
  ) {
    const date =
      new Date(
        now.getTime() -
          offset *
            24 *
            60 *
            60 *
            1000
      );

    const key =
      nigeriaDayKey(date);

    const label =
      new Intl.DateTimeFormat(
        "en-NG",
        {
          weekday: "short",
          timeZone:
            "Africa/Lagos",
        }
      ).format(date);

    days.push({
      key,
      label,
    });
  }

  return days;
}

function normalizeStatus(
  value: any
) {
  return String(
    value || "unknown"
  )
    .trim()
    .toLowerCase();
}

// =========================================================
// ROUTE
// =========================================================

export async function GET(
  request: NextRequest
) {
  try {
    // -----------------------------------------------------
    // VERIFY AUTHENTICATION
    // -----------------------------------------------------

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
          .verifyIdToken(
            idToken
          );
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

    // -----------------------------------------------------
    // VERIFY ADMIN EMAIL
    // -----------------------------------------------------

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

    const now =
      Date.now();

    const todayKey =
      getTodayNigeriaKey();

    const lastSevenDays =
      getLastSevenNigeriaDays();

    const sevenDayKeys =
      new Set(
        lastSevenDays.map(
          (day) => day.key
        )
      );

    // -----------------------------------------------------
    // LOAD FIRESTORE DATA
    // -----------------------------------------------------

    const [
      usersSnapshot,
      videosSnapshot,
      paymentsSnapshot,
    ] =
      await Promise.all([
        db
          .collection("users")
          .get(),

        db
          .collection(
            "videoHistory"
          )
          .get(),

        db
          .collection(
            "payments"
          )
          .get(),
      ]);

    // =====================================================
    // USERS
    // =====================================================

    let freeUsers = 0;
    let proUsers = 0;
    let newUsersToday = 0;

    let freeUsersAtDailyLimit =
      0;

    usersSnapshot.docs.forEach(
      (document) => {
        const data =
          document.data();

        const plan =
          String(
            data.plan || "free"
          )
            .trim()
            .toLowerCase();

        let activePro = false;

        if (
          plan === "pro" &&
          String(
            data.subscriptionStatus ||
              ""
          )
            .trim()
            .toLowerCase() ===
            "active"
        ) {
          const expiryDate =
            timestampToDate(
              data.subscriptionExpiresAt
            );

          if (expiryDate) {
            activePro =
              expiryDate.getTime() >
              now;
          }
        }

        if (activePro) {
          proUsers += 1;
        } else {
          freeUsers += 1;
        }

        const createdDate =
          timestampToDate(
            data.createdAt
          );

        if (
          createdDate &&
          nigeriaDayKey(
            createdDate
          ) === todayKey
        ) {
          newUsersToday += 1;
        }

        if (!activePro) {
          const dailyDate =
            String(
              data.dailyGenerationDate ||
                ""
            ).trim();

          const dailyCount =
            Number(
              data.dailyGenerationCount ||
                0
            );

          if (
            dailyDate ===
              todayKey &&
            dailyCount >=
              FREE_DAILY_LIMIT
          ) {
            freeUsersAtDailyLimit +=
              1;
          }
        }
      }
    );

    // =====================================================
    // VIDEOS
    // =====================================================

    let videosToday = 0;

    let completedVideos = 0;
    let failedVideos = 0;

    let completedVideosToday = 0;
    let failedVideosToday = 0;

    let freeGenerations = 0;
    let proGenerations = 0;

    let freeGenerationsToday = 0;
    let proGenerationsToday = 0;

    const sevenDayVideoMap =
      new Map<
        string,
        {
          total: number;
          free: number;
          pro: number;
          completed: number;
          failed: number;
        }
      >();

    lastSevenDays.forEach(
      (day) => {
        sevenDayVideoMap.set(
          day.key,
          {
            total: 0,
            free: 0,
            pro: 0,
            completed: 0,
            failed: 0,
          }
        );
      }
    );

    const allVideos =
      videosSnapshot.docs.map(
        (document) => {
          const data =
            document.data();

          const status =
            normalizeStatus(
              data.status
            );

          const plan =
            String(
              data.planAtGeneration ||
                "unknown"
            )
              .trim()
              .toLowerCase();

          const createdDate =
            timestampToDate(
              data.createdAt
            );

          const createdDayKey =
            createdDate
              ? nigeriaDayKey(
                  createdDate
                )
              : null;

          const isToday =
            createdDayKey ===
            todayKey;

          const isCompleted =
            SUCCESS_VIDEO_STATUSES.has(
              status
            );

          const isFailed =
            FAILED_VIDEO_STATUSES.has(
              status
            );

          if (isToday) {
            videosToday += 1;
          }

          if (isCompleted) {
            completedVideos += 1;

            if (isToday) {
              completedVideosToday +=
                1;
            }
          }

          if (isFailed) {
            failedVideos += 1;

            if (isToday) {
              failedVideosToday +=
                1;
            }
          }

          if (plan === "pro") {
            proGenerations += 1;

            if (isToday) {
              proGenerationsToday +=
                1;
            }
          }

          if (plan === "free") {
            freeGenerations += 1;

            if (isToday) {
              freeGenerationsToday +=
                1;
            }
          }

          if (
            createdDayKey &&
            sevenDayKeys.has(
              createdDayKey
            )
          ) {
            const bucket =
              sevenDayVideoMap.get(
                createdDayKey
              );

            if (bucket) {
              bucket.total += 1;

              if (
                plan === "free"
              ) {
                bucket.free += 1;
              }

              if (
                plan === "pro"
              ) {
                bucket.pro += 1;
              }

              if (isCompleted) {
                bucket.completed +=
                  1;
              }

              if (isFailed) {
                bucket.failed += 1;
              }
            }
          }

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
        }
      );

    const recentVideos =
      allVideos
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

    // =====================================================
    // PAYMENTS
    // =====================================================

    let successfulPayments = 0;
    let failedPayments = 0;

    let paymentsToday = 0;

    let successfulPaymentsToday =
      0;

    let failedPaymentsToday = 0;

    let estimatedRevenue = 0;

    let estimatedRevenueToday = 0;

    const allPayments =
      paymentsSnapshot.docs.map(
        (document) => {
          const data =
            document.data();

          const status =
            normalizeStatus(
              data.status
            );

          const amount =
            Number(
              data.amount || 0
            );

          const currency =
            String(
              data.currency ||
                "NGN"
            )
              .trim()
              .toUpperCase();

          const createdDate =
            timestampToDate(
              data.createdAt
            );

          const createdDayKey =
            createdDate
              ? nigeriaDayKey(
                  createdDate
                )
              : null;

          const isToday =
            createdDayKey ===
            todayKey;

          const isSuccessful =
            SUCCESS_PAYMENT_STATUSES.has(
              status
            );

          const isFailed =
            FAILED_PAYMENT_STATUSES.has(
              status
            );

          if (isToday) {
            paymentsToday += 1;
          }

          if (isSuccessful) {
            successfulPayments +=
              1;

            if (
              currency === "NGN"
            ) {
              estimatedRevenue +=
                amount;
            }

            if (isToday) {
              successfulPaymentsToday +=
                1;

              if (
                currency === "NGN"
              ) {
                estimatedRevenueToday +=
                  amount;
              }
            }
          }

          if (isFailed) {
            failedPayments += 1;

            if (isToday) {
              failedPaymentsToday +=
                1;
            }
          }

          return {
            id:
              document.id,

            userId:
              String(
                data.userId || ""
              ),

            amount,

            currency,

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
        }
      );

    const recentPayments =
      allPayments
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

    // =====================================================
    // BUSINESS ANALYTICS
    // =====================================================

    const totalUsers =
      usersSnapshot.size;

    const proConversionRate =
      totalUsers > 0
        ? Number(
            (
              (proUsers /
                totalUsers) *
              100
            ).toFixed(1)
          )
        : 0;

    const generationSuccessRate =
      completedVideos +
        failedVideos >
      0
        ? Number(
            (
              (completedVideos /
                (completedVideos +
                  failedVideos)) *
              100
            ).toFixed(1)
          )
        : 0;

    const paymentSuccessRate =
      successfulPayments +
        failedPayments >
      0
        ? Number(
            (
              (successfulPayments /
                (successfulPayments +
                  failedPayments)) *
              100
            ).toFixed(1)
          )
        : 0;

    const sevenDayActivity =
      lastSevenDays.map(
        (day) => {
          const bucket =
            sevenDayVideoMap.get(
              day.key
            ) || {
              total: 0,
              free: 0,
              pro: 0,
              completed: 0,
              failed: 0,
            };

          return {
            date:
              day.key,

            label:
              day.label,

            videos:
              bucket.total,

            free:
              bucket.free,

            pro:
              bucket.pro,

            completed:
              bucket.completed,

            failed:
              bucket.failed,
          };
        }
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        admin: {
          email:
            authenticatedEmail,
        },

        stats: {
          // Existing dashboard values
          totalUsers,

          freeUsers,

          proUsers,

          totalVideos:
            videosSnapshot.size,

          totalPayments:
            paymentsSnapshot.size,

          // User analytics
          newUsersToday,

          freeUsersAtDailyLimit,

          proConversionRate,

          // Generation analytics
          videosToday,

          completedVideos,

          failedVideos,

          completedVideosToday,

          failedVideosToday,

          freeGenerations,

          proGenerations,

          freeGenerationsToday,

          proGenerationsToday,

          generationSuccessRate,

          // Payment analytics
          paymentsToday,

          successfulPayments,

          failedPayments,

          successfulPaymentsToday,

          failedPaymentsToday,

          paymentSuccessRate,

          // Revenue
          estimatedRevenue,

          estimatedRevenueToday,

          revenueCurrency:
            "NGN",
        },

        sevenDayActivity,

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