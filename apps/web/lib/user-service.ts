import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserPlan = "free" | "pro";

export type UserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  plan: UserPlan;
  createdAt?: any;
  updatedAt?: any;
};

const COLLECTION = "users";

export async function ensureUserProfile(data: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}) {
  const ref = doc(db, COLLECTION, data.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid: data.uid,
      email: data.email || "",
      displayName: data.displayName || "",
      plan: "free",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    email: data.email || "",
    displayName: data.displayName || "",
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, COLLECTION, uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserProfile;
}

export async function getUserPlan(uid: string): Promise<UserPlan> {
  const profile = await getUserProfile(uid);
  return profile?.plan || "free";
}

export async function setUserPlan(uid: string, plan: UserPlan) {
  const ref = doc(db, COLLECTION, uid);

  await setDoc(
    ref,
    {
      uid,
      plan,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}