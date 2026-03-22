import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "videoHistory";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  videoUrl: string;
  prompt?: string;
  createdAt?: any;
};

// SAVE VIDEO
export async function saveVideoHistory(data: {
  userId: string;
  videoUrl: string;
  prompt?: string;
}) {
  if (!data.userId) throw new Error("User ID required");
  if (!data.videoUrl) throw new Error("Video URL required");

  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    videoUrl: data.videoUrl,
    prompt: data.prompt || "",
    createdAt: serverTimestamp(),
  });
}

// GET USER VIDEOS
export async function getUserVideos(userId: string) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as VideoHistoryItem[];
}