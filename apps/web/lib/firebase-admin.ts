import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import {
  getFirestore,
} from "firebase-admin/firestore";

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function getServiceAccount(): FirebaseServiceAccount {
  const encoded =
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();

  if (!encoded) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_BASE64"
    );
  }

  try {
    const decoded = Buffer.from(
      encoded,
      "base64"
    ).toString("utf8");

    const serviceAccount =
      JSON.parse(decoded) as FirebaseServiceAccount;

    if (!serviceAccount.project_id) {
      throw new Error(
        "Service account is missing project_id"
      );
    }

    if (!serviceAccount.client_email) {
      throw new Error(
        "Service account is missing client_email"
      );
    }

    if (!serviceAccount.private_key) {
      throw new Error(
        "Service account is missing private_key"
      );
    }

    return serviceAccount;
  } catch (error) {
    throw new Error(
      `Unable to read Firebase service account: ${
        error instanceof Error
          ? error.message
          : "Unknown error"
      }`
    );
  }
}

function getAdminApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const serviceAccount =
    getServiceAccount();

  return initializeApp({
    credential: cert({
      projectId:
        serviceAccount.project_id,

      clientEmail:
        serviceAccount.client_email,

      privateKey:
        serviceAccount.private_key,
    }),
  });
}

export function getAdminDb() {
  return getFirestore(
    getAdminApp()
  );
}

export function getAdminAuth() {
  return getAuth(
    getAdminApp()
  );
}