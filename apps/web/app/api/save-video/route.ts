import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

type VideoMode =
  | "text"
  | "image"
  | "multi";

type SaveVideoBody = {
  prompt?: string;
  mode?: VideoMode | string;
  language?: string;
  duration?: number | string;
  videoUrl?: string;
  watermark?: string;

  aspectRatio?: string;
  cameraMotion?: string;

  showCaption?: boolean;
  captionStyle?: string;
  captionPosition?: string;

  showWatermark?: boolean;
  watermarkPosition?: string;
  watermarkOpacity?: number;

  backgroundMusic?: string;
  musicVolume?: number;

  imageCount?: number;
  sceneTransition?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    // =====================================================
    // VERIFY FIREBASE AUTHENTICATION
    // =====================================================

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
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
      authorization
        .slice(7)
        .trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token is missing.",
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
        "SAVE VIDEO AUTH ERROR:",
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
    // UID COMES ONLY FROM VERIFIED FIREBASE TOKEN
    // =====================================================

    const userId =
      decodedToken.uid;

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

    // =====================================================
    // READ REQUEST BODY
    // =====================================================

    const body =
      (await request.json()) as SaveVideoBody;

    const {
      prompt,
      mode,
      language,
      duration,
      videoUrl,
      watermark,

      aspectRatio,
      cameraMotion,

      showCaption,
      captionStyle,
      captionPosition,

      showWatermark,
      watermarkPosition,
      watermarkOpacity,

      backgroundMusic,
      musicVolume,

      imageCount,
      sceneTransition,
    } = body;

    // =====================================================
    // VALIDATE VIDEO URL
    // =====================================================

    if (
      !videoUrl ||
      typeof videoUrl !== "string"
    ) {
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

    const normalizedVideoUrl =
      videoUrl.trim();

    if (!normalizedVideoUrl) {
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

    // =====================================================
    // NORMALIZE MODE
    // =====================================================

    const normalizedMode =
      typeof mode === "string"
        ? mode.trim().toLowerCase()
        : "";

    const allowedModes: VideoMode[] = [
      "text",
      "image",
      "multi",
    ];

    if (
      !allowedModes.includes(
        normalizedMode as VideoMode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "mode must be text, image, or multi.",
          receivedMode:
            normalizedMode || null,
        },
        {
          status: 400,
        }
      );
    }

    // =====================================================
    // NORMALIZE DURATION
    // =====================================================

    const parsedDuration =
      typeof duration === "number"
        ? duration
        : Number(duration);

    const safeDuration =
      Number.isFinite(parsedDuration) &&
      parsedDuration > 0
        ? parsedDuration
        : 5;

    // =====================================================
    // FIREBASE ADMIN
    // =====================================================

    const db =
      getAdminDb();

    // =====================================================
    // SAVE VIDEO HISTORY
    // =====================================================

    const videoDocument =
      await db
        .collection("videoHistory")
        .add({
          // IMPORTANT:
          // This UID came from the verified Firebase token.
          userId,

          prompt:
            typeof prompt === "string"
              ? prompt.trim()
              : "",

          mode:
            normalizedMode as VideoMode,

          language:
            typeof language === "string"
              ? language.trim()
              : "English",

          duration:
            safeDuration,

          videoUrl:
            normalizedVideoUrl,

          watermark:
            typeof watermark === "string"
              ? watermark.trim()
              : "naijavid.ai",

          // =================================================
          // VIDEO SETTINGS
          // =================================================

          aspectRatio:
            typeof aspectRatio === "string"
              ? aspectRatio
              : null,

          cameraMotion:
            typeof cameraMotion === "string"
              ? cameraMotion
              : null,

          // =================================================
          // CAPTION SETTINGS
          // =================================================

          showCaption:
            typeof showCaption === "boolean"
              ? showCaption
              : null,

          captionStyle:
            typeof captionStyle === "string"
              ? captionStyle
              : null,

          captionPosition:
            typeof captionPosition === "string"
              ? captionPosition
              : null,

          // =================================================
          // WATERMARK SETTINGS
          // =================================================

          showWatermark:
            typeof showWatermark === "boolean"
              ? showWatermark
              : null,

          watermarkPosition:
            typeof watermarkPosition === "string"
              ? watermarkPosition
              : null,

          watermarkOpacity:
            typeof watermarkOpacity === "number"
              ? watermarkOpacity
              : null,

          // =================================================
          // BACKGROUND MUSIC
          // =================================================

          backgroundMusic:
            typeof backgroundMusic === "string"
              ? backgroundMusic
              : null,

          musicVolume:
            typeof musicVolume === "number"
              ? musicVolume
              : null,

          // =================================================
          // MULTIPLE IMAGE SETTINGS
          // =================================================

          imageCount:
            typeof imageCount === "number"
              ? imageCount
              : normalizedMode === "image"
                ? 1
                : normalizedMode === "multi"
                  ? 2
                  : 0,

          sceneTransition:
            typeof sceneTransition === "string"
              ? sceneTransition
              : "none",

          status:
            "completed",

          createdAt:
            FieldValue.serverTimestamp(),
        });

    // =====================================================
    // SERVER LOG
    // =====================================================

    console.log(
      "VIDEO SAVED TO HISTORY:",
      {
        id:
          videoDocument.id,

        userId,

        mode:
          normalizedMode,

        duration:
          safeDuration,

        videoUrl:
          normalizedVideoUrl,
      }
    );

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        message:
          "Video saved to history.",

        id:
          videoDocument.id,

        mode:
          normalizedMode,

        duration:
          safeDuration,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "========== SAVE VIDEO ERROR =========="
    );

    console.error(
      "MESSAGE:",
      error?.message
    );

    console.error(
      "CODE:",
      error?.code
    );

    console.error(
      "STACK:",
      error?.stack
    );

    console.error(
      "======================================"
    );

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