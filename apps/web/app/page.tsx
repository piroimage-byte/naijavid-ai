"use client";

import Link from "next/link";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useAuth } from "../components/auth-provider";

export default function HomePage() {
  const { user, loading } = useAuth();

  async function handleGoogleSignIn() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
          NaijaVid AI
        </h1>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Generate videos and save them to your history.
        </p>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 14,
          padding: 20,
          background: "#ffffff",
          marginBottom: 24,
        }}
      >
        {!loading && !user ? (
          <>
            <p style={{ marginTop: 0 }}>You are not signed in.</p>
            <button
              onClick={handleGoogleSignIn}
              style={{
                border: "none",
                background: "#111827",
                color: "#ffffff",
                padding: "12px 16px",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in with Google
            </button>
          </>
        ) : null}

        {!loading && user ? (
          <>
            <p style={{ marginTop: 0, marginBottom: 10 }}>
              Signed in as <strong>{user.email}</strong>
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href="/generator"
                style={{
                  textDecoration: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                Open Generator
              </Link>

              <Link
                href="/history"
                style={{
                  textDecoration: "none",
                  border: "1px solid #d1d5db",
                  color: "#111827",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                }}
              >
                View History
              </Link>

              <button
                onClick={handleLogout}
                style={{
                  border: "none",
                  background: "#dc2626",
                  color: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          </>
        ) : null}

        {loading ? <p style={{ margin: 0 }}>Loading...</p> : null}
      </div>
    </main>
  );
}