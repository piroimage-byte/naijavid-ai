import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

import {
  deleteStorageVideo,
} from "@/lib/server/video-storage";

export async function POST(
  request: NextRequest
) {
  try {
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

    const decodedToken =
      await getAdminAuth()
        .verifyIdToken(idToken);

    const userId =
      decodedToken.uid;

    const db =
      getAdminDb();

    const snapshot =
      await db
        .collection(
          "videoHistory"
        )
        .where(
          "userId",
          "==",
          userId
        )
        .get();

    for (
      const document
      of snapshot.docs
    ) {
      const data =
        document.data();

      const videoUrl =
        typeof data.videoUrl ===
          "string"
          ? data.videoUrl
          : "";

      if (videoUrl) {
        await deleteStorageVideo(
          videoUrl
        );
      }

      await document.ref.delete();
    }

    return NextResponse.json(
      {
        success: true,
        deleted:
          snapshot.size,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "CLEAR VIDEO HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to clear video history.",
      },
      {
        status: 500,
      }
    );
  }
}
