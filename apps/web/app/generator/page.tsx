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

type VideoStyle =
  | "cinematic"
  | "church"
  | "news"
  | "business"
  | "social"
  | "storytelling"
  | "documentary";

const VIDEO_STYLES: Array<{
  value: VideoStyle;
  label: string;
  description: string;
}> = [
  {
    value: "cinematic",
    label: "Cinematic",
    description:
      "Film-like composition, natural depth, polished lighting and professional visual treatment.",
  },
  {
    value: "church",
    label: "Church / Ministry",
    description:
      "Reverent ministry atmosphere, dignified presentation and warm worship-event styling.",
  },
  {
    value: "news",
    label: "News",
    description:
      "Clear newsroom-style presentation, factual visual framing and professional broadcast feel.",
  },
  {
    value: "business",
    label: "Business",
    description:
      "Clean corporate presentation, confident composition and professional commercial styling.",
  },
  {
    value: "social",
    label: "Social Media",
    description:
      "Attention-grabbing creator-style presentation suited to short-form social content.",
  },
  {
    value: "storytelling",
    label: "Storytelling",
    description:
      "Emotion-led scene treatment, expressive pacing and narrative-focused composition.",
  },
  {
    value: "documentary",
    label: "Documentary",
    description:
      "Naturalistic, credible and observational visual treatment with restrained cinematic polish.",
  },
];

