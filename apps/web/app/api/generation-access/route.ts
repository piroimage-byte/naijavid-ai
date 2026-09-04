import { NextRequest, NextResponse } from "next/server";
import {
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";

import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const FREE_DAILY_LIMIT = 3;

const FREE_VIDEO_STYLES = new Set([
  "cinematic",
  "church",
  "social",
]);

const FREE_CAMERA_MOTIONS = new Set([
  "cinematic",
  "static",
]);

function getTodayKey() {
  const now = new Date();

  return `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
}

function getExpiryDate(value: unknown): Date | null {
  if (!value) return null;

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

function getProRestriction(
  rawFeatures: unknown
): string | null {
  if (
    !rawFeatures ||
    typeof rawFeatures !== "object"
  ) {
    return null;
  }

  const features =
    rawFeatures as Record<string, unknown>;

  const mode =
    String(features.mode || "text");

  const duration =
    Number(features.duration || 0);

  const templateId =
    features.templateId
      ? String(features.templateId)
      : "";

  const videoStyle =
    String(features.videoStyle || "cinematic");

  const aspectRatio =
    String(features.aspectRatio || "16:9");

  const cameraMotion =
    String(features.cameraMotion || "cinematic");

  const captionStyle =
    String(features.captionStyle || "clean");

  const captionPosition =
    String(features.captionPosition || "bottom");

  const showWatermark =
    features.showWatermark !== false;

  const watermark =
    String(features.watermark || "naijavid.ai");

  const watermarkPosition =
    String(
      features.watermarkPosition ||
        "bottom_right"
    );

  const watermarkOpacity =
    Number(
      features.watermarkOpacity ?? 70
    );

  const backgroundMusic =
    String(
      features.backgroundMusic || "none"
    );

  if (mode === "multi") {
    return "Multiple-image videos require Founding Pro.";
  }

  if (duration > 8) {
    return "Videos longer than 8 seconds require Founding Pro.";
  }

  if (templateId) {
    return "Video templates require Founding Pro.";
  }

  if (!FREE_VIDEO_STYLES.has(videoStyle)) {
    return "This video style requires Founding Pro.";
  }

  if (aspectRatio === "1:1") {
    return "1:1 square video requires Founding Pro.";
  }

  if (!FREE_CAMERA_MOTIONS.has(cameraMotion)) {
    return "This camera motion requires Founding Pro.";
  }

  if (captionStyle !== "clean") {
    return "Advanced caption styles require Founding Pro.";
  }

  if (captionPosition !== "bottom") {
    return "Advanced caption positioning requires Founding Pro.";
  }

  if (backgroundMusic !== "none") {
    return "Background music requires Founding Pro.";
  }

  if (
    !showWatermark ||
    watermark !== "naijavid.ai" ||
    watermarkPosition !== "bottom_right" ||
    watermarkOpacity !== 70
  ) {
    return "Custom watermark controls require Founding Pro.";
  }

  return null;
}

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
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
      authorization.slice("Bearer ".length).trim();

    if (!idToken) {
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

    let userId = "";

    try {
      const decodedToken =
        await getAdminAuth().verifyIdToken(idToken);

      userId = decodedToken.uid;
    } catch (authError) {
      console.error(
        "GENERATION ACCESS AUTH ERROR:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired authentication token.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "check";

    if (
      action !== "check" &&
      action !== "increment"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    const db = getAdminDb();

    const userRef =
      db.collection("users").doc(userId);

    const today =
      getTodayKey();

    const now =
      new Date();

    const result =
      await db.runTransaction(
        async (transaction) => {
          const snapshot =
            await transaction.get(userRef);

          const data =
            snapshot.exists
              ? snapshot.data() || {}
              : {};

          const storedPlan =
            data.plan === "pro"
              ? "pro"
              : "free";

          const storedSubscriptionStatus =
            data.subscriptionStatus === "active"
              ? "active"
              : "inactive";

          const expiryDate =
            getExpiryDate(
              data.subscriptionExpiresAt
            );

          const subscriptionExpired =
            expiryDate !== null &&
            expiryDate.getTime() <= now.getTime();

          const hasValidExpiry =
            expiryDate !== null &&
            expiryDate.getTime() > now.getTime();

          const isPro =
            storedPlan === "pro" &&
            storedSubscriptionStatus === "active" &&
            hasValidExpiry;

          if (isPro) {
            return {
              allowed: true,
              plan: "pro",
              subscriptionStatus: "active",
              unlimited: true,
              usedToday: 0,
              remaining: null,
              limit: null,
              subscriptionExpired: false,
              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
              requiresPro: false,
              restrictionReason: null,
            };
          }

          if (
            storedPlan === "pro" &&
            storedSubscriptionStatus === "active" &&
            subscriptionExpired
          ) {
            transaction.set(
              userRef,
              {
                plan: "free",
                subscriptionStatus: "inactive",
                generationLimit: FREE_DAILY_LIMIT,
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

          const proRestriction =
            getProRestriction(body.features);

          if (proRestriction) {
            return {
              allowed: false,
              plan: "free",
              subscriptionStatus: "inactive",
              unlimited: false,
              usedToday: Number(
                data.dailyGenerationCount || 0
              ),
              remaining: null,
              limit: FREE_DAILY_LIMIT,
              subscriptionExpired,
              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
              requiresPro: true,
              restrictionReason:
                proRestriction,
            };
          }

          let usedToday =
            Number(
              data.dailyGenerationCount || 0
            );

          const storedDate =
            String(
              data.dailyGenerationDate || ""
            );

          if (storedDate !== today) {
            usedToday = 0;
          }

          if (action === "check") {
            const remaining =
              Math.max(
                FREE_DAILY_LIMIT - usedToday,
                0
              );

            return {
              allowed:
                usedToday < FREE_DAILY_LIMIT,
              plan: "free",
              subscriptionStatus: "inactive",
              unlimited: false,
              usedToday,
              remaining,
              limit: FREE_DAILY_LIMIT,
              subscriptionExpired,
              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
              requiresPro: false,
              restrictionReason: null,
            };
          }

          if (
            usedToday >= FREE_DAILY_LIMIT
          ) {
            return {
              allowed: false,
              plan: "free",
              subscriptionStatus: "inactive",
              unlimited: false,
              usedToday,
              remaining: 0,
              limit: FREE_DAILY_LIMIT,
              subscriptionExpired,
              subscriptionExpiresAt:
                expiryDate
                  ? expiryDate.toISOString()
                  : null,
              requiresPro: false,
              restrictionReason: null,
            };
          }

          const newCount =
            usedToday + 1;

          transaction.set(
            userRef,
            {
              dailyGenerationDate: today,
              dailyGenerationCount: newCount,
              generationLimit: FREE_DAILY_LIMIT,
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
            subscriptionStatus: "inactive",
            unlimited: false,
            usedToday: newCount,
            remaining:
              Math.max(
                FREE_DAILY_LIMIT - newCount,
                0
              ),
            limit: FREE_DAILY_LIMIT,
            subscriptionExpired,
            subscriptionExpiresAt:
              expiryDate
                ? expiryDate.toISOString()
                : null,
            requiresPro: false,
            restrictionReason: null,
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
