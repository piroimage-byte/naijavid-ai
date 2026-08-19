import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

export function getAdminDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim();

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL?.trim();

  const rawPrivateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error(
      "Missing FIREBASE_PROJECT_ID"
    );
  }

  if (!clientEmail) {
    throw new Error(
      "Missing FIREBASE_CLIENT_EMAIL"
    );
  }

  if (!rawPrivateKey) {
    throw new Error(
      "Missing FIREBASE_PRIVATE_KEY"
    );
  }

  const privateKey = rawPrivateKey
    .replace(/^"(.*)"$/s, "$1")
    .replace(/\\n/g, "\n");

  if (
    !privateKey.includes(
      "-----BEGIN PRIVATE KEY-----"
    )
  ) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY format is invalid"
    );
  }

  const existingApps = getApps();

  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
  } else {
    cachedApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  cachedDb = getFirestore(cachedApp);

  return cachedDb;
}