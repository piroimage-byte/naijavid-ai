import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "videos";

export type VideoItem = {
  id: string;
  userId: string;
  videoUrl: string;
  prompt?: string;
  language?: string;
  duration?: number;
  createdAt?: any;
};

export async function saveVideo(data: {
  userId: string;
  videoUrl: string;
  prompt?: string;
  language?: string;
  duration?: number;
}) {
  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    videoUrl: data.videoUrl,
    prompt: data.prompt || "",
    language: data.language || "",
    duration: data.duration || 5,
    createdAt: serverTimestamp(),
  });
}

export async function getUserVideos(userId: string) {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as any),
  }));
}