import {
  addDoc,
  collection,
  getCountFromServer,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "generationUsage";

function getTodayRange() {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  return { start, end };
}

export async function logGenerationUsage(data: {
  userId: string;
  plan: "free" | "pro";
  duration: number;
}) {
  await addDoc(collection(db, COLLECTION), {
    userId: data.userId,
    plan: data.plan,
    duration: data.duration,
    createdAt: serverTimestamp(),
  });
}

export async function getTodayGenerationCount(userId: string) {
  if (!userId) return 0;

  const { start, end } = getTodayRange();

  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    where("createdAt", ">=", start),
    where("createdAt", "<=", end)
  );

  const snapshot = await getCountFromServer(q);
  return snapshot.data().count || 0;
}