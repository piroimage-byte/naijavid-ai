"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

type GenerationAccess = {
  allowed: boolean;
  plan: "free" | "pro";
  subscriptionStatus: "active" | "inactive";
  unlimited: boolean;
  usedToday: number;
  remaining: number | null;
  limit: number | null;
  subscriptionExpired?: boolean;
  subscriptionExpiresAt?: string | null;
};

type Mode = "text" | "image";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function normalizeAccess(data: any): GenerationAccess {
  const plan =
    data?.plan === "pro"
      ? "pro"
      : "free";

  const usedToday =
    Number(data?.usedToday ?? 0);

  const limit =
    plan === "pro"
      ? null
      : Number(
          data?.limit ??
            3
        );

  const remaining =
    limit === null
      ? null
      : Math.max(
          limit - usedToday,
          0
        );

  return {
    allowed:
      Boolean(data?.allowed),

    plan,

    subscriptionStatus:
      data?.subscriptionStatus === "active"
        ? "active"
        : "inactive",

    unlimited:
      Boolean(data?.unlimited),

    usedToday,

    remaining,

    limit,

    subscriptionExpired:
      Boolean(
        data?.subscriptionExpired
      ),

    subscriptionExpiresAt:
      data?.subscriptionExpiresAt ??
      null,
  };
}

