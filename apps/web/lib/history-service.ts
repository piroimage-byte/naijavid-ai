import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  prompt: string;
  mode:
    | "text"
    | "image"
    | "multi";
  language: string;
  duration: number;
  watermark: string;
  videoUrl: string;
  status: string;
  createdAtMs: number;
  createdAt?: Timestamp | null;

  expiresAtMs?: number;
  expiresAt?: Timestamp | null;
  retentionDays?: number | null;

  aspectRatio?: string | null;
  cameraMotion?: string | null;
  showCaption?: boolean | null;
  captionStyle?: string | null;
  captionPosition?: string | null;
  showWatermark?: boolean | null;
  watermarkPosition?: string | null;
  watermarkOpacity?: number | null;
  backgroundMusic?: string | null;
  musicVolume?: number | null;
  imageCount?: number | null;
  sceneTransition?: string | null;
};

const COLLECTION_NAME =
  "videoHistory";

async function getAuthHeaders() {
  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "You must sign in first."
    );
  }

  const idToken =
    await currentUser.getIdToken();

  return {
    "Content-Type":
      "application/json",
    Authorization:
      `Bearer ${idToken}`,
  };
}

async function cleanupExpiredHistory() {
  try {
    const headers =
      await getAuthHeaders();

    await fetch(
      "/api/history/cleanup",
      {
        method: "POST",
        headers,
        body:
          JSON.stringify({}),
      }
    );
  } catch (error) {
    console.error(
      "HISTORY CLEANUP WARNING:",
      error
    );
  }
}

export async function getVideoHistory(
  userId: string
): Promise<VideoHistoryItem[]> {
  await cleanupExpiredHistory();

  const historyQuery = query(
    collection(
      db,
      COLLECTION_NAME
    ),
    where(
      "userId",
      "==",
      userId
    )
  );

  const snapshot =
    await getDocs(historyQuery);

  const items:
    VideoHistoryItem[] =
      snapshot.docs.map(
        (document) => {
          const data =
            document.data();

          const createdAt =
            data.createdAt
              instanceof Timestamp
              ? data.createdAt
              : null;

          const expiresAt =
            data.expiresAt
              instanceof Timestamp
              ? data.expiresAt
              : null;

          const createdAtMs =
            createdAt
              ? createdAt.toMillis()
              : 0;

          const expiresAtMs =
            expiresAt
              ? expiresAt.toMillis()
              : 0;

          const mode =
            data.mode === "image"
              ? "image"
              : data.mode === "multi"
                ? "multi"
                : "text";

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

            mode,

            language:
              String(
                data.language ||
                  "English"
              ),

            duration:
              Number(
                data.duration || 5
              ),

            watermark:
              String(
                data.watermark ||
                  "naijavid.ai"
              ),

            videoUrl:
              String(
                data.videoUrl || ""
              ),

            status:
              String(
                data.status ||
                  "completed"
              ),

            createdAtMs,
            createdAt,
            expiresAtMs,
            expiresAt,

            retentionDays:
              typeof data.retentionDays ===
                "number"
                ? data.retentionDays
                : null,

            aspectRatio:
              data.aspectRatio ??
              null,

            cameraMotion:
              data.cameraMotion ??
              null,

            showCaption:
              typeof data.showCaption ===
                "boolean"
                ? data.showCaption
                : null,

            captionStyle:
              data.captionStyle ??
              null,

            captionPosition:
              data.captionPosition ??
              null,

            showWatermark:
              typeof data.showWatermark ===
                "boolean"
                ? data.showWatermark
                : null,

            watermarkPosition:
              data.watermarkPosition ??
              null,

            watermarkOpacity:
              typeof data.watermarkOpacity ===
                "number"
                ? data.watermarkOpacity
                : null,

            backgroundMusic:
              data.backgroundMusic ??
              null,

            musicVolume:
              typeof data.musicVolume ===
                "number"
                ? data.musicVolume
                : null,

            imageCount:
              typeof data.imageCount ===
                "number"
                ? data.imageCount
                : null,

            sceneTransition:
              data.sceneTransition ??
              null,
          };
        }
      );

  items.sort(
    (a, b) =>
      b.createdAtMs -
      a.createdAtMs
  );

  return items;
}

export async function deleteVideoHistoryItem(
  id: string
) {
  const headers =
    await getAuthHeaders();

  const response =
    await fetch(
      "/api/history/delete",
      {
        method: "POST",
        headers,
        body:
          JSON.stringify({
            id,
          }),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.error ||
        "Failed to delete video."
    );
  }
}

export async function clearVideoHistory(
  _userId: string
) {
  const headers =
    await getAuthHeaders();

  const response =
    await fetch(
      "/api/history/clear",
      {
        method: "POST",
        headers,
        body:
          JSON.stringify({}),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.error ||
        "Failed to clear video history."
    );
  }
}
