"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../components/providers/auth-provider";
import {
  deleteUserVideo,
  getUserVideos,
  type VideoHistoryItem,
} from "../../lib/video-history-service";

function formatDate(value: any) {
  if (!value) return "Just now";
  if (typeof value === "string") return value;
  if (value?.toDate) return value.toDate().toLocaleString();
  if (value instanceof Date) return value.toLocaleString();
  return "Just now";
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVideos() {
      if (!user) {
        setVideos([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await getUserVideos(user.uid);
        setVideos(result);
      } catch (err: any) {
        setError(err?.message || "Failed to load video history.");
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      loadVideos();
    }
  }, [user, authLoading]);

  async function handleDelete(id: string) {
    if (!user) return;

    try {
      setBusyId(id);
      await deleteUserVideo(id);
      setVideos((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err?.message || "Failed to delete video.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading) {
    return <main className="p-6 text-white">Checking account...</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-4 text-3xl font-bold">Video History</h1>
          <p className="mb-6 text-white/70">
            You need to sign in to view your saved videos.
          </p>
          <Link href="/" className="rounded bg-white px-4 py-2 text-black">
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold">Video History</h1>

        {loading && <p className="text-white/70">Loading videos...</p>}
        {error && <p className="mb-4 text-red-400">{error}</p>}

        {!loading && videos.length === 0 && (
          <div className="rounded border border-white/10 p-6 text-white/70">
            No videos found yet.
          </div>
        )}

        <div className="grid gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded border border-white/10 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{video.title || "Generated Video"}</p>
                  <p className="text-sm text-white/60">
                    Created: {formatDate(video.createdAt)}
                  </p>
                </div>

                <div className="flex gap-3">
                  {video.videoUrl && (
                    <a
                      href={video.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-white px-4 py-2 text-black"
                    >
                      View
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(video.id)}
                    disabled={busyId === video.id}
                    className="rounded border border-red-500 px-4 py-2 text-red-400 disabled:opacity-50"
                  >
                    {busyId === video.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}