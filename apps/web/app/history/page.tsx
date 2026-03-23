"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { getUserVideos, VideoItem } from "@/lib/video-history-service";

export default function HistoryPage() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user?.uid) return;

      const data = await getUserVideos(user.uid);
      setVideos(data);
      setLoading(false);
    }

    load();
  }, [user]);

  if (loading) {
    return <div className="p-6 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6">Your Videos</h1>

      {videos.length === 0 ? (
        <p>No videos yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-zinc-900 p-4 rounded-xl border border-zinc-800"
            >
              <video
                src={video.videoUrl}
                controls
                className="w-full rounded-lg mb-3"
              />

              <p className="text-sm text-gray-400">
                {video.prompt || "No prompt"}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                {video.language} • {video.duration}s
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}