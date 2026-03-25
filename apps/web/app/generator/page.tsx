"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type Mode = "text" | "image";

type BackendSuccess = {
  success?: boolean;
  message?: string;
  video_url?: string;
};

type BackendError =
  | string
  | {
      detail?: unknown;
      error?: unknown;
      message?: unknown;
    };

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://naijavid-ai-new.onrender.com";

const LANGUAGE_OPTIONS = [
  "English",
  "Yoruba",
  "Igbo",
  "Hausa",
  "Pidgin",
];

const DURATION_OPTIONS = [5, 10, 15];

function extractErrorMessage(payload: unknown): string {
  if (!payload) return "Something went wrong.";

  if (typeof payload === "string") return payload;

  if (Array.isArray(payload)) {
    return payload.map(extractErrorMessage).join(", ");
  }

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }

    if (typeof obj.error === "string" && obj.error.trim()) {
      return obj.error;
    }

    if (obj.detail) {
      if (typeof obj.detail === "string") return obj.detail;
      if (Array.isArray(obj.detail)) {
        return obj.detail
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object") {
              const inner = item as Record<string, unknown>;
              if (typeof inner.msg === "string") return inner.msg;
              if (typeof inner.message === "string") return inner.message;
              if (typeof inner.detail === "string") return inner.detail;
            }
            return JSON.stringify(item);
          })
          .join(", ");
      }
      if (typeof obj.detail === "object") {
        return JSON.stringify(obj.detail);
      }
    }

    return JSON.stringify(obj);
  }

  return "Something went wrong.";
}

export default function GeneratorPage() {
  const [mode, setMode] = useState<Mode>("text");

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("5");
  const [watermark, setWatermark] = useState("naijavid.ai");

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [backendMessage, setBackendMessage] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const canGenerateText = useMemo(() => {
    return prompt.trim().length > 0 && !isGenerating;
  }, [prompt, isGenerating]);

  const canGenerateImage = useMemo(() => {
    return !!selectedImage && !isGenerating;
  }, [selectedImage, isGenerating]);

  function resetMessages() {
    setError("");
    setBackendMessage("");
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    resetMessages();
    setVideoUrl("");
    const file = event.target.files?.[0] || null;
    setSelectedImage(file);
  }

  async function parseBackendResponse(response: Response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return { detail: text };
  }

  async function handleGenerateText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setVideoUrl("");

    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${BACKEND_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          language: language.toLowerCase(),
          duration: Number(duration),
          watermark: watermark.trim(),
        }),
      });

      const data = (await parseBackendResponse(response)) as
        | BackendSuccess
        | BackendError;

      if (!response.ok) {
        throw new Error(extractErrorMessage(data));
      }

      const successData = data as BackendSuccess;

      if (!successData.video_url) {
        throw new Error("Backend did not return a video URL.");
      }

      setVideoUrl(successData.video_url);
      setBackendMessage(
        successData.message || "Video generated successfully."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : extractErrorMessage(err);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setVideoUrl("");

    if (!selectedImage) {
      setError("Please upload an image.");
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);
      formData.append(
        "prompt",
        prompt.trim() || "Generated from uploaded image"
      );
      formData.append("language", language.toLowerCase());
      formData.append("duration", duration);
      formData.append("watermark", watermark.trim());

      const response = await fetch(`${BACKEND_URL}/generate-from-image`, {
        method: "POST",
        body: formData,
      });

      const data = (await parseBackendResponse(response)) as
        | BackendSuccess
        | BackendError;

      if (!response.ok) {
        throw new Error(extractErrorMessage(data));
      }

      const successData = data as BackendSuccess;

      if (!successData.video_url) {
        throw new Error("Backend did not return a video URL.");
      }

      const fullVideoUrl = successData.video_url.startsWith("http")
  ? successData.video_url
  : `${BACKEND_URL}${successData.video_url}`

setVideoUrl(fullVideoUrl)
      setBackendMessage(
        successData.message || "Video generated successfully from image."
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : extractErrorMessage(err);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">
              NaijaVid AI Generator
            </h1>
            <p className="mt-4 text-xl text-white/80">
              Generate short videos from text or images.
            </p>
          </div>

          <Link
            href="/history"
            className="rounded-2xl border border-white/20 px-6 py-4 text-xl font-semibold transition hover:border-white/40 hover:bg-white/5"
          >
            View History
          </Link>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#0b0d1a] p-7 shadow-2xl">
          <div className="mb-8 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("text");
                resetMessages();
              }}
              className={`rounded-2xl px-7 py-4 text-xl font-semibold transition ${
                mode === "text"
                  ? "bg-white text-black"
                  : "border border-white/15 bg-transparent text-white hover:bg-white/5"
              }`}
            >
              Text to Video
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("image");
                resetMessages();
              }}
              className={`rounded-2xl px-7 py-4 text-xl font-semibold transition ${
                mode === "image"
                  ? "bg-white text-black"
                  : "border border-white/15 bg-transparent text-white hover:bg-white/5"
              }`}
            >
              Image to Video
            </button>
          </div>

          {mode === "text" ? (
            <form onSubmit={handleGenerateText} className="space-y-7">
              <div>
                <label className="mb-3 block text-2xl font-semibold">
                  Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate"
                  rows={5}
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option key={item} value={item} className="text-black">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  >
                    {DURATION_OPTIONS.map((item) => (
                      <option key={item} value={item} className="text-black">
                        {item} seconds
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Watermark
                  </label>
                  <input
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="naijavid.ai"
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canGenerateText}
                className="w-full rounded-2xl bg-white px-6 py-5 text-3xl font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Video"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleGenerateImage} className="space-y-7">
              <div>
                <label className="mb-3 block text-2xl font-semibold">
                  Upload Image
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="block w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-3 file:text-black"
                />
                {selectedImage ? (
                  <p className="mt-3 text-lg text-white/70">
                    Selected: {selectedImage.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-3 block text-2xl font-semibold">
                  Prompt
                </label>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Optional description for the uploaded image"
                  className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  >
                    {LANGUAGE_OPTIONS.map((item) => (
                      <option key={item} value={item} className="text-black">
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  >
                    {DURATION_OPTIONS.map((item) => (
                      <option key={item} value={item} className="text-black">
                        {item} seconds
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-2xl font-semibold">
                    Watermark
                  </label>
                  <input
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="naijavid.ai"
                    className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-xl outline-none transition focus:border-white/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!canGenerateImage}
                className="w-full rounded-2xl bg-white px-6 py-5 text-3xl font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate From Image"}
              </button>
            </form>
          )}

          {error ? (
            <div className="mt-7 rounded-2xl bg-red-800 px-5 py-4 text-xl font-medium text-white">
              {error}
            </div>
          ) : null}

          {backendMessage ? (
            <div className="mt-7 rounded-2xl bg-emerald-700/80 px-5 py-4 text-xl font-medium text-white">
              {backendMessage}
            </div>
          ) : null}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0b0d1a] p-7 shadow-2xl">
          <h2 className="text-4xl font-bold">Preview</h2>
          {!videoUrl ? (
            <p className="mt-5 text-xl text-white/70">
              Your generated video will appear here.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              <video
                key={videoUrl}
                controls
                className="w-full rounded-2xl border border-white/10 bg-black"
                src={videoUrl}
              />
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-2xl bg-white px-5 py-4 text-lg font-bold text-black"
              >
                Open Video
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}