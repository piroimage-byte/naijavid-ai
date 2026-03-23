import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "videoHistory";

export type VideoHistoryStatus = "queued" | "completed" | "failed";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  prompt: string;
  language: string;
  niche: string;
  duration: number;
  status: VideoHistoryStatus;
  message?: string;
  videoUrl?: string;
  createdAt?: any;
};

function mapItem(docItem: any): VideoHistoryItem {
  const data = docItem.data();

  return {
    id: docItem.id,
    userId: data.userId || "",
    prompt: data.prompt || "",
    language: data.language || "english",
    niche: data.niche || "business",
    duration: Number(data.duration || 5),
    status: (data.status || "queued") as VideoHistoryStatus,
    message: data.message || "",
    videoUrl: data.videoUrl || "",
    createdAt: data.createdAt,
  };
}

export async function createVideoHistory(data: {
  userId: string;
  prompt: string;
  language: string;
  niche: string;
  duration: number;
  status: VideoHistoryStatus;
  message?: string;
  videoUrl?: string;
}) {
  if (!data.userId) {
    throw new Error("User is required.");
  }

  if (!data.prompt.trim()) {
    throw new Error("Prompt is required.");
  }

  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    prompt: data.prompt.trim(),
    language: data.language,
    niche: data.niche,
    duration: data.duration,
    status: data.status,
    message: data.message || "",
    videoUrl: data.videoUrl || "",
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
  return snapshot.docs.map(mapItem);
}