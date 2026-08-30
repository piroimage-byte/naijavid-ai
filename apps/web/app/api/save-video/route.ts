import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminDb } from "@/lib/firebase-admin";

type VideoMode =
  | "text"
  | "image"
  | "multiple-images"
  | "multi-image";

type SaveVideoBody = {
  userId?: string;
  prompt?: string;
  mode?: VideoMode | string;
  language?: string;
  duration?: number | string;
  videoUrl?: string;
  watermark?: string;

  // Optional metadata for newer generator features
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
};

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as SaveVideoBody;

    const {
      userId,
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
    } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !userId ||
      typeof userId !== "string"
    ) {
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

    // -----------------------------------------------------
    // NORMALIZE MODE
    // -----------------------------------------------------

    const normalizedMode =
      typeof mode === "string"
        ? mode.trim().toLowerCase()
        : "";

    const allowedModes = [
      "text",
      "image",
      "multiple-images",
      "multi-image",
    ];

    if (
      !allowedModes.includes(
        normalizedMode
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid video mode.",
          receivedMode:
            normalizedMode || null,
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------------
    // NORMALIZE DURATION
    // -----------------------------------------------------

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

    const db = getAdminDb();

    // =====================================================
    // HISTORY DOCUMENT
    // =====================================================

    const historyData = {
      userId,

      prompt:
        typeof prompt === "string"
          ? prompt.trim()
          : "",

      mode: normalizedMode,

      language:
        typeof language === "string"
          ? language.trim()
          : "English",

      duration: safeDuration,

      videoUrl,

      watermark:
        typeof watermark === "string"
          ? watermark.trim()
          : "naijavid.ai",

      // ---------------------------------------------------
      // VIDEO SETTINGS
      // ---------------------------------------------------

      aspectRatio:
        typeof aspectRatio === "string"
          ? aspectRatio
          : null,

      cameraMotion:
        typeof cameraMotion === "string"
          ? cameraMotion
          : null,

      // ---------------------------------------------------
      // CAPTION SETTINGS
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // WATERMARK SETTINGS
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // BACKGROUND MUSIC
      // ---------------------------------------------------

      backgroundMusic:
        typeof backgroundMusic === "string"
          ? backgroundMusic
          : null,

      musicVolume:
        typeof musicVolume === "number"
          ? musicVolume
          : null,

      // ---------------------------------------------------
      // MULTIPLE IMAGE INFORMATION
      // ---------------------------------------------------

      imageCount:
        typeof imageCount === "number"
          ? imageCount
          : null,

      status: "completed",

      createdAt:
        FieldValue.serverTimestamp(),
    };

    // =====================================================
    // SAVE
    // =====================================================

    const videoDocument =
      await db
        .collection("videoHistory")
        .add(historyData);

    console.log(
      "VIDEO HISTORY SAVED:",
      videoDocument.id,
      {
        mode: normalizedMode,
        duration: safeDuration,
        videoUrl,
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
        id: videoDocument.id,
        mode: normalizedMode,
        duration: safeDuration,
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
      "FULL ERROR:",
      error
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