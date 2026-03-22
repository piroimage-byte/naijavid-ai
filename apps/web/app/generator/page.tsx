"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useAuth } from "../../components/providers/auth-provider";
import { saveUserVideo } from "../../lib/video-history-service";

type BackendResult = {
  success?: boolean;
  id?: string;
  videoUrl?: string;
  error?: string;
  detail?: string;
  duration?: number;
};

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

export default function GeneratorPage() {
  const { user, loading } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return !!selectedFile && !!user && !submitting;
  }, [selectedFile, user, submitting]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setError("");
    setMessage("");
    setVideoUrl("");

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    const validTypes = ["image/png", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      setError("Only PNG and JPG images are allowed.");
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be 10MB or less.");
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setError("Please sign in first.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose an image.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("Generating video...");
      setVideoUrl("");

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(`${backendUrl}/generate`, {
        method: "POST",
        body: formData,
      });

      const result: BackendResult = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.detail || "Generation failed.");
      }

      if (!result.videoUrl) {
        throw new Error("No video URL returned from backend.");
      }

      setVideoUrl(result.videoUrl);
      setMessage("Video generated successfully.");

      await saveUserVideo({
        userId: user.uid,
        title: title.trim() || "Generated Video",
        videoUrl: result.videoUrl,
      });
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 text-4xl font-bold">Generate Video</h1>
        <p className="mb-8 text-white/70">
          Upload an image to create a short 10-second video.
        </p>

        {loading && <p className="mb-6">Checking account...</p>}

        {!loading && !user && (
          <div className="mb-6 rounded border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            You must sign in before generating videos.
          </div>
        )}

        {message && (
          <div className="mb-6 rounded border border-green-500/40 bg-green-500/10 p-4 text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded border border-red-500/40 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded border border-white/10 p-6"
        >
          <div className="mb-6">
            <label className="mb-2 block text-sm text-white/70">
              Video title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              className="w-full rounded border border-white/10 bg-transparent px-4 py-3 outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm text-white/70">
              Upload image
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleFileChange}
              className="block w-full text-sm"
            />
            <p className="mt-2 text-xs text-white/50">
              Accepted formats: JPG, PNG. Max size: 10MB.
            </p>
          </div>

          {previewUrl && (
            <div className="mb-6">
              <p className="mb-2 text-sm text-white/70">Preview</p>
              <img
                src={previewUrl}
                alt="Selected preview"
                className="max-h-80 rounded border border-white/10"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-white px-5 py-3 text-black disabled:opacity-50"
          >
            {submitting ? "Generating..." : "Generate Video"}
          </button>
        </form>

        {videoUrl && (
          <div className="mt-10 rounded border border-white/10 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Generated Video</h2>

            <video
              controls
              className="mb-4 w-full max-w-3xl rounded border border-white/10"
              src={videoUrl}
            />

            <div className="flex gap-4">
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-white px-4 py-2 text-black"
              >
                Open Video
              </a>

              <a
                href={videoUrl}
                download
                className="rounded border border-white/20 px-4 py-2"
              >
                Download Video
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}