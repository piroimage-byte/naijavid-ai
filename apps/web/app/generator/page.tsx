"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { saveVideoHistory } from "../../lib/video-history-service";
import {
  canGenerateVideo,
  getUserPlan,
  incrementDailyUsage,
  UserPlan,
} from "../lib/user-plan-service";

type GenerateResponse = {
  success?: boolean;
  jobId?: string;
  duration?: number;
  fps?: number;
  videoUrl?: string;
  filename?: string;
  detail?: string;
  error?: string;
};

function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  ).replace(/\/+$/, "");
}

function buildAbsoluteUrl(url: string, baseUrl: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!baseUrl) return url;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getUsageText(plan: UserPlan) {
  if (typeof window === "undefined") return "";

  if (plan === "pro") {
    return "Pro plan: unlimited daily generation.";
  }

  const limit = 3;
  const used = Number(localStorage.getItem("daily_usage") || "0");
  const remaining = Math.max(0, limit - used);
  return `Free plan: ${remaining} of ${limit} generations remaining today.`;
}

export default function GeneratorPage() {
  const { user, loading } = useAuth();

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);
  const [title, setTitle] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(24);
  const [videoUrl, setVideoUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [plan, setPlan] = useState<UserPlan>("free");
  const [usageText, setUsageText] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setPlan("free");
      setUsageText("");
      return;
    }

    const currentPlan = getUserPlan();
    setPlan(currentPlan);
    setUsageText(getUsageText(currentPlan));
  }, [user, loading]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setVideoUrl("");
    setFilename("");
    setSuccess("");
    setError("");

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setImageFile(null);
      setImagePreview("");
      setError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageFile(null);
      setImagePreview("");
      setError("Image size must be 10MB or less.");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setVideoUrl("");
    setFilename("");

    if (loading) {
      setError("Authentication is still loading. Please wait a moment.");
      return;
    }

    if (!user) {
      setError("You must sign in before generating videos.");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a video title.");
      return;
    }

    if (!imageFile) {
      setError("Please choose an image.");
      return;
    }

    if (!backendBaseUrl) {
      setError("Missing backend URL.");
      return;
    }

    const allowed = canGenerateVideo();
    if (!allowed) {
      setError("You have reached the free daily limit. Upgrade to Pro to continue.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("duration", String(duration));
      formData.append("fps", String(fps));
      formData.append("title", title.trim());

      const response = await fetch(`${backendBaseUrl}/generate`, {
        method: "POST",
        body: formData,
      });

      let data: GenerateResponse | null = null;
      try {
        data = (await response.json()) as GenerateResponse;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.error ||
          `Request failed with status ${response.status}.`;
        throw new Error(message);
      }

      const returnedUrl = data?.videoUrl || "";
      if (!returnedUrl) {
        throw new Error("Backend returned no video URL.");
      }

      const absoluteVideoUrl = buildAbsoluteUrl(returnedUrl, backendBaseUrl);

      setVideoUrl(absoluteVideoUrl);
      setFilename(data?.filename || "");
      setSuccess("Video generated successfully.");

      await saveVideoHistory({
        userId: user.uid,
        title: title.trim(),
        videoUrl: absoluteVideoUrl,
        filename: data?.filename || "",
        duration,
        fps,
        imageName: imageFile.name,
      });

      incrementDailyUsage();

      const updatedPlan = getUserPlan();
      setPlan(updatedPlan);
      setUsageText(getUsageText(updatedPlan));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Video generation failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Generate Video</h1>
          <p className="mt-3 text-base text-neutral-400">
            Upload an image to create a short AI video.
          </p>

          {user && usageText ? (
            <p className="mt-3 text-sm text-neutral-300">{usageText}</p>
          ) : null}

          {user && plan === "free" ? (
            <Link
              href="/pricing"
              className="mt-3 inline-block text-sm text-white underline"
            >
              Upgrade to Pro
            </Link>
          ) : null}
        </div>

        <Link
          href="/history"
          className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
        >
          View History
        </Link>
      </div>

      {!user && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/50 px-4 py-4 text-red-300">
          You must sign in before generating videos.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded border border-red-900 bg-red-950/50 px-4 py-4 text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded border border-green-900 bg-green-950/40 px-4 py-4 text-green-300">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Video title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter video title"
              className="w-full rounded border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Upload image
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full rounded border border-neutral-700 bg-black px-4 py-3 text-white file:mr-4 file:rounded file:border-0 file:bg-white file:px-3 file:py-2 file:text-black"
            />
            <p className="mt-2 text-sm text-neutral-500">
              Accepted formats: JPG, PNG, WEBP. Max size: 10MB.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Duration (seconds)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={duration}
              onChange={(event) =>
                setDuration(Number(event.target.value || 10))
              }
              className="w-full rounded border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              FPS
            </label>
            <input
              type="number"
              min={12}
              max={60}
              value={fps}
              onChange={(event) => setFps(Number(event.target.value || 24))}
              className="w-full rounded border border-neutral-700 bg-black px-4 py-3 text-white outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        {imagePreview && (
          <div className="mt-8">
            <p className="mb-3 text-sm font-medium text-neutral-300">Preview</p>
            <img
              src={imagePreview}
              alt="Selected preview"
              className="max-h-[420px] w-full rounded-xl border border-neutral-800 object-contain"
            />
          </div>
        )}

        <div className="mt-8">
          <button
            type="submit"
            disabled={submitting || !user}
            className="rounded bg-white px-6 py-3 font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Generate Video"}
          </button>
        </div>
      </form>

      {videoUrl && (
        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
          <h2 className="text-2xl font-semibold">Generated Video</h2>

          <div className="mt-4 overflow-hidden rounded-xl border border-neutral-800">
            <video
              src={videoUrl}
              controls
              className="w-full"
              preload="metadata"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={videoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded bg-white px-4 py-2 font-medium text-black"
            >
              Open Video
            </a>

            <a
              href={videoUrl}
              download={filename || `${title || "naijavid-video"}.mp4`}
              className="rounded border border-neutral-700 px-4 py-2 text-neutral-200"
            >
              Download Video
            </a>
          </div>
        </section>
      )}
    </main>
  );
}