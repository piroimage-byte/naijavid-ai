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

const COLLECTION = "videoHistory";

export type VideoHistoryItem = {
  id: string;
  userId: string;
  title: string;
  videoUrl: string;
  filename?: string;
  duration?: number;
  fps?: number;
  imageName?: string;
  createdAt?: any;
};

export async function saveVideoHistory(data: {
  userId: string;
  title: string;
  videoUrl: string;
  filename?: string;
  duration?: number;
  fps?: number;
  imageName?: string;
}) {
  if (!data.userId) throw new Error("User ID is required.");
  if (!data.videoUrl) throw new Error("Video URL is required.");

  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    title: data.title?.trim() || "Untitled Video",
    videoUrl: data.videoUrl,
    filename: data.filename || "",
    duration: data.duration || 0,
    fps: data.fps || 0,
    imageName: data.imageName || "",
    createdAt: serverTimestamp(),
  });
}

export async function getUserVideoHistory(userId: string) {
  if (!userId) return [];

  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: item.id,
      userId: data.userId || "",
      title: data.title || "Untitled Video",
      videoUrl: data.videoUrl || "",
      filename: data.filename || "",
      duration: data.duration || 0,
      fps: data.fps || 0,
      imageName: data.imageName || "",
      createdAt: data.createdAt,
    } as VideoHistoryItem;
  });
}

export async function deleteVideoHistory(id: string) {
  if (!id) throw new Error("Video ID is required.");
  await deleteDoc(doc(db, COLLECTION, id));
}