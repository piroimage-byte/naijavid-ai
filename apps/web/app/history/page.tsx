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
    <main className="mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden px-3 py-5 pb-14 sm:px-5 sm:py-8 sm:pb-16">
      <div className="mb-6 flex flex-col gap-4 sm:mb-7 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="m-0 text-3xl font-extrabold leading-tight sm:text-4xl md:text-[40px]">
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

        <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
          <Link
            href="/generator"
            className="w-full rounded-xl border border-neutral-600 px-4 py-3 text-center font-bold text-neutral-900 no-underline sm:w-auto"
          >
            Back to Generator
          </Link>

          {hasItems && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={working}
              className="w-full rounded-xl px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {items.map((item) => {
            const videoUrl =
              typeof item.videoUrl === "string"
                ? item.videoUrl.trim()
                : "";

            const hasVideo = videoUrl.length > 0;

            return (
              <div
                key={item.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-neutral-800 bg-[#0f0f10] p-3 text-white sm:p-4"
              >
                {hasVideo ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="mb-3.5 block h-auto w-full max-w-full rounded-xl bg-black"
                  />
                ) : (
                  <div
                    className="mb-3.5 flex min-h-40 w-full items-center justify-center rounded-xl bg-neutral-800 p-4 text-center text-neutral-400 sm:min-h-44 sm:p-5"
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

                <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2.5">
                  {hasVideo && (
                    <>
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full rounded-xl border border-neutral-600 px-4 py-3 text-center text-white no-underline sm:w-auto"
                      >
                        Open
                      </a>

                      <a
                        href={videoUrl}
                        download
                        className="w-full rounded-xl border border-neutral-600 px-4 py-3 text-center text-white no-underline sm:w-auto"
                      >
                        Download
                      </a>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleReuse(item)}
                    disabled={working}
                    className="w-full rounded-xl border border-neutral-600 bg-transparent px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    Reuse Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={working}
                    className="w-full rounded-xl px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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