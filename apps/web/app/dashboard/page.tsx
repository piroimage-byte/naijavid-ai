"use client";

import { FormEvent, useState } from "react";

type GenerateResponse = {
  success?: boolean;
  video_url?: string;
  output_url?: string;
  url?: string;
  error?: string;
};

export default function CreateVideoPage() {
  const [script, setScript] = useState("");
  const [duration, setDuration] = useState("5");
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setVideoUrl("");

    const trimmedScript = script.trim();

    if (!trimmedScript) {
      setError("Please enter a script.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: trimmedScript,
          duration: Number(duration),
        }),
      });

      const data: GenerateResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate video.");
      }

      const returnedUrl =
        data.video_url || data.output_url || data.url || "";

      if (!returnedUrl) {
        throw new Error("No video URL was returned by the server.");
      }

      setVideoUrl(returnedUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-4xl font-bold text-black">Create AI Video</h1>
        <p className="mt-3 text-base text-gray-600">
          Enter your script and generate a video output.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="script"
              className="mb-2 block text-lg font-semibold text-gray-900"
            >
              Video Script
            </label>
            <textarea
              id="script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Write the script for your video here..."
              rows={8}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-black outline-none transition focus:border-emerald-500"
            />
          </div>

          <div>
            <label
              htmlFor="duration"
              className="mb-2 block text-lg font-semibold text-gray-900"
            >
              Duration
            </label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-black outline-none transition focus:border-emerald-500"
            >
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Generating..." : "Generate Video"}
          </button>
        </form>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        ) : null}

        {videoUrl ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-gray-50 p-6">
            <h2 className="text-2xl font-bold text-black">Generated Video</h2>

            <video
              controls
              className="mt-4 w-full rounded-2xl bg-black"
              src={videoUrl}
            />

            <a
              href={videoUrl}
              download
              className="mt-4 inline-block rounded-2xl bg-black px-5 py-3 font-semibold text-white"
            >
              Download Video
            </a>
          </div>
        ) : null}
      </div>
    </main>
  );
}