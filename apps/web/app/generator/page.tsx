"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { generateVideo } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { saveVideo } from "@/lib/video-history-service";
import { getUserPlan, type UserPlan } from "@/lib/user-service";
import {
  canUseDuration,
  getMaxDurationByPlan,
  getPlanLabel,
} from "@/lib/generation-policy";

const LANGUAGES = ["English", "Pidgin", "Yoruba", "Igbo", "Hausa"];

export default function GeneratorPage() {
  const { user, loading } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState(5);
  const [watermark, setWatermark] = useState("naijavid.ai");

  const [plan, setPlan] = useState<UserPlan>("free");
  const [planLoading, setPlanLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    async function loadPlan() {
      if (!user?.uid) {
        setPlan("free");
        setPlanLoading(false);
        return;
      }

      try {
        const currentPlan = await getUserPlan(user.uid);
        setPlan(currentPlan);
      } catch {
        setPlan("free");
      } finally {
        setPlanLoading(false);
      }
    }

    loadPlan();
  }, [user]);

  useEffect(() => {
    const maxDuration = getMaxDurationByPlan(plan);
    if (duration > maxDuration) {
      setDuration(maxDuration);
    }
  }, [plan, duration]);

  async function handleGenerate() {
    setError("");
    setVideoUrl("");

    if (!user) {
      setError("Please log in first.");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }

    if (!canUseDuration(plan, duration)) {
      setError(
        plan === "free"
          ? "Free plan supports only 5-second videos. Upgrade to Pro for 10 seconds."
          : "Selected duration is not allowed for your plan."
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await generateVideo({
        prompt,
        duration,
        language,
        watermark,
      });

      if (!result.success) {
        setError(result.error || "Failed to generate video.");
        return;
      }

      if (!result.videoUrl) {
        setError("No video returned from server.");
        return;
      }

      setVideoUrl(result.videoUrl);

      await saveVideo({
        userId: user.uid,
        videoUrl: result.videoUrl,
        prompt,
        language,
        duration,
      });
    } catch {
      setError("Something went wrong while generating the video.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || planLoading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-3xl mx-auto">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">NaijaVid AI Generator</h1>
            <p className="text-sm text-gray-400 mt-2">
              Create short demo videos in Nigerian local language style.
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">Current Plan</div>
            <div className="text-lg font-semibold">{getPlanLabel(plan)}</div>
            {plan === "free" ? (
              <Link
                href="/pricing"
                className="inline-block mt-2 rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold"
              >
                Upgrade to Pro
              </Link>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <div>
            <label className="block mb-2 text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: A man sitting on a chair in his house"
              className="w-full h-36 rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 outline-none"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 outline-none"
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 outline-none"
              >
                <option value={5}>5 seconds</option>
                <option value={10} disabled={plan !== "pro"}>
                  10 seconds {plan !== "pro" ? "(Pro only)" : ""}
                </option>
              </select>
              {plan === "free" ? (
                <p className="text-xs text-amber-400 mt-2">
                  Free plan is limited to 5 seconds.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium">Watermark</label>
              <input
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-4 py-3 outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={submitting}
            className="w-full rounded-xl bg-white text-black font-semibold px-5 py-3 disabled:opacity-60"
          >
            {submitting ? "Generating..." : "Generate Video"}
          </button>

          {error ? (
            <div className="rounded-xl bg-red-950 border border-red-800 px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>

          {videoUrl ? (
            <div className="space-y-4">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl border border-zinc-700"
              />
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-xl bg-white text-black px-5 py-3 font-semibold"
              >
                Open Video
              </a>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Your generated video will appear here.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}