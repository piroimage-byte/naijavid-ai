import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  Timestamp,
} from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

import {
  deleteStorageVideo,
} from "@/lib/server/video-storage";

function getExpiryDate(
  value: unknown
): Date | null {
  if (!value) return null;

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (
      value as {
        toDate?: unknown;
      }
    ).toDate === "function"
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

  return null;
}

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

    let deleted = 0;

    for (
      const document
      of snapshot.docs
    ) {
      const data =
        document.data();

      const expiresAt =
        getExpiryDate(
          data.expiresAt
        );

      if (
        !expiresAt ||
        expiresAt.getTime() >
          Date.now()
      ) {
        continue;
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

      await document.ref.delete();
      deleted += 1;
    }

    return NextResponse.json(
      {
        success: true,
        deleted,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "CLEANUP VIDEO HISTORY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Unable to clean expired videos.",
      },
      {
        status: 500,
      }
    );
  }
}
