"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  canUserGenerate,
  incrementGenerationCount,
} from "@/lib/user-service";
import { saveVideoHistory } from "@/lib/video-history-service";

type BackendResult = {
  id?: string;
  status?: string;
  videoUrl?: string;
  error?: string;
  detail?: string;
  prompt?: string;
  language?: string;
  duration?: number;
};

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function GeneratorPage() {
  const { user, profile, loading, refreshProfile } = useAuth();

  const planName = profile?.plan || "FREE";
  const usedCount = profile?.generationCount || 0;
  const maxDuration = planName === "PRO" ? 10 : 5;

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("en");
  const [duration, setDuration] = useState(maxDuration);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rawResponse, setRawResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const planLimit = useMemo(() => {
    if (planName === "PRO") return "Unlimited";
    if (planName === "BASIC") return 30;
    return 5;
  }, [planName]);

  useEffect(() => {
    setDuration((prev) => Math.min(prev, maxDuration));
  }, [maxDuration]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setImageFile(file);
    setVideoUrl("");
    setError("");
    setMessage("");
    setRawResponse("");

    if (!file) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setError("Please sign in before generating a video.");
      setMessage("");
      return;
    }

    if (!imageFile) {
      setError("Please select an image first.");
      setMessage("");
      return;
    }

    if (duration > maxDuration) {
      setError(`Your ${planName} plan allows maximum ${maxDuration} seconds.`);
      setMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      setRawResponse("");
      setVideoUrl("");

      const permission = await canUserGenerate(user.uid);

      if (!permission.allowed) {
        throw new Error(permission.reason || "Generation limit reached.");
      }

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("prompt", prompt.trim());
      formData.append("language", language);
      formData.append("duration", String(duration));

      const response = await fetch(`${backendUrl}/generate`, {
        method: "POST",
        body: formData,
      });

      const data: BackendResult = await response.json();
      setRawResponse(JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data?.error || data?.detail || "Video generation failed.");
      }

      if (!data.videoUrl) {
        throw new Error("Backend did not return a video URL.");
      }

      setVideoUrl(data.videoUrl);

      await saveVideoHistory({
        userId: user.uid,
        prompt: prompt.trim(),
        videoUrl: data.videoUrl,
      });

      await incrementGenerationCount(user.uid);
      await refreshProfile();

      setMessage("Video generated and saved to your history.");
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err?.message || "Something went wrong.");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#03133d] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Video Generator</h1>
            <p className="mt-2 text-lg text-white/85">
              Upload an image, generate a video, and save it to your history.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-[#03133d]"
            >
              Home
            </Link>
            <Link
              href="/history"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white"
            >
              My Videos
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl md:p-8">
          <div className="mb-6 rounded-2xl border bg-slate-50 px-4 py-4 text-lg font-semibold">
            Plan: {planName}
            <span className="ml-4">Used: {usedCount}</span>
            <span className="ml-4">Limit: {String(planLimit)}</span>
          </div>

          {loading ? (
            <div className="mb-6 rounded-2xl bg-slate-100 px-4 py-4 text-slate-700">
              Loading profile...
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-2xl font-semibold">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want..."
                rows={5}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 text-lg outline-none transition focus:border-blue-500"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xl font-semibold">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg outline-none transition focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="yo">Yoruba</option>
                  <option value="ig">Igbo</option>
                  <option value="ha">Hausa</option>
                  <option value="pcm">Pidgin</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xl font-semibold">
                  Duration
                </label>
                <input
                  type="number"
                  min={3}
                  max={maxDuration}
                  value={duration}
                  onChange={(e) =>
                    setDuration(
                      Math.max(
                        3,
                        Math.min(Number(e.target.value || 3), maxDuration)
                      )
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg outline-none transition focus:border-blue-500"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Max duration: {maxDuration} seconds ({planName} plan)
                </p>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-2xl font-semibold">
                Select Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full rounded-2xl border border-slate-300 px-4 py-4 text-lg"
              />
            </div>

            {imagePreview ? (
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-[460px] w-full rounded-2xl object-contain"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || loading}
              className="rounded-2xl bg-blue-600 px-8 py-4 text-xl font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Generating video..." : "Generate Video"}
            </button>
          </form>

          {message ? (
            <div className="mt-6 rounded-2xl bg-green-100 px-4 py-4 text-lg font-semibold text-green-800">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-100 px-4 py-4 text-lg font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {rawResponse ? (
            <div className="mt-6">
              <h2 className="mb-3 text-2xl font-bold text-slate-900">
                Backend response
              </h2>
              <pre className="overflow-x-auto rounded-2xl bg-[#03133d] p-5 text-base text-green-400">
                {rawResponse}
              </pre>
            </div>
          ) : null}

          {videoUrl ? (
            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-bold text-slate-900">
                Generated Video
              </h2>

              <video
                controls
                className="w-full rounded-2xl border border-slate-300 bg-black"
                src={videoUrl}
              />

              <a
                href={videoUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-2xl bg-green-600 px-6 py-3 text-lg font-bold text-white"
              >
                Download Video
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}