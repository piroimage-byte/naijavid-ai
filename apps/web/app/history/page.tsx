"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
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
          console.error("HISTORY LOAD ERROR:", err);

          setError(
            err?.message || "Failed to load video history."
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const hasItems = useMemo(
    () => items.length > 0,
    [items]
  );

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this video from your history?"
    );

    if (!confirmed) return;

    try {
      setWorking(true);
      setError("");

      await deleteVideoHistoryItem(id);

      setItems((previous) =>
        previous.filter((item) => item.id !== id)
      );
    } catch (err: any) {
      console.error("DELETE HISTORY ERROR:", err);

      setError(
        err?.message || "Failed to delete item."
      );
    } finally {
      setWorking(false);
    }
  }

  async function handleClearAll() {
    if (!user) return;

    const confirmed = window.confirm(
      "Clear your entire video history?"
    );

    if (!confirmed) return;

    try {
      setWorking(true);
      setError("");

      await clearVideoHistory(user.uid);
      setItems([]);
    } catch (err: any) {
      console.error("CLEAR HISTORY ERROR:", err);

      setError(
        err?.message || "Failed to clear history."
      );
    } finally {
      setWorking(false);
    }
  }

  function handleReuse(item: VideoHistoryItem) {
    const params = new URLSearchParams();

    const add = (key: string, value: unknown) => {
      if (value !== undefined && value !== null && String(value) !== "") {
        params.set(key, String(value));
      }
    };

    add("reuse", "1");
    add("prompt", item.prompt);
    add("mode", item.mode);
    add("language", item.language);
    add("duration", item.duration);
    add("watermark", item.watermark);

    const saved = item as VideoHistoryItem & Record<string, unknown>;
    add("aspectRatio", saved.aspectRatio);
    add("cameraMotion", saved.cameraMotion);
    add("showCaption", saved.showCaption);
    add("captionStyle", saved.captionStyle);
    add("captionPosition", saved.captionPosition);
    add("showWatermark", saved.showWatermark);
    add("watermarkPosition", saved.watermarkPosition);
    add("watermarkOpacity", saved.watermarkOpacity);
    add("backgroundMusic", saved.backgroundMusic);
    add("musicVolume", saved.musicVolume);
    add("sceneTransition", saved.sceneTransition);

    router.push(`/generator?${params.toString()}`);
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 20px 60px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Video History
          </h1>

          <p
            style={{
              color: "#777",
              marginTop: 8,
            }}
          >
            View, open, download, and manage your generated videos.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/generator"
            style={{
              padding: "12px 16px",
              border: "1px solid #444",
              borderRadius: 12,
              textDecoration: "none",
              color: "#111",
              fontWeight: 700,
            }}
          >
            Back to Generator
          </Link>

          {hasItems && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={working}
              style={{
                padding: "12px 16px",
                border: "none",
                borderRadius: 12,
                cursor: working ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: working ? 0.6 : 1,
              }}
            >
              {working ? "Working..." : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {!user && !loading && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: 16,
            padding: 20,
            background: "#111",
            color: "#fff",
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
            color: "#fff",
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
            color: "#fff",
          }}
        >
          No saved videos yet.
        </div>
      )}

      {user && !loading && hasItems && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {items.map((item) => {
            const videoUrl =
              typeof item.videoUrl === "string"
                ? item.videoUrl.trim()
                : "";

            const hasVideo = videoUrl.length > 0;

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid #2b2b2b",
                  borderRadius: 18,
                  padding: 16,
                  background: "#0f0f10",
                  color: "#fff",
                }}
              >
                {hasVideo ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      background: "#000",
                      marginBottom: 14,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      minHeight: 180,
                      borderRadius: 12,
                      background: "#1f1f1f",
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#aaa",
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Video unavailable
                  </div>
                )}

                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Prompt
                </div>

                <div
                  style={{
                    color: "#d4d4d4",
                    marginBottom: 12,
                    wordBreak: "break-word",
                  }}
                >
                  {item.prompt || "No prompt"}
                </div>

                <div
                  style={{
                    color: "#b8b8b8",
                    fontSize: 14,
                    lineHeight: 1.8,
                  }}
                >
                  <div>Mode: {item.mode}</div>
                  <div>Language: {item.language}</div>
                  <div>Duration: {item.duration} seconds</div>
                  <div>Watermark: {item.watermark}</div>
                  <div>Status: {item.status}</div>
                  <div>
                    Saved: {formatDate(item.createdAtMs)}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {hasVideo && (
                    <>
                      <a
                        href={videoUrl}
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
                        href={videoUrl}
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
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleReuse(item)}
                    disabled={working}
                    style={{
                      padding: "10px 14px",
                      border: "1px solid #444",
                      borderRadius: 12,
                      cursor: working ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      opacity: working ? 0.6 : 1,
                      background: "transparent",
                      color: "#fff",
                    }}
                  >
                    Reuse Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={working}
                    style={{
                      padding: "10px 14px",
                      border: "none",
                      borderRadius: 12,
                      cursor: working ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      opacity: working ? 0.6 : 1,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}