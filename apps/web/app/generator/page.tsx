"use client";

import { useState } from "react";

export default function GeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("5");
  const [watermark, setWatermark] = useState("naijavid.ai");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      setVideoUrl("");

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL;

      const response = await fetch(`${apiUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          language,
          duration: Number(duration),
          watermark,
        }),
      });

      const result = await response.json();
      console.log("API RESPONSE:", result);

      if (!response.ok) {
        throw new Error(result?.detail || "Failed to generate video.");
      }

      if (!result?.video_url) {
        throw new Error("No video returned from server.");
      }

      setVideoUrl(result.video_url);
    } catch (err: any) {
      setError(err?.message || "Something went wrong while generating the video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "10px" }}>
        NaijaVid AI Generator
      </h1>
      <p style={{ marginBottom: "30px", color: "#ccc" }}>
        Create short demo videos in Nigerian local language style.
      </p>

      <div style={{ display: "grid", gap: "16px", padding: "24px", border: "1px solid #333", borderRadius: "16px" }}>
        <label>
          <div style={{ marginBottom: "8px" }}>Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "#000", color: "#fff", border: "1px solid #444" }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <label>
            <div style={{ marginBottom: "8px" }}>Language</div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#000", color: "#fff", border: "1px solid #444" }}
            >
              <option>English</option>
              <option>Yoruba</option>
              <option>Igbo</option>
              <option>Hausa</option>
              <option>Pidgin</option>
            </select>
          </label>

          <label>
            <div style={{ marginBottom: "8px" }}>Duration</div>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#000", color: "#fff", border: "1px solid #444" }}
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </label>

          <label>
            <div style={{ marginBottom: "8px" }}>Watermark</div>
            <input
              value={watermark}
              onChange={(e) => setWatermark(e.target.value)}
              style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#000", color: "#fff", border: "1px solid #444" }}
            />
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            padding: "18px",
            borderRadius: "14px",
            border: "none",
            fontSize: "28px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        {error && (
          <div style={{ background: "#7f1d1d", color: "#fff", padding: "16px", borderRadius: "12px" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ marginTop: "28px", padding: "24px", border: "1px solid #333", borderRadius: "16px" }}>
        <h2 style={{ fontSize: "22px", marginBottom: "16px" }}>Preview</h2>

        {!videoUrl && <p style={{ color: "#aaa" }}>Your generated video will appear here.</p>}

        {videoUrl && (
          <div>
            <video
              src={videoUrl}
              controls
              style={{ width: "100%", borderRadius: "12px" }}
            />
            <div style={{ marginTop: "12px" }}>
              <a href={videoUrl} target="_blank" rel="noreferrer">
                Open video
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}