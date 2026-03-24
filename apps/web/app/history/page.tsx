"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  clearVideoHistory,
  deleteVideoHistoryItem,
  getVideoHistory,
  VideoHistoryItem,
} from "@/lib/video-history-service";

function formatDate(value: number) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString();
}

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const data = await getVideoHistory(firebaseUser.uid);
        setItems(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load video history.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items]);

  async function handleDelete(id: string) {
    try {
      setWorking(true);
      setError("");
      await deleteVideoHistoryItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || "Failed to delete item.");
    } finally {
      setWorking(false);
    }
  }

  async function handleClearAll() {
    if (!user) return;

    const confirmed = window.confirm("Clear your entire video history?");
    if (!confirmed) return;

    try {
      setWorking(true);
      setError("");
      await clearVideoHistory(user.uid);
      setItems([]);
    } catch (err: any) {
      setError(err?.message || "Failed to clear history.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>Video History</h1>
          <p style={{ color: "#b8b8b8", marginTop: 8 }}>
            View, open, download, and manage your generated videos.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/generator"
            style={{
              padding: "12px 16px",
              border: "1px solid #444",
              borderRadius: 12,
              textDecoration: "none",
              color: "#fff",
            }}
          >
            Back to Generator
          </Link>

          {hasItems && (
            <button
              onClick={handleClearAll}
              disabled={working}
              style={{
                padding: "12px 16px",
                border: "none",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {working ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {!user && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 16,
            padding: 20,
            background: "#111",
          }}
        >
          Sign in to see your saved video history.
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 16,
            background: "#7f1d1d",
            color: "#fff",
            padding: 14,
            borderRadius: 12,
          }}
        >
          {error}
        </div>
      )}

      {user && loading && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 16,
            padding: 20,
            background: "#111",
          }}
        >
          Loading history...
        </div>
      )}

      {user && !loading && !hasItems && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 16,
            padding: 20,
            background: "#111",
          }}
        >
          No saved videos yet.
        </div>
      )}

      {user && hasItems && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid #2b2b2b",
                borderRadius: 18,
                padding: 16,
                background: "#0f0f10",
              }}
            >
              <video
                src={item.videoUrl}
                controls
                style={{
                  width: "100%",
                  borderRadius: 12,
                  background: "#000",
                  marginBottom: 14,
                }}
              />

              <div style={{ fontWeight: 700, marginBottom: 8 }}>Prompt</div>
              <div style={{ color: "#d4d4d4", marginBottom: 12 }}>{item.prompt}</div>

              <div style={{ color: "#b8b8b8", fontSize: 14, lineHeight: 1.8 }}>
                <div>Language: {item.language}</div>
                <div>Duration: {item.duration} seconds</div>
                <div>Watermark: {item.watermark}</div>
                <div>Saved: {formatDate(item.createdAtMs)}</div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #444",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "#fff",
                  }}
                >
                  Open
                </a>

                <a
                  href={item.videoUrl}
                  download
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #444",
                    borderRadius: 12,
                    textDecoration: "none",
                    color: "#fff",
                  }}
                >
                  Download
                </a>

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={working}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}