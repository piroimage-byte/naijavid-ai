import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserPlan = "FREE" | "BASIC" | "PRO";

export type UserProfile = {
  userId: string;
  email?: string | null;
  plan: UserPlan;
  generationCount: number;
  createdAt?: any;
  updatedAt?: any;
};

const COLLECTION = "users";

export async function ensureUserProfile(data: {
  userId: string;
  email?: string | null;
}) {
  const ref = doc(db, COLLECTION, data.userId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      userId: data.userId,
      email: data.email || "",
      plan: "FREE",
      generationCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    email: data.email || snapshot.data()?.email || "",
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const ref = doc(db, COLLECTION, userId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  return {
    userId: data.userId || userId,
    email: data.email || "",
    plan: data.plan || "FREE",
    generationCount: data.generationCount || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function canUserGenerate(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const profile = await getUserProfile(userId);

  if (!profile) {
    return { allowed: false, reason: "User profile not found." };
  }

  if (profile.plan === "PRO") {
    return { allowed: true };
  }

  const limit = profile.plan === "BASIC" ? 30 : 5;

  if ((profile.generationCount || 0) >= limit) {
    return {
      allowed: false,
      reason: `You have reached your ${profile.plan} plan limit.`,
    };
  }

  return { allowed: true };
}

export async function incrementGenerationCount(userId: string) {
  const ref = doc(db, COLLECTION, userId);

  await updateDoc(ref, {
    generationCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function setUserPlan(userId: string, plan: UserPlan) {
  const ref = doc(db, COLLECTION, userId);

  await updateDoc(ref, {
    plan,
    updatedAt: serverTimestamp(),
  });
}