export default function GeneratorPage() {
  const router = useRouter();

  // AUTH
  const [user, setUser] =
    useState<User | null>(
      null
    );

  const [
    authLoading,
    setAuthLoading,
  ] =
    useState(true);

  // GENERATOR
  const [mode, setMode] =
    useState<Mode>("text");

  const [prompt, setPrompt] =
    useState("");

  const [language, setLanguage] =
    useState("English");

  const [duration, setDuration] =
    useState(5);

  const [watermark, setWatermark] =
    useState("naijavid.ai");

  const [
    imageFile,
    setImageFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    imagePreview,
    setImagePreview,
  ] =
    useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // PLAN
  const [
    generationAccess,
    setGenerationAccess,
  ] =
    useState<GenerationAccess | null>(
      null
    );

  const [
    accessLoading,
    setAccessLoading,
  ] =
    useState(true);

  // --------------------------------------------------
  // AUTH CHECK
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (
          firebaseUser
        ) => {
          if (!firebaseUser) {
            setUser(null);
            setAuthLoading(false);
            router.replace(
              "/login"
            );
            return;
          }

          setUser(
            firebaseUser
          );

          setAuthLoading(
            false
          );
        }
      );

    return () =>
      unsubscribe();
  }, [router]);

  // --------------------------------------------------
  // LOAD ACCESS
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId =
      user.uid;

    async function loadAccess() {
      try {
        setAccessLoading(
          true
        );

        setError("");

        const response =
          await fetch(
            "/api/generation-access",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  {
                    userId,
                    action:
                      "check",
                  }
                ),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data?.error ||
              "Unable to check generation access."
          );
        }

        const access =
          normalizeAccess(
            data
          );

        setGenerationAccess(
          access
        );
      } catch (
        err: any
      ) {
        console.error(
          "GENERATION ACCESS ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load generation access."
        );
      } finally {
        setAccessLoading(
          false
        );
      }
    }

    loadAccess();
  }, [user]);

  // --------------------------------------------------
  // IMAGE UPLOAD
  // --------------------------------------------------

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      setImageFile(
        null
      );

      setImagePreview(
        ""
      );

      return;
    }

    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setImagePreview(
      previewUrl
    );
  }

  // --------------------------------------------------
  // ACCESS CHECK / INCREMENT
  // --------------------------------------------------

  async function updateGenerationAccess(
    action:
      | "check"
      | "increment"
  ): Promise<GenerationAccess> {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "You must sign in first."
      );
    }

    const response =
      await fetch(
        "/api/generation-access",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                userId:
                  currentUser.uid,

                action,
              }
            ),
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data?.error ||
          "Unable to check generation access."
      );
    }

    const updated =
      normalizeAccess(
        data
      );

    setGenerationAccess(
      updated
    );

    return updated;
  }

  // --------------------------------------------------
  // SAVE HISTORY
  // --------------------------------------------------

  async function saveVideoToHistory(
    generatedVideoUrl: string
  ) {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      return false;
    }

    try {
      const response =
        await fetch(
          "/api/save-video",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  userId:
                    currentUser.uid,

                  prompt,
                  mode,
                  language,
                  duration,

                  videoUrl:
                    generatedVideoUrl,

                  watermark,
                }
              ),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        console.error(
          "HISTORY SAVE ERROR:",
          data
        );

        return false;
      }

      return true;
    } catch (err) {
      console.error(
        "HISTORY SAVE ERROR:",
        err
      );

      return false;
    }
  }

  // --------------------------------------------------
  // TEXT TO VIDEO
  // --------------------------------------------------

  async function generateTextVideo() {
    const response =
      await fetch(
        `${BACKEND_URL}/text-to-video`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              {
                prompt,
                language,
                duration,
                watermark,
              }
            ),
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.error ||
          data?.message ||
          "Text-to-video generation failed."
      );
    }

    const generatedUrl =
      data?.videoUrl ||
      data?.video_url ||
      data?.url ||
      data?.output_url;

    if (!generatedUrl) {
      throw new Error(
        "Backend did not return a video URL."
      );
    }

    return generatedUrl;
  }

  // --------------------------------------------------
  // IMAGE TO VIDEO
  // --------------------------------------------------

  async function generateImageVideo() {
    if (!imageFile) {
      throw new Error(
        "Please select an image."
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      imageFile
    );

    formData.append(
      "prompt",
      prompt
    );

    formData.append(
      "language",
      language
    );

    formData.append(
      "duration",
      String(duration)
    );

    formData.append(
      "watermark",
      watermark
    );

    const response =
      await fetch(
        `${BACKEND_URL}/image-to-video`,
        {
          method:
            "POST",

          body:
            formData,
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.error ||
          data?.message ||
          "Image-to-video generation failed."
      );
    }

    const generatedUrl =
      data?.videoUrl ||
      data?.video_url ||
      data?.url ||
      data?.output_url;

    if (!generatedUrl) {
      throw new Error(
        "Backend did not return a video URL."
      );
    }

    return generatedUrl;
  }

  // --------------------------------------------------
  // GENERATE
  // --------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      router.push(
        "/login"
      );

      return;
    }

    if (!prompt.trim()) {
      setError(
        "A motion prompt is required."
      );

      return;
    }

    if (
      mode === "image" &&
      !imageFile
    ) {
      setError(
        "Please upload an image."
      );

      return;
    }

    try {
      setGenerating(
        true
      );

      setError("");

      setMessage(
        "Checking your plan..."
      );

      const access =
        await updateGenerationAccess(
          "check"
        );

      if (
        !access.allowed
      ) {
        setError(
          "You have reached your free daily limit. Upgrade to Founding Pro for unlimited generations."
        );

        setMessage("");

        return;
      }

      setMessage(
        "Generating video..."
      );

      const generatedUrl =
        mode === "text"
          ? await generateTextVideo()
          : await generateImageVideo();

      setVideoUrl(
        generatedUrl
      );

      // Free users only.
      // Count usage after successful generation.
      if (
        access.plan ===
        "free"
      ) {
        await updateGenerationAccess(
          "increment"
        );
      }

      setMessage(
        "Saving video to history..."
      );

      const saved =
        await saveVideoToHistory(
          generatedUrl
        );

      if (saved) {
        setMessage(
          "Video generated successfully and saved to history."
        );
      } else {
        setMessage(
          "Video generated successfully."
        );
      }
    } catch (
      err: any
    ) {
      console.error(
        "GENERATION ERROR:",
        err
      );

      setError(
        err?.message ||
          "Video generation failed."
      );

      setMessage(
        ""
      );
    } finally {
      setGenerating(
        false
      );
    }
  }

  // --------------------------------------------------
  // SIGN OUT
  // --------------------------------------------------

  async function handleSignOut() {
    try {
      await signOut(
        auth
      );

      router.replace(
        "/login"
      );
    } catch (err) {
      console.error(
        "SIGN OUT ERROR:",
        err
      );

      setError(
        "Unable to sign out."
      );
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (
    authLoading ||
    accessLoading
  ) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/60">
          Loading NaijaVid AI...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const isPro =
    generationAccess
      ?.plan === "pro" &&
    generationAccess
      ?.subscriptionStatus ===
      "active";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold">
              NaijaVid AI Generator
            </h1>

            <p className="text-white/70 text-lg mt-3">
              Generate short videos from text or images.
            </p>

            <p className="text-white/40 text-sm mt-2">
              Signed in as{" "}
              {user.displayName ||
                user.email ||
                "NaijaVid AI User"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="px-5 py-3 border border-white/20 rounded-full">
              Current plan:{" "}
              <strong
                className={
                  isPro
                    ? "text-green-400"
                    : "text-yellow-400"
                }
              >
                {isPro
                  ? "FOUNDING PRO"
                  : "FREE"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/history"
                )
              }
              className="px-5 py-3 border border-white/20 rounded-full font-semibold hover:bg-white/10"
            >
              View History
            </button>

            <button
              type="button"
              onClick={
                handleSignOut
              }
              className="px-5 py-3 border border-red-500/40 text-red-300 rounded-full font-semibold hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* PLAN */}

        {isPro ? (
          <section className="mb-8 rounded-3xl border border-green-500/40 bg-green-950/40 p-7">
            <h2 className="text-2xl font-bold text-green-400 mb-3">
              Founding Pro
            </h2>

            <p className="text-white/75">
              Unlimited generations during the introductory launch period,
              subject to fair use.
            </p>

            {generationAccess
              ?.subscriptionExpiresAt && (
              <p className="text-white/50 mt-3 text-sm">
                Subscription expires:{" "}
                {new Date(
                  generationAccess.subscriptionExpiresAt
                ).toLocaleString()}
              </p>
            )}
          </section>
        ) : (
          <section className="mb-8 rounded-3xl border border-blue-500/40 bg-blue-950/30 p-7">
            <h2 className="text-2xl font-bold mb-3">
              Free Plan
            </h2>

            <p className="mb-2">
              Daily usage:{" "}
              <strong>
                {generationAccess
                  ?.usedToday ??
                  0}
                {" / "}
                {generationAccess
                  ?.limit ??
                  3}
              </strong>
            </p>

            <p className="mb-6">
              Remaining today:{" "}
              <strong>
                {generationAccess
                  ?.remaining ??
                  3}
              </strong>
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200"
            >
              Upgrade to Founding Pro ₦5,000/month
            </button>
          </section>
        )}

        {/* GENERATOR */}

        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/70 to-indigo-950/70 p-6 md:p-8"
        >
          {/* MODE */}

          <div className="flex flex-wrap gap-4 mb-8">
            <button
              type="button"
              onClick={() =>
                setMode(
                  "text"
                )
              }
              className={`px-8 py-4 rounded-2xl font-semibold ${
                mode ===
                "text"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Text to Video
            </button>

            <button
              type="button"
              onClick={() =>
                setMode(
                  "image"
                )
              }
              className={`px-8 py-4 rounded-2xl font-semibold ${
                mode ===
                "image"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Image to Video
            </button>
          </div>

          {/* IMAGE */}

          {mode ===
            "image" && (
            <div className="mb-8">
              <label className="block text-xl font-bold mb-3">
                Upload Image
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
                className="block w-full rounded-xl border border-white/20 bg-black/40 p-4"
              />

              {imagePreview && (
                <img
                  src={
                    imagePreview
                  }
                  alt="Selected preview"
                  className="mt-4 max-h-80 rounded-xl border border-white/10"
                />
              )}
            </div>
          )}

          {/* PROMPT */}

          <div className="mb-8">
            <label className="block text-2xl font-bold mb-4">
              Prompt
            </label>

            <textarea
              value={
                prompt
              }
              onChange={(
                event
              ) =>
                setPrompt(
                  event.target
                    .value
                )
              }
              placeholder="Describe the video you want to generate"
              rows={7}
              className="w-full rounded-2xl border border-white/20 bg-black/70 px-5 py-5 text-white placeholder:text-white/40 outline-none focus:border-white/40"
            />
          </div>

          {/* SETTINGS */}

          <div className="grid md:grid-cols-3 gap-6 mb-8">

            {/* LANGUAGE */}

            <div>
              <label className="block text-xl font-bold mb-3">
                Language
              </label>

              <select
                value={
                  language
                }
                onChange={(
                  event
                ) =>
                  setLanguage(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-white/20 bg-black px-4 py-4"
              >
                <option value="English">
                  English
                </option>

                <option value="Yoruba">
                  Yoruba
                </option>

                <option value="Igbo">
                  Igbo
                </option>

                <option value="Hausa">
                  Hausa
                </option>

                <option value="Nigerian Pidgin">
                  Nigerian Pidgin
                </option>
              </select>
            </div>

            {/* DURATION */}

            <div>
              <label className="block text-xl font-bold mb-3">
                Duration
              </label>

              <select
                value={
                  duration
                }
                onChange={(
                  event
                ) =>
                  setDuration(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
                className="w-full rounded-xl border border-white/20 bg-black px-4 py-4"
              >
                <option value={5}>
                  5 seconds
                </option>

                <option value={8}>
                  8 seconds
                </option>
              </select>
            </div>

            {/* WATERMARK */}

            <div>
              <label className="block text-xl font-bold mb-3">
                Watermark
              </label>

              <input
                value={
                  watermark
                }
                onChange={(
                  event
                ) =>
                  setWatermark(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-white/20 bg-black px-4 py-4"
              />
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {/* MESSAGE */}

          {message && (
            <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4 text-white/80">
              {message}
            </div>
          )}

          {/* GENERATE */}

          <button
            type="submit"
            disabled={
              generating
            }
            className="w-full rounded-2xl bg-white px-6 py-5 text-xl font-bold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : "Generate Video"}
          </button>
        </form>

        {/* RESULT */}

        {videoUrl && (
          <section className="mt-10">
            <h2 className="text-3xl font-bold mb-5">
              Generated Video
            </h2>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <video
                src={
                  videoUrl
                }
                controls
                className="w-full rounded-2xl bg-black"
              />

              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href={
                    videoUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10"
                >
                  Open Video
                </a>

                <a
                  href={
                    videoUrl
                  }
                  download
                  className="px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200"
                >
                  Download
                </a>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/history"
                    )
                  }
                  className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10"
                >
                  View History
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}