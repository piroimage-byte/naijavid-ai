import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  prompt: string;
  mode: "text" | "image";
  language: string;
  duration: number;
  watermark: string;
  videoUrl: string;
  status: string;
  createdAtMs: number;
  createdAt?: Timestamp | null;
};

const COLLECTION_NAME = "videoHistory";

// ----------------------------------------------------
// GET VIDEO HISTORY
// ----------------------------------------------------

export async function getVideoHistory(
  userId: string
): Promise<VideoHistoryItem[]> {
  const historyQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(historyQuery);

  const items: VideoHistoryItem[] =
    snapshot.docs.map((document) => {
      const data = document.data();

      const createdAt =
        data.createdAt instanceof Timestamp
          ? data.createdAt
          : null;

      const createdAtMs = createdAt
        ? createdAt.toMillis()
        : 0;

      return {
        id: document.id,

        userId: String(
          data.userId || ""
        ),

        prompt: String(
          data.prompt || ""
        ),

        mode:
          data.mode === "image"
            ? "image"
            : "text",

        language: String(
          data.language || "English"
        ),

        duration: Number(
          data.duration || 5
        ),

        watermark: String(
          data.watermark || "naijavid.ai"
        ),

        videoUrl: String(
          data.videoUrl || ""
        ),

        status: String(
          data.status || "completed"
        ),

        createdAtMs,

        createdAt,
      };
    });

  // Newest videos first
  items.sort(
    (a, b) =>
      b.createdAtMs - a.createdAtMs
  );

  return items;
}

// ----------------------------------------------------
// DELETE ONE HISTORY ITEM
// ----------------------------------------------------

export async function deleteVideoHistoryItem(
  id: string
) {
  await deleteDoc(
    doc(
      db,
      COLLECTION_NAME,
      id
    )
  );
}

// ----------------------------------------------------
// CLEAR USER HISTORY
// ----------------------------------------------------

export async function clearVideoHistory(
  userId: string
) {
  const historyQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId)
  );

  const snapshot =
    await getDocs(historyQuery);

  const batch =
    writeBatch(db);

  snapshot.docs.forEach(
    (document) => {
      batch.delete(
        doc(
          db,
          COLLECTION_NAME,
          document.id
        )
      );
    }
  );

  await batch.commit();
}