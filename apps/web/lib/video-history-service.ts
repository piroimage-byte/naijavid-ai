import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  prompt: string;
  videoUrl: string;
  createdAt?: any;
};

const COLLECTION = "videoHistory";

export async function saveVideoHistory(data: {
  userId: string;
  prompt: string;
  videoUrl: string;
}) {
  if (!data.userId) {
    throw new Error("User ID is required.");
  }

  if (!data.videoUrl) {
    throw new Error("Video URL is required.");
  }

  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    prompt: data.prompt || "",
    videoUrl: data.videoUrl,
    createdAt: serverTimestamp(),
  });
}

export async function getUserVideoHistory(
  userId: string
): Promise<VideoHistoryItem[]> {
  if (!userId) return [];

  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docItem) => {
    const data = docItem.data();

    return {
      id: docItem.id,
      userId: data.userId || "",
      prompt: data.prompt || "",
      videoUrl: data.videoUrl || "",
      createdAt: data.createdAt,
    };
  });
}

export async function deleteVideoHistoryItem(id: string) {
  if (!id) {
    throw new Error("Video history ID is required.");
  }

  await deleteDoc(doc(db, COLLECTION, id));
}

export function formatVideoHistoryDate(value: any) {
  if (!value) return "Unknown date";

  if (typeof value === "string") return value;

  if (value?.toDate) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return "Unknown date";
}