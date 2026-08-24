"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { useAuth } from "@/components/providers/auth-provider";
import { db } from "@/lib/firebase";

type Mode = "text" | "image";
type UserPlan = "free" | "pro";

type GenerateResponse = {
  success?: boolean;
  message?: string;
  video_url?: string;
  duration?: number;
  detail?: string;
  error?: string;
};

type SaveHistoryResponse = {
  success?: boolean;
  message?: string;
  id?: string;
  error?: string;
};

type GenerationAccessResponse = {
  success?: boolean;
  allowed?: boolean;
  plan?: "free" | "pro";
  subscriptionStatus?: string;
  unlimited?: boolean;
  usedToday?: number;
  remaining?: number | null;
  limit?: number | null;
  error?: string;
};

export default function GeneratorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [plan, setPlan] =
    useState<UserPlan>("free");

  const [
    subscriptionStatus,
    setSubscriptionStatus,
  ] = useState("inactive");

  const [
    checkingPlan,
    setCheckingPlan,
  ] = useState(true);

  const [mode, setMode] =
    useState<Mode>("text");

  const [prompt, setPrompt] =
    useState("");

  const [language, setLanguage] =
    useState("English");

  const [duration, setDuration] =
    useState("5");

  const [watermark, setWatermark] =
    useState("naijavid.ai");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [videoUrl, setVideoUrl] =
    useState("");

  const [
    dailyUsed,
    setDailyUsed,
  ] = useState(0);

  const [
    dailyRemaining,
    setDailyRemaining,
  ] = useState<number | null>(3);

  const [
    checkingAccess,
    setCheckingAccess,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUserPlan() {
      if (loading) {
        return;
      }

      if (!user?.uid) {
        if (active) {
          setPlan("free");
          setSubscriptionStatus(
            "inactive"
          );
          setCheckingPlan(false);
        }

        return;
      }

      try {
        setCheckingPlan(true);

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        const userSnapshot =
          await getDoc(userRef);

        if (!userSnapshot.exists()) {
          if (active) {
            setPlan("free");
            setSubscriptionStatus(
              "inactive"
            );
          }

          return;
        }

        const data =
          userSnapshot.data();

        if (active) {
          setPlan(
            data.plan === "pro"
              ? "pro"
              : "free"
          );

          setSubscriptionStatus(
            data.subscriptionStatus ===
              "active"
              ? "active"
              : "inactive"
          );
        }
      } catch (error) {
        console.error(
          "PLAN READ ERROR:",
          error
        );

        if (active) {
          setPlan("free");
          setSubscriptionStatus(
            "inactive"
          );
        }
      } finally {
        if (active) {
          setCheckingPlan(false);
        }
      }
    }

    loadUserPlan();

    return () => {
      active = false;
    };
  }, [user, loading]);

  const isPro =
    plan === "pro" &&
    subscriptionStatus === "active";

  useEffect(() => {
    async function checkGenerationAccess() {
      if (!user?.uid) {
        return;
      }

      try {
        setCheckingAccess(true);

        const response = await fetch(
          "/api/generation-access",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              action: "check",
            }),
          }
        );

        const data: GenerationAccessResponse =
          await response.json();

        if (!response.ok) {
          console.error(
            "GENERATION ACCESS CHECK ERROR:",
            data
          );
          return;
        }

        if (data.unlimited) {
          setDailyUsed(0);
          setDailyRemaining(null);
        } else {
          setDailyUsed(
            Number(
              data.usedToday || 0
            )
          );

          setDailyRemaining(
            typeof data.remaining ===
              "number"
              ? data.remaining
              : 0
          );
        }
      } catch (error) {
        console.error(
          "GENERATION ACCESS REQUEST ERROR:",
          error
        );
      } finally {
        setCheckingAccess(false);
      }
    }

    checkGenerationAccess();
  }, [user, isPro]);

  const durationOptions =
    useMemo(() => {
      if (isPro) {
        return [
          {
            label: "5 seconds",
            value: "5",
          },
          {
            label: "8 seconds",
            value: "8",
          },
        ];
      }

      return [
        {
          label: "5 seconds",
          value: "5",
        },
      ];
    }, [isPro]);

  useEffect(() => {
    if (
      !isPro &&
      duration !== "5"
    ) {
      setDuration("5");
    }
  }, [isPro, duration]);

  const freeLimitReached =
    !isPro &&
    dailyRemaining !== null &&
    dailyRemaining <= 0;

  const canGenerate =
    useMemo(() => {
      if (freeLimitReached) {
        return false;
      }

      if (mode === "text") {
        return (
          prompt.trim().length >= 3
        );
      }

      return (
        imageFile !== null &&
        prompt.trim().length >= 3
      );
    }, [
      freeLimitReached,
      mode,
      prompt,
      imageFile,
    ]);

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ||
      null;

    setImageFile(selectedFile);

    setMessage("");
    setVideoUrl("");
  }

  async function saveVideoToHistory(
    generatedVideoUrl: string
  ) {
    if (!user?.uid) {
      return;
    }

    try {
      const saveResponse =
        await fetch(
          "/api/save-video",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              userId: user.uid,

              prompt:
                prompt.trim(),

              mode,

              language,

              duration:
                Number(duration),

              videoUrl:
                generatedVideoUrl,

              watermark:
                watermark.trim() ||
                "naijavid.ai",
            }),
          }
        );

      let saveData:
        SaveHistoryResponse;

      try {
        saveData =
          await saveResponse.json();
      } catch {
        console.error(
          "History API returned invalid JSON."
        );

        return;
      }

      if (!saveResponse.ok) {
        console.error(
          "HISTORY SAVE ERROR:",
          saveData
        );

        return;
      }

      console.log(
        "VIDEO SAVED TO HISTORY:",
        saveData
      );
    } catch (saveError) {
      console.error(
        "VIDEO HISTORY REQUEST ERROR:",
        saveError
      );
    }
  }

  async function incrementGenerationUsage() {
    if (!user?.uid || isPro) {
      return;
    }

    try {
      const response = await fetch(
        "/api/generation-access",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: user.uid,
            action: "increment",
          }),
        }
      );

      const data: GenerationAccessResponse =
        await response.json();

      if (!response.ok) {
        console.error(
          "GENERATION USAGE INCREMENT ERROR:",
          data
        );
        return;
      }

      setDailyUsed(
        Number(
          data.usedToday || 0
        )
      );

      setDailyRemaining(
        typeof data.remaining ===
          "number"
          ? data.remaining
          : 0
      );
    } catch (error) {
      console.error(
        "GENERATION USAGE REQUEST ERROR:",
        error
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setVideoUrl("");

    if (!user?.uid) {
      setMessage(
        "Please sign in before generating a video."
      );

      return;
    }

    if (freeLimitReached) {
      setMessage(
        "You have used all 3 free generations for today. Upgrade to Founding Pro for unlimited generations."
      );

      return;
    }

    if (
      prompt.trim().length < 3
    ) {
      setMessage(
        mode === "image"
          ? "Enter a motion prompt of at least 3 characters."
          : "Enter a prompt of at least 3 characters."
      );

      return;
    }

    if (
      mode === "image" &&
      !imageFile
    ) {
      setMessage(
        "Please select an image."
      );

      return;
    }

    setSubmitting(true);

    setMessage(
      mode === "text"
        ? "Generating your text video..."
        : "Generating video from your image..."
    );

    try {
      const accessResponse =
        await fetch(
          "/api/generation-access",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              userId: user.uid,
              action: "check",
            }),
          }
        );

      const accessData:
        GenerationAccessResponse =
        await accessResponse.json();

      if (!accessResponse.ok) {
        throw new Error(
          accessData.error ||
            "Unable to check generation access."
        );
      }

      if (
        !accessData.allowed &&
        !accessData.unlimited
      ) {
        setDailyRemaining(0);

        throw new Error(
          "You have used all 3 free generations for today. Upgrade to Founding Pro for unlimited generations."
        );
      }

      const rawBackendUrl =
        process.env
          .NEXT_PUBLIC_BACKEND_URL ||
        process.env
          .NEXT_PUBLIC_API_URL;

      if (!rawBackendUrl) {
        throw new Error(
          "Backend URL is not configured."
        );
      }

      const backendUrl =
        rawBackendUrl.replace(
          /\/+$/,
          ""
        );

      let response: Response;

      if (mode === "text") {
        response = await fetch(
          `${backendUrl}/generate`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              prompt:
                prompt.trim(),

              language,

              duration:
                Number(duration),

              watermark:
                watermark.trim() ||
                "naijavid.ai",
            }),
          }
        );
      } else {
        if (!imageFile) {
          throw new Error(
            "Please select an image."
          );
        }

        const formData =
          new FormData();

        formData.append(
          "image",
          imageFile
        );

        formData.append(
          "prompt",
          prompt.trim()
        );

        formData.append(
          "language",
          language
        );

        formData.append(
          "duration",
          duration
        );

        formData.append(
          "watermark",
          watermark.trim() ||
            "naijavid.ai"
        );

        response = await fetch(
          `${backendUrl}/generate-from-image`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      let data:
        GenerateResponse;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          `Backend returned an invalid response. HTTP ${response.status}.`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.error ||
            data.message ||
            `Video generation failed. HTTP ${response.status}.`
        );
      }

      const generatedVideoUrl =
        data.video_url;

      if (!generatedVideoUrl) {
        throw new Error(
          "Backend completed the request but did not return video_url."
        );
      }

      setVideoUrl(
        generatedVideoUrl
      );

      await saveVideoToHistory(
        generatedVideoUrl
      );

      await incrementGenerationUsage();

      setMessage(
        isPro
          ? "Video generated successfully and saved to history."
          : "Video generated successfully and saved to history. Your free daily usage has been updated."
      );
    } catch (error) {
      console.error(
        "Generation error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Video generation failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (
    loading ||
    checkingPlan
  ) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-3">
            NaijaVid AI
          </h1>

          <p className="text-white/60">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">

          <h1 className="text-3xl font-bold mb-4">
            Sign in required
          </h1>

          <p className="text-white/70 mb-6">
            Sign in to use NaijaVid AI.
          </p>

          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Return Home
          </button>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-5 py-10">

      <div className="mx-auto max-w-6xl">

        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">

          <div>
            <h1 className="mb-3 text-4xl font-bold md:text-5xl">
              NaijaVid AI Generator
            </h1>

            <p className="text-lg text-white/70">
              Generate short videos from text or images.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <div className="rounded-full border border-white/20 bg-white/5 px-5 py-3">

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
              className="rounded-full border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
            >
              View History
            </button>

          </div>

        </div>

        {!isPro && (
          <div className="mb-8 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-7">

            <h2 className="mb-3 text-2xl font-bold">
              Free Plan
            </h2>

            <p className="text-white/75">
              Daily usage:{" "}
              <strong>
                {dailyUsed} / 3
              </strong>
            </p>

            <p className="mt-2 text-white/75">
              Remaining today:{" "}
              <strong>
                {dailyRemaining ?? 0}
              </strong>
            </p>

            {freeLimitReached && (
              <p className="mt-4 text-yellow-300">
                You have reached today&apos;s free limit.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black"
            >
              Upgrade to Founding Pro
              {" "}
              ₦5,000/month
            </button>

          </div>
        )}

        {isPro && (
          <div className="mb-8 rounded-3xl border border-green-500/30 bg-green-500/10 p-6">

            <h2 className="text-xl font-bold text-green-400">
              Founding Pro
            </h2>

            <p className="mt-2 text-white/70">
              Unlimited generations during the introductory launch period, subject to fair use.
            </p>

          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#07102e] to-[#17115f] p-6 md:p-8"
        >

          <div className="mb-8 flex flex-wrap gap-4">

            <button
              type="button"
              onClick={() => {
                setMode("text");
                setPrompt("");
                setMessage("");
                setVideoUrl("");
              }}
              className={`rounded-2xl px-8 py-4 font-semibold transition ${
                mode === "text"
                  ? "bg-white text-black"
                  : "border border-white/20 bg-black/20 text-white"
              }`}
            >
              Text to Video
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("image");
                setPrompt("");
                setMessage("");
                setVideoUrl("");
              }}
              className={`rounded-2xl px-8 py-4 font-semibold transition ${
                mode === "image"
                  ? "bg-white text-black"
                  : "border border-white/20 bg-black/20 text-white"
              }`}
            >
              Image to Video
            </button>

          </div>

          {mode === "text" && (
            <div className="mb-8">

              <label className="mb-4 block text-2xl font-bold">
                Prompt
              </label>

              <textarea
                value={prompt}
                onChange={(event) =>
                  setPrompt(
                    event.target.value
                  )
                }
                placeholder="Describe the video you want to generate"
                className="min-h-[180px] w-full resize-y rounded-2xl border border-white/10 bg-black/80 px-5 py-4 text-lg text-white outline-none focus:border-white/40"
              />

            </div>
          )}

          {mode === "image" && (
            <div className="mb-8">

              <label className="mb-4 block text-2xl font-bold">
                Upload Image
              </label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={
                  handleImageChange
                }
                className="block w-full rounded-2xl border border-white/10 bg-black/80 px-5 py-4"
              />

              {imageFile && (
                <p className="mt-4 break-all text-white/75">
                  Selected:{" "}
                  {imageFile.name}
                </p>
              )}

              <div className="mt-7">

                <label className="mb-3 block text-xl font-bold">
                  Motion Prompt
                </label>

                <textarea
                  value={prompt}
                  onChange={(event) =>
                    setPrompt(
                      event.target.value
                    )
                  }
                  placeholder="Example: Slowly zoom toward the subject while the background moves naturally."
                  className="min-h-[120px] w-full resize-y rounded-2xl border border-white/10 bg-black/80 px-5 py-4 text-white outline-none focus:border-white/40"
                />

              </div>

            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">

            <div>
              <label className="mb-3 block text-xl font-bold">
                Language
              </label>

              <select
                value={language}
                onChange={(event) =>
                  setLanguage(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white"
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

                <option value="Pidgin">
                  Nigerian Pidgin
                </option>
              </select>
            </div>

            <div>
              <label className="mb-3 block text-xl font-bold">
                Duration
              </label>

              <select
                value={duration}
                onChange={(event) =>
                  setDuration(
                    event.target.value
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white"
              >
                {durationOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-3 block text-xl font-bold">
                Watermark
              </label>

              <input
                type="text"
                value={watermark}
                onChange={(event) =>
                  setWatermark(
                    event.target.value
                  )
                }
                placeholder="naijavid.ai"
                className="w-full rounded-2xl border border-white/10 bg-black px-5 py-4 text-white outline-none"
              />
            </div>

          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              checkingAccess ||
              !canGenerate
            }
            className="w-full rounded-2xl bg-white py-5 text-xl font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 md:text-2xl"
          >
            {submitting
              ? "Generating Video..."
              : freeLimitReached
                ? "Daily Free Limit Reached"
                : "Generate Video"}
          </button>

          {message && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-white/90">
                {message}
              </p>
            </div>
          )}

          {videoUrl && (
            <div className="mt-8">

              <h2 className="mb-4 text-2xl font-bold">
                Generated Video
              </h2>

              <video
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-2xl border border-white/10 bg-black"
              />

              <div className="mt-5 flex flex-wrap gap-4">

                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-gray-200"
                >
                  Open Video
                </a>

                <a
                  href={videoUrl}
                  download
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  Download Video
                </a>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/history"
                    )
                  }
                  className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
                >
                  View History
                </button>

              </div>

            </div>
          )}

        </form>

      </div>

    </main>
  );
}