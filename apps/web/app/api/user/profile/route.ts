import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  FieldValue,
} from "firebase-admin/firestore";

import {
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

async function verifyUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "Authentication required."
    );
  }

  const idToken =
    authorization
      .slice(7)
      .trim();

  if (!idToken) {
    throw new Error(
      "Authentication token missing."
    );
  }

  return await getAdminAuth()
    .verifyIdToken(idToken);
}

// =========================================================
// CREATE / UPDATE USER PROFILE
// =========================================================

export async function POST(
  request: NextRequest
) {
  try {
    let decodedToken;

    try {
      decodedToken =
        await verifyUser(
          request
        );
    } catch (error) {
      console.error(
        "USER PROFILE AUTH ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const uid =
      decodedToken.uid;

    const requestedUid =
      String(
        body?.uid || ""
      ).trim();

    if (
      requestedUid &&
      requestedUid !== uid
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User identity mismatch.",
        },
        {
          status: 403,
        }
      );
    }

    const email =
      decodedToken.email ||
      body?.email ||
      null;

    const name =
      decodedToken.name ||
      body?.name ||
      null;

    const photoURL =
      decodedToken.picture ||
      body?.photoURL ||
      null;

    const db =
      getAdminDb();

    const ref =
      db
        .collection("users")
        .doc(uid);

    const snapshot =
      await ref.get();

    // -----------------------------------------------------
    // NEW USER
    // -----------------------------------------------------

    if (!snapshot.exists) {
      await ref.set({
        uid,

        email,

        name,

        photoURL,

        plan:
          "free",

        subscriptionStatus:
          "inactive",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        {
          success: true,
          created: true,
        },
        {
          status: 201,
        }
      );
    }

    // -----------------------------------------------------
    // EXISTING USER
    // -----------------------------------------------------
    // Do not overwrite plan, subscription, limits,
    // payment data or other protected fields.

    await ref.update({
      email,

      name,

      photoURL,

      updatedAt:
        FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        created: false,
      },
      {
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(
      "USER PROFILE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error?.message ||
          "Unable to update user profile.",
      },
      {
        status: 500,
      }
    );
  }
}