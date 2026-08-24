import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

type SaveVideoBody = {
  userId?: string;
  prompt?: string;
  mode?: "text" | "image";
  language?: string;
  duration?: number;
  videoUrl?: string;
  watermark?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaveVideoBody;

    const {
      userId,
      prompt,
      mode,
      language,
      duration,
      videoUrl,
      watermark,
    } = body;

    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!userId || typeof userId !== "string") {
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

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "videoUrl is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (mode !== "text" && mode !== "image") {
      return NextResponse.json(
        {
          success: false,
          error: "mode must be text or image.",
        },
        {
          status: 400,
        }
      );
    }

    // ---------------------------------------------
    // FIREBASE ADMIN
    // ---------------------------------------------

    const db = getAdminDb();

    // ---------------------------------------------
    // SAVE VIDEO HISTORY
    // ---------------------------------------------

    const videoDocument = await db
      .collection("videoHistory")
      .add({
        userId,

        prompt:
          typeof prompt === "string"
            ? prompt.trim()
            : "",

        mode,

        language:
          typeof language === "string"
            ? language.trim()
            : "English",

        duration:
          typeof duration === "number"
            ? duration
            : 5,

        videoUrl,

        watermark:
          typeof watermark === "string"
            ? watermark.trim()
            : "naijavid.ai",

        status: "completed",

        createdAt: FieldValue.serverTimestamp(),
      });

    // ---------------------------------------------
    // SUCCESS
    // ---------------------------------------------

    return NextResponse.json(
      {
        success: true,
        message: "Video saved to history.",
        id: videoDocument.id,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error("========== SAVE VIDEO ERROR ==========");
    console.error("MESSAGE:", error?.message);
    console.error("CODE:", error?.code);
    console.error("STACK:", error?.stack);
    console.error("FULL ERROR:", error);
    console.error("======================================");

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to save video.",
        code:
          error?.code ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}