import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type VideoHistoryItem = {
  id: string;
  uid: string;
  prompt: string;
  language: string;
  duration: number;
  watermark: string;
  videoUrl: string;
  createdAtMs: number;
  createdAt?: any;
};

const COLLECTION_NAME = "video_history";

export async function saveVideoHistory(input: {
  uid: string;
  prompt: string;
  language: string;
  duration: number;
  watermark: string;
  videoUrl: string;
}) {
  const payload = {
    uid: input.uid,
    prompt: input.prompt,
    language: input.language,
    duration: input.duration,
    watermark: input.watermark,
    videoUrl: input.videoUrl,
    createdAt: serverTimestamp(),
    createdAtMs: Date.now(),
  };

  const ref = await addDoc(collection(db, COLLECTION_NAME), payload);
  return ref.id;
}

export async function getVideoHistory(uid: string): Promise<VideoHistoryItem[]> {
  const q = query(collection(db, COLLECTION_NAME), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  const items: VideoHistoryItem[] = snapshot.docs.map((item) => {
    const data = item.data();

    return {
      id: item.id,
      uid: String(data.uid || ""),
      prompt: String(data.prompt || ""),
      language: String(data.language || "English"),
      duration: Number(data.duration || 5),
      watermark: String(data.watermark || "naijavid.ai"),
      videoUrl: String(data.videoUrl || ""),
      createdAtMs: Number(data.createdAtMs || 0),
      createdAt: data.createdAt,
    };
  });

  items.sort((a, b) => b.createdAtMs - a.createdAtMs);
  return items;
}

export async function deleteVideoHistoryItem(id: string) {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
}

export async function clearVideoHistory(uid: string) {
  const q = query(collection(db, COLLECTION_NAME), where("uid", "==", uid));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  snapshot.docs.forEach((item) => {
    batch.delete(doc(db, COLLECTION_NAME, item.id));
  });

  await batch.commit();
}