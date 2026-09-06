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

    const body =
      await request.json();

    const id =
      String(
        body.id || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "History item ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const db =
      getAdminDb();

    const historyRef =
      db
        .collection(
          "videoHistory"
        )
        .doc(id);

    const snapshot =
      await historyRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        {
          success: true,
          alreadyDeleted: true,
        },
        {
          status: 200,
        }
      );
    }

    const data =
      snapshot.data() || {};

    if (
      String(
        data.userId || ""
      ) !== userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot delete another user's video.",
        },
        {
          status: 403,
        }
      );
    }

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

    await historyRef.delete();

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "DELETE VIDEO HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to delete video.",
      },
      {
        status: 500,
      }
    );
  }
}
