import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  getAdminDb,
} from "@/lib/firebase-admin";

type SaveVideoBody = {
  userId?: string;
  prompt?: string;
  mode?: "text" | "image";
  language?: string;
  duration?: number;
  videoUrl?: string;
  watermark?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as SaveVideoBody;

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    const videoUrl =
      typeof body.videoUrl === "string"
        ? body.videoUrl.trim()
        : "";

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    const language =
      typeof body.language === "string"
        ? body.language.trim()
        : "English";

    const watermark =
      typeof body.watermark === "string"
        ? body.watermark.trim()
        : "naijavid.ai";

    const duration =
      typeof body.duration === "number"
        ? body.duration
        : 5;

    const mode = body.mode;

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

    if (!videoUrl) {
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

    if (
      mode !== "text" &&
      mode !== "image"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "mode must be text or image.",
        },
        {
          status: 400,
        }
      );
    }

    const adminDb = getAdminDb();

    const videoDocument =
      await adminDb
        .collection("videoHistory")
        .add({
          userId,
          prompt,
          mode,
          language,
          duration,
          videoUrl,
          watermark,

          status: "completed",

          createdAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),
        });

    return NextResponse.json(
      {
        success: true,
        message:
          "Video saved to history.",
        id: videoDocument.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "SAVE VIDEO SERVER ERROR:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to save video.";

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