"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  deleteVideoHistoryItem,
  formatVideoHistoryDate,
  getUserVideoHistory,
  VideoHistoryItem,
} from "@/lib/video-history-service";

export default function HistoryPage() {
  const { user, loading } = useAuth();

  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadHistory() {
    if (!user) {
      setVideos([]);
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      setError("");
      const items = await getUserVideoHistory(user.uid);
      setVideos(items);
    } catch (err: any) {
      setError(err?.message || "Failed to load video history.");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (loading) return;
    loadHistory();
  }, [user, loading]);

  async function handleDelete(id: string) {
    try {
      setBusyId(id);
      setError("");
      await deleteVideoHistoryItem(id);
      setVideos((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setError(err?.message || "Failed to delete video.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#03133d] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">My Videos</h1>
            <p className="mt-2 text-lg text-white/85">
              View, download, and manage your generated videos.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/generator"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-[#03133d]"
            >
              Generator
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white"
            >
              Pricing
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          {loading || pageLoading ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-4 text-slate-700">
              Loading video history...
            </div>
          ) : null}

          {!loading && !user ? (
            <div className="rounded-2xl bg-yellow-100 px-4 py-4 font-semibold text-yellow-800">
              Please sign in to view your video history.
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-100 px-4 py-4 font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !pageLoading && user && videos.length === 0 ? (
            <div className="rounded-2xl bg-slate-100 px-4 py-4 text-slate-700">
              No videos found yet.
            </div>
          ) : null}

          {!loading && !pageLoading && videos.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {videos.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <video
                    controls
                    className="w-full rounded-2xl border border-slate-300 bg-black"
                    src={item.videoUrl}
                  />

                  <div className="mt-4 space-y-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      Generated Video
                    </h2>

                    <p className="text-sm text-slate-500">
                      {formatVideoHistoryDate(item.createdAt)}
                    </p>

                    <p className="text-base text-slate-700">
                      {item.prompt || "No prompt provided."}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={item.videoUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-green-600 px-4 py-2 font-semibold text-white"
                    >
                      Download
                    </a>

                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busyId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}