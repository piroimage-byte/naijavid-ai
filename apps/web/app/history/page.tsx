"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  VideoHistoryItem,
  deleteVideoHistory,
  getUserVideoHistory,
} from "@/lib/video-history-service";

function formatDate(value: any) {
  if (!value) return "Unknown date";

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString();
    }
    return value;
  }

  if (value?.toDate) {
    return value.toDate().toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return "Unknown date";
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadVideos(userId: string) {
    try {
      setPageLoading(true);
      setError("");
      const items = await getUserVideoHistory(userId);
      setVideos(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setVideos([]);
      setPageLoading(false);
      return;
    }

    loadVideos(user.uid);
  }, [user, loading]);

  async function handleDelete(video: VideoHistoryItem) {
    if (!user) return;

    const confirmed = window.confirm(
      `Delete "${video.title || "this video"}" from history?`
    );
    if (!confirmed) return;

    try {
      setBusyId(video.id);
      setError("");
      await deleteVideoHistory(video.id);
      setVideos((current) => current.filter((item) => item.id !== video.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Video History</h1>
          <p className="mt-3 text-base text-neutral-400">
            View, play, download, and manage your generated videos.
          </p>
        </div>

        <Link
          href="/generator"
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
        >
          Generate New Video
        </Link>
      </div>

      {!user && !loading && (
        <div className="rounded border border-yellow-900 bg-yellow-950/40 px-4 py-4 text-yellow-200">
          You must sign in to view your video history.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/50 px-4 py-4 text-red-300">
          {error}
        </div>
      )}

      {loading || pageLoading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-neutral-300">
          Loading history...
        </div>
      ) : user && videos.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <p className="text-neutral-300">No videos yet.</p>
          <Link
            href="/generator"
            className="mt-4 inline-block rounded bg-white px-4 py-2 font-medium text-black"
          >
            Generate your first video
          </Link>
        </div>
      ) : user ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950"
            >
              <div className="aspect-video bg-black">
                <video
                  src={video.videoUrl}
                  controls
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="p-5">
                <h2 className="line-clamp-1 text-xl font-semibold">
                  {video.title || "Untitled Video"}
                </h2>

                <div className="mt-3 space-y-1 text-sm text-neutral-400">
                  <p>Created: {formatDate(video.createdAt)}</p>
                  <p>Duration: {video.duration || 0}s</p>
                  <p>FPS: {video.fps || 0}</p>
                  {video.imageName ? <p>Image: {video.imageName}</p> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href={video.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-white px-4 py-2 text-sm font-medium text-black"
                  >
                    Open
                  </a>

                  <a
                    href={video.videoUrl}
                    download={video.filename || `${video.title || "video"}.mp4`}
                    className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200"
                  >
                    Download
                  </a>

                  <button
                    type="button"
                    disabled={busyId === video.id}
                    onClick={() => handleDelete(video)}
                    className="rounded border border-red-700 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                  >
                    {busyId === video.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </main>
  );
}