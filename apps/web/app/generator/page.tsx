"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { saveVideoHistory } from "@/lib/video-history-service";

type Mode = "text" | "image";

export default function GeneratorPage() {
  const [user, setUser] = useState<User | null>(null);

  const [mode, setMode] = useState<Mode>("text");

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("5");
  const [watermark, setWatermark] = useState("naijavid.ai");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

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

  function resetMessages() {
    setError("");
    setSaveMessage("");
    setVideoUrl("");
  }

  function getApiUrl() {
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      ""
    );
  }

  async function saveHistory(params: {
    prompt: string;
    language: string;
    duration: number;
    watermark: string;
    videoUrl: string;
  }) {
    if (!user?.uid) {
      setSaveMessage("Video generated. Sign in to save history.");
      return;
    }

    await saveVideoHistory({
      uid: user.uid,
      prompt: params.prompt,
      language: params.language,
      duration: params.duration,
      watermark: params.watermark,
      videoUrl: params.videoUrl,
    });

    setSaveMessage("Video saved to history.");
  }

  async function handleGenerateText() {
    try {
      if (!prompt.trim()) {
        setError("Please enter a prompt.");
        return;
      }

      setLoading(true);
      resetMessages();

      const apiUrl = getApiUrl();

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
      console.log("TEXT API RESPONSE:", result);

      if (!response.ok) {
        throw new Error(result?.detail || "Failed to generate video.");
      }

      if (!result?.video_url) {
        throw new Error("No video returned from server.");
      }

      setVideoUrl(result.video_url);

      await saveHistory({
        prompt,
        language,
        duration: Number(duration),
        watermark,
        videoUrl: result.video_url,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong while generating the video.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateFromImage() {
    try {
      if (!selectedImage) {
        setError("Please choose an image first.");
        return;
      }

      setLoading(true);
      resetMessages();

      const apiUrl = getApiUrl();

      const formData = new FormData();
      formData.append("file", selectedImage);

      const response = await fetch(`${apiUrl}/generate-from-image`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("IMAGE API RESPONSE:", result);

      if (!response.ok) {
        throw new Error(result?.detail || "Failed to generate video from image.");
      }

      if (!result?.video_url) {
        throw new Error("No video returned from server.");
      }

      setVideoUrl(result.video_url);

      await saveHistory({
        prompt: selectedImage.name,
        language: "Image to Video",
        duration: 5,
        watermark,
        videoUrl: result.video_url,
      });
    } catch (err: any) {
      setError(
        err?.message || "Something went wrong while generating from image."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (mode === "text") {
      await handleGenerateText();
      return;
    }

    await handleGenerateFromImage();
  }

  return (
    <main
      style={{
        maxWidth: 1100,
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
          <h1 style={{ fontSize: 44, fontWeight: 800, margin: 0 }}>
            NaijaVid AI Generator
          </h1>
          <p style={{ color: "#b8b8b8", marginTop: 8 }}>
            Generate short videos from text or images.
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
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setMode("text")}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #444",
              cursor: "pointer",
              fontWeight: 700,
              opacity: mode === "text" ? 1 : 0.75,
            }}
          >
            Text to Video
          </button>

          <button
            type="button"
            onClick={() => setMode("image")}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #444",
              cursor: "pointer",
              fontWeight: 700,
              opacity: mode === "image" ? 1 : 0.75,
            }}
          >
            Image to Video
          </button>
        </div>

        {mode === "text" ? (
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
        ) : (
          <label>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Upload Image</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedImage(file);
              }}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
              }}
            />
            {selectedImage && (
              <div style={{ marginTop: 8, color: "#b8b8b8" }}>
                Selected: {selectedImage.name}
              </div>
            )}
          </label>
        )}

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
              disabled={mode === "image"}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
                opacity: mode === "image" ? 0.65 : 1,
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
              disabled={mode === "image"}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                background: "#000",
                color: "#fff",
                border: "1px solid #444",
                opacity: mode === "image" ? 0.65 : 1,
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
          disabled={
            loading || (mode === "text" ? !prompt.trim() : !selectedImage)
          }
          style={{
            padding: "18px",
            borderRadius: 14,
            border: "none",
            fontSize: 22,
            fontWeight: 800,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading
            ? "Generating..."
            : mode === "text"
            ? "Generate Video"
            : "Generate From Image"}
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
        <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 16 }}>
          Preview
        </h2>

        {!videoUrl && (
          <p style={{ color: "#a9a9a9" }}>
            Your generated video will appear here.
          </p>
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

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <a href={videoUrl} target="_blank" rel="noreferrer">
                Open video
              </a>
              <a href={videoUrl} download>
                Download video
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}