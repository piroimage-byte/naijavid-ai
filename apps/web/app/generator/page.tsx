"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveVideoHistory } from "@/lib/video-history-service";

export default function GeneratorPage() {
  const [user, setUser] = useState<User | null>(null);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("5");
  const [watermark, setWatermark] = useState("naijavid.ai");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsub();
  }, []);

  async function handleGenerate() {
    try {
      setLoading(true);
      setError("");
      setSaveMessage("");
      setVideoUrl("");

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "";

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

      if (user?.uid) {
        await saveVideoHistory({
          uid: user.uid,
          prompt,
          language,
          duration: Number(duration),
          watermark,
          videoUrl: result.video_url,
        });

        setSaveMessage("Video saved to history.");
      } else {
        setSaveMessage("Video generated. Sign in to save history.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong while generating the video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0 }}>NaijaVid AI Generator</h1>
          <p style={{ color: "#b8b8b8", marginTop: 8 }}>
            Create short demo videos in Nigerian local language style.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/history"
            style={{
              padding: "12px 16px",
              border: "1px solid #444",
              borderRadius: 12,
              textDecoration: "none",
              color: "#fff",
            }}
          >
            View History
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          padding: 24,
          border: "1px solid #2b2b2b",
          borderRadius: 18,
          background: "#121216",
        }}
      >
        <label>
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Prompt</div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Describe the video you want to generate..."
            style={{
              width: "100%",
              padding: 16,
              borderRadius: 12,
              background: "#000",
              color: "#fff",
              border: "1px solid #444",
              resize: "vertical",
            }}
          />
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Language</div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
              }}
            >
              <option value="English">English</option>
              <option value="Yoruba">Yoruba</option>
              <option value="Igbo">Igbo</option>
              <option value="Hausa">Hausa</option>
              <option value="Pidgin">Pidgin</option>
            </select>
          </label>

          <label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Duration</div>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
              }}
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </label>

          <label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Watermark</div>
            <input
              value={watermark}
              onChange={(e) => setWatermark(e.target.value)}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
              }}
            />
          </label>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          style={{
            padding: "18px",
            borderRadius: 14,
            border: "none",
            fontSize: 22,
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        {error && (
          <div
            style={{
              background: "#7f1d1d",
              color: "#fff",
              padding: 14,
              borderRadius: 12,
            }}
          >
            {error}
          </div>
        )}

        {saveMessage && (
          <div
            style={{
              background: "#14532d",
              color: "#fff",
              padding: 14,
              borderRadius: 12,
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 24,
          border: "1px solid #2b2b2b",
          borderRadius: 18,
          background: "#121216",
        }}
      >
        <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 16 }}>Preview</h2>

        {!videoUrl && (
          <p style={{ color: "#a9a9a9" }}>Your generated video will appear here.</p>
        )}

        {videoUrl && (
          <div>
            <video
              src={videoUrl}
              controls
              autoPlay
              style={{
                width: "100%",
                borderRadius: 12,
                background: "#000",
              }}
            />

            <div style={{ marginTop: 14 }}>
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