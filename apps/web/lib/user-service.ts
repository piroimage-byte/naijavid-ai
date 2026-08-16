import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserPlan = "free" | "pro";

export type UserProfile = {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  plan?: UserPlan;
  subscriptionStatus?: "inactive" | "active";
  createdAt?: unknown;
  updatedAt?: unknown;
  upgradedAt?: unknown;
};

export async function ensureUserProfile(params: {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
}) {
  const { uid, email = null, name = null, photoURL = null } = params;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      email,
      name,
      photoURL,
      plan: "free",
      subscriptionStatus: "inactive",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    email,
    name,
    photoURL,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data() as UserProfile;
}

export async function getUserPlan(uid: string): Promise<UserPlan> {
  const profile = await getUserProfile(uid);
  return (profile?.plan as UserPlan) || "free";
}

export async function isUserPro(uid: string): Promise<boolean> {
  const profile = await getUserProfile(uid);
  return profile?.plan === "pro" && profile?.subscriptionStatus === "active";
}