"use client";

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  auth,
} from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

// =========================================================
// SECURE PROFILE SYNC
// =========================================================

async function syncUserProfile(
  firebaseUser: User
) {
  const idToken =
    await firebaseUser.getIdToken();

  const response =
    await fetch(
      "/api/user/profile",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          uid:
            firebaseUser.uid,

          email:
            firebaseUser.email,

          name:
            firebaseUser.displayName,

          photoURL:
            firebaseUser.photoURL,
        }),
      }
    );

  const data =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !data?.success
  ) {
    throw new Error(
      data?.error ||
        "Unable to sync user profile."
    );
  }

  return data;
}

// =========================================================
// PROVIDER
// =========================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          firebaseUser
        ) => {
          setUser(
            firebaseUser
          );

          try {
            if (
              firebaseUser
            ) {
              await syncUserProfile(
                firebaseUser
              );
            }
          } catch (
            error
          ) {
            console.error(
              "USER PROFILE SYNC ERROR:",
              error
            );
          } finally {
            setLoading(
              false
            );
          }
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =======================================================
  // GOOGLE SIGN IN
  // =======================================================

  async function signInWithGoogle() {
    const provider =
      new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt:
        "select_account",
    });

    await signInWithPopup(
      auth,
      provider
    );
  }

  // =======================================================
  // LOGOUT
  // =======================================================

  async function logout() {
    await signOut(
      auth
    );
  }

  // =======================================================
  // CONTEXT
  // =======================================================

  const value =
    useMemo(
      () => ({
        user,
        loading,
        signInWithGoogle,
        logout,
      }),
      [
        user,
        loading,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =========================================================
// HOOK
// =========================================================

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}