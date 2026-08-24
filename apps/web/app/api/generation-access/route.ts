import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

const FREE_DAILY_LIMIT = 3;

function getTodayKey() {
  const now = new Date();

  return `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
}

function getExpiryDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      return (
        value as {
          toDate: () => Date;
        }
      ).toDate();
    } catch {
      return null;
    }
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "check";

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "userId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "check" &&
      action !== "increment"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      getAdminDb();

    const userRef =
      db
        .collection("users")
        .doc(userId);

    const today =
      getTodayKey();

    const now =
      new Date();

    const result =
      await db.runTransaction(
        async (transaction) => {
          const snapshot =
            await transaction.get(
              userRef
            );

          const data =
            snapshot.exists
              ? snapshot.data() || {}
              : {};

          const storedPlan =
            data.plan === "pro"
              ? "pro"
              : "free";

          const storedSubscriptionStatus =
            data.subscriptionStatus ===
            "active"
              ? "active"
              : "inactive";

          const expiryDate =
            getExpiryDate(
              data.subscriptionExpiresAt
            );

          const subscriptionExpired =
            expiryDate !== null &&
            expiryDate.getTime() <=
              now.getTime();

          const hasValidExpiry =
            expiryDate !== null &&
            expiryDate.getTime() >
              now.getTime();

          const isPro =
            storedPlan === "pro" &&
            storedSubscriptionStatus ===
              "active" &&
            hasValidExpiry;

          // ==========================================
          // ACTIVE FOUNDING PRO
          // ==========================================

          if (isPro) {
            return {
              allowed: true,

              plan: "pro",

              subscriptionStatus:
                "active",

              unlimited: true,

              usedToday: 0,

              remaining: null,

              limit: null,

              subscriptionExpired:
                false,

              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
            };
          }

          // ==========================================
          // AUTO-DOWNGRADE EXPIRED PRO
          // ==========================================

          if (
            storedPlan === "pro" &&
            storedSubscriptionStatus ===
              "active" &&
            subscriptionExpired
          ) {
            transaction.set(
              userRef,
              {
                plan: "free",

                subscriptionStatus:
                  "inactive",

                generationLimit:
                  FREE_DAILY_LIMIT,

                subscriptionExpiredAt:
                  FieldValue.serverTimestamp(),

                updatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          }

          // ==========================================
          // FREE DAILY USAGE
          // ==========================================

          let usedToday =
            Number(
              data.dailyGenerationCount ||
                0
            );

          const storedDate =
            String(
              data.dailyGenerationDate ||
                ""
            );

          if (
            storedDate !== today
          ) {
            usedToday = 0;
          }

          // ==========================================
          // CHECK ONLY
          // ==========================================

          if (
            action === "check"
          ) {
            const remaining =
              Math.max(
                FREE_DAILY_LIMIT -
                  usedToday,
                0
              );

            return {
              allowed:
                usedToday <
                FREE_DAILY_LIMIT,

              plan: "free",

              subscriptionStatus:
                "inactive",

              unlimited: false,

              usedToday,

              remaining,

              limit:
                FREE_DAILY_LIMIT,

              subscriptionExpired,

              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
            };
          }

          // ==========================================
          // FREE LIMIT REACHED
          // ==========================================

          if (
            usedToday >=
            FREE_DAILY_LIMIT
          ) {
            return {
              allowed: false,

              plan: "free",

              subscriptionStatus:
                "inactive",

              unlimited: false,

              usedToday,

              remaining: 0,

              limit:
                FREE_DAILY_LIMIT,

              subscriptionExpired,

              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
            };
          }

          // ==========================================
          // INCREMENT FREE USAGE
          // ==========================================

          const newCount =
            usedToday + 1;

          transaction.set(
            userRef,
            {
              dailyGenerationDate:
                today,

              dailyGenerationCount:
                newCount,

              generationLimit:
                FREE_DAILY_LIMIT,

              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          return {
            allowed: true,

            plan: "free",

            subscriptionStatus:
              "inactive",

            unlimited: false,

            usedToday:
              newCount,

            remaining:
              Math.max(
                FREE_DAILY_LIMIT -
                  newCount,
                0
              ),

            limit:
              FREE_DAILY_LIMIT,

            subscriptionExpired,

            subscriptionExpiresAt:
              expiryDate
                ? expiryDate.toISOString()
                : null,
          };
        }
      );

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "GENERATION ACCESS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to check generation access.",
      },
      {
        status: 500,
      }
    );
  }
}