"use client";

import { useState } from "react";

export default function ProjectsPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  const handleGenerate = async () => {
    if (!prompt) {
      alert("Enter prompt");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "https://naijavid-ai-new.onrender.com/generate",
        {
          method: "POST",
          body: JSON.stringify({ prompt }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      if (data.video_url) {
        setVideoUrl(data.video_url);
      } else {
        alert("Generation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating video");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Generate Video</h1>

      {/* ✅ FIXED INPUT */}
      <input
        type="text"
        placeholder="Enter prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate"}
      </button>

      {videoUrl && (
        <div style={{ marginTop: 20 }}>
          <video src={videoUrl} controls width="400" />
        </div>
      )}
    </div>
  );
}