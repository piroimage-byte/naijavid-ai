"use client";

import { useEffect, useState } from "react";

type VideoItem = {
  id: string;
  url: string;
  createdAt: number;
};

export default function HistoryPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("video_history");
      if (stored) {
        setVideos(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  function clearHistory() {
    localStorage.removeItem("video_history");
    setVideos([]);
  }

  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold" }}>
        Video History
      </h1>

      {videos.length === 0 && (
        <p style={{ marginTop: 20 }}>
          No videos generated yet.
        </p>
      )}

      {videos.length > 0 && (
        <>
          <button
            onClick={clearHistory}
            style={{
              marginTop: 10,
              marginBottom: 20,
              padding: "8px 16px",
              background: "red",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Clear History
          </button>

          <div
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            {videos.map((video) => (
              <div
                key={video.id}
                style={{
                  border: "1px solid #ccc",
                  padding: 10,
                  borderRadius: 6,
                }}
              >
                <video
                  src={video.url}
                  controls
                  style={{
                    width: "100%",
                    borderRadius: 6,
                  }}
                />

                <p style={{ fontSize: 12, marginTop: 8 }}>
                  {new Date(video.createdAt).toLocaleString()}
                </p>

                <a
                  href={video.url}
                  download
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    color: "blue",
                  }}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}