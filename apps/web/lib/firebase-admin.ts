import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
} from "firebase-admin/firestore";

function getFirebaseAdminCredentials() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim();

  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL?.trim();

  let privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.trim();

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

  if (!privateKey) {
    throw new Error(
      "Missing FIREBASE_PRIVATE_KEY"
    );
  }

  /*
    Vercel may store newline characters
    inside the private key as literal \n.
    Convert them back to real newlines.
  */
  privateKey =
    privateKey.replace(
      /\\n/g,
      "\n"
    );

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getAdminDb() {
  if (!getApps().length) {
    const {
      projectId,
      clientEmail,
      privateKey,
    } =
      getFirebaseAdminCredentials();

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return getFirestore();
}