function buildStyledPrompt(
  prompt: string,
  style: VideoStyle
) {
  const cleanedPrompt = prompt.trim();

  const styleInstructions: Record<
    VideoStyle,
    string
  > = {
    cinematic:
      "Use cinematic composition, natural depth, polished lighting, realistic Nigerian or African visual context where relevant, professional camera framing, subtle motion and high-quality film-like presentation.",
    church:
      "Use a reverent church and ministry atmosphere, dignified presentation, warm natural stage or worship lighting, respectful Nigerian Christian setting where relevant, professional event composition and subtle cinematic motion.",
    news:
      "Use a professional news and broadcast presentation, clear visual hierarchy, credible newsroom-style framing, controlled movement, clean composition and factual documentary realism.",
    business:
      "Use a polished business and corporate presentation, clean professional composition, confident visual framing, modern commercial styling, restrained motion and realistic lighting.",
    social:
      "Use an engaging short-form social media presentation, strong visual focus, creator-friendly composition, energetic but natural movement, modern presentation and immediate visual clarity.",
    storytelling:
      "Use emotionally expressive storytelling, narrative-focused composition, natural character emphasis, cinematic scene progression, realistic lighting and visually meaningful movement.",
    documentary:
      "Use a realistic documentary treatment, natural lighting, observational composition, authentic environments, restrained camera movement and credible factual visual presentation.",
  };

  return `${cleanedPrompt}

Visual style instruction: ${styleInstructions[style]}`;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export default function GeneratorPage() {
  const router = useRouter();

  // AUTH
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // GENERATOR
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState(5);
  const [watermark, setWatermark] = useState("naijavid.ai");
  const [videoStyle, setVideoStyle] =
    useState<VideoStyle>("cinematic");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [videoUrl, setVideoUrl] = useState("");

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // PLAN
  const [generationAccess, setGenerationAccess] =
    useState<GenerationAccess | null>(null);

  const [accessLoading, setAccessLoading] = useState(true);

  // --------------------------------------------------
  // AUTH CHECK
  // --------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setAuthLoading(false);
          router.replace("/login");
          return;
        }

        setUser(firebaseUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, [router]);

  // --------------------------------------------------
  // LOAD PLAN / ACCESS
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      return;
    }

    // Capture UID outside nested async function.
    // This fixes the Vercel:
    // "'user' is possibly 'null'" TypeScript error.
    const userId = user.uid;

    async function loadAccess() {
      try {
        setAccessLoading(true);
        setError("");

        const response = await fetch(
          "/api/generation-access",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              userId,
              action: "check",
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to check generation access."
          );
        }

        const access: GenerationAccess = {
          allowed: Boolean(data.allowed),

          plan:
            data.plan === "pro"
              ? "pro"
              : "free",

          subscriptionStatus:
            data.subscriptionStatus === "active"
              ? "active"
              : "inactive",

          unlimited: Boolean(data.unlimited),

          usedToday: Number(data.usedToday || 0),

          remaining:
            data.remaining ?? null,

          limit:
            data.limit ?? null,

          subscriptionExpired:
            Boolean(data.subscriptionExpired),

          subscriptionExpiresAt:
            data.subscriptionExpiresAt ?? null,
        };

        setGenerationAccess(access);
      } catch (err: any) {
        console.error(
          "GENERATION ACCESS ERROR:",
          err
        );

        setError(
          err?.message ||
            "Unable to load generation access."
        );
      } finally {
        setAccessLoading(false);
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
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  // --------------------------------------------------
  // GENERATION ACCESS
  // --------------------------------------------------

  async function updateGenerationAccess(
    action: "check" | "increment"
  ): Promise<GenerationAccess> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error(
        "You must sign in first."
      );
    }

    const response = await fetch(
      "/api/generation-access",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: currentUser.uid,
          action,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
          "Unable to check generation access."
      );
    }

    const updated: GenerationAccess = {
      allowed: Boolean(data.allowed),

      plan:
        data.plan === "pro"
          ? "pro"
          : "free",

      subscriptionStatus:
        data.subscriptionStatus === "active"
          ? "active"
          : "inactive",

      unlimited: Boolean(data.unlimited),

      usedToday: Number(data.usedToday || 0),

      remaining:
        data.remaining ?? null,

      limit:
        data.limit ?? null,

      subscriptionExpired:
        Boolean(data.subscriptionExpired),

      subscriptionExpiresAt:
        data.subscriptionExpiresAt ?? null,
    };

    setGenerationAccess(updated);

    return updated;
  }

  // --------------------------------------------------
  // SAVE VIDEO HISTORY
  // --------------------------------------------------

  async function saveVideoToHistory(
    generatedVideoUrl: string
  ) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return false;
    }

    try {
      const response = await fetch(
        "/api/save-video",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            userId: currentUser.uid,
            prompt,
            mode,
            language,
            duration,
            videoUrl: generatedVideoUrl,
            watermark,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
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
    const response = await fetch(
      `${BACKEND_URL}/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          prompt: buildStyledPrompt(
            prompt,
            videoStyle
          ),
          language,
          duration,
          watermark,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.error ||
          data?.message ||
          "Text-to-video generation failed."
      );
    }

    const generatedUrl =
      data.videoUrl ||
      data.video_url ||
      data.url ||
      data.output_url;

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

    const formData = new FormData();

    formData.append(
      "image",
      imageFile
    );

    formData.append(
      "prompt",
      buildStyledPrompt(
        prompt,
        videoStyle
      )
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

    const response = await fetch(
      `${BACKEND_URL}/generate-from-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.error ||
          data?.message ||
          "Image-to-video generation failed."
      );
    }

    const generatedUrl =
      data.videoUrl ||
      data.video_url ||
      data.url ||
      data.output_url;

    if (!generatedUrl) {
      throw new Error(
        "Backend did not return a video URL."
      );
    }

    return generatedUrl;
  }

  // --------------------------------------------------
  // GENERATE VIDEO
  // --------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      router.push("/login");
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
      setGenerating(true);
      setError("");
      setMessage(
        "Checking your plan..."
      );

      const access =
        await updateGenerationAccess(
          "check"
        );

      if (!access.allowed) {
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

      // Only count usage for Free users.
      if (
        access.plan === "free"
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
    } catch (err: any) {
      console.error(
        "GENERATION ERROR:",
        err
      );

      setError(
        err?.message ||
          "Video generation failed."
      );

      setMessage("");
    } finally {
      setGenerating(false);
    }
  }

  // --------------------------------------------------
  // SIGN OUT
  // --------------------------------------------------

  async function handleSignOut() {
    try {
      await signOut(auth);

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
    generationAccess?.plan === "pro" &&
    generationAccess?.subscriptionStatus ===
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

            {generationAccess?.subscriptionExpiresAt && (
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
                {generationAccess?.usedToday ?? 0}
                {" / "}
                {generationAccess?.limit ?? 3}
              </strong>
            </p>

            <p className="mb-6">
              Remaining today:{" "}
              <strong>
                {generationAccess?.remaining ?? 0}
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
                setMode("text")
              }
              className={`px-8 py-4 rounded-2xl font-semibold ${
                mode === "text"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Text to Video
            </button>

            <button
              type="button"
              onClick={() =>
                setMode("image")
              }
              className={`px-8 py-4 rounded-2xl font-semibold ${
                mode === "image"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Image to Video
            </button>
          </div>

          {/* IMAGE UPLOAD */}

          {mode === "image" && (
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
                  event.target.value
                )
              }
              placeholder="Describe the video you want to generate"
              rows={7}
              className="w-full rounded-2xl border border-white/20 bg-black/70 px-5 py-5 text-white placeholder:text-white/40 outline-none focus:border-white/40"
            />
          </div>

          {/* VIDEO STYLE */}

          <div className="mb-8">
            <label className="block text-2xl font-bold mb-4">
              Video Style
            </label>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {VIDEO_STYLES.map(
                (styleOption) => {
                  const selected =
                    videoStyle ===
                    styleOption.value;

                  return (
                    <button
                      key={
                        styleOption.value
                      }
                      type="button"
                      onClick={() =>
                        setVideoStyle(
                          styleOption.value
                        )
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-white bg-white text-black"
                          : "border-white/15 bg-black/30 text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="font-bold">
                        {styleOption.label}
                      </div>

                      <div
                        className={`mt-2 text-sm leading-5 ${
                          selected
                            ? "text-black/70"
                            : "text-white/55"
                        }`}
                      >
                        {
                          styleOption.description
                        }
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <p className="mt-3 text-sm text-white/45">
              NaijaVid automatically enhances your prompt using the selected visual style. Your original prompt is still kept in Video History.
            </p>
          </div>

          {/* SETTINGS */}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-xl font-bold mb-3">
                Language
              </label>

              <select
                value={language}
                onChange={(
                  event
                ) =>
                  setLanguage(
                    event.target.value
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

            <div>
              <label className="block text-xl font-bold mb-3">
                Duration
              </label>

              <select
                value={duration}
                onChange={(
                  event
                ) =>
                  setDuration(
                    Number(
                      event.target.value
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

            <div>
              <label className="block text-xl font-bold mb-3">
                Watermark
              </label>

              <input
                value={watermark}
                onChange={(
                  event
                ) =>
                  setWatermark(
                    event.target.value
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

          {/* STATUS */}

          {message && (
            <div className="mb-6 rounded-xl border border-white/10 bg-black/30 p-4 text-white/80">
              {message}
            </div>
          )}

          {/* GENERATE BUTTON */}

          <button
            type="submit"
            disabled={generating}
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
                src={videoUrl}
                controls
                className="w-full rounded-2xl bg-black"
              />

              <div className="flex flex-wrap gap-3 mt-5">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10"
                >
                  Open Video
                </a>

                <a
                  href={videoUrl}
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