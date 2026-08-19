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

export default function GeneratorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [plan, setPlan] = useState<UserPlan>("free");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState("inactive");
  const [checkingPlan, setCheckingPlan] = useState(true);

  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("5");
  const [watermark, setWatermark] = useState("naijavid.ai");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  // ----------------------------------------------------
  // LOAD USER PLAN
  // ----------------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadUserPlan() {
      if (loading) {
        return;
      }

      if (!user?.uid) {
        if (active) {
          setPlan("free");
          setSubscriptionStatus("inactive");
          setCheckingPlan(false);
        }

        return;
      }

      try {
        setCheckingPlan(true);

        console.log("AUTH UID:", user.uid);

        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          console.log("Firestore user document not found.");

          if (active) {
            setPlan("free");
            setSubscriptionStatus("inactive");
          }

          return;
        }

        const data = userSnapshot.data();

        console.log("FIRESTORE USER DATA:", data);
        console.log("PLAN FROM FIRESTORE:", data.plan);
        console.log(
          "SUBSCRIPTION STATUS:",
          data.subscriptionStatus
        );

        if (active) {
          setPlan(
            data.plan === "pro"
              ? "pro"
              : "free"
          );

          setSubscriptionStatus(
            data.subscriptionStatus === "active"
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
          setSubscriptionStatus("inactive");
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

  // ----------------------------------------------------
  // PRO STATUS
  // ----------------------------------------------------

  const isPro =
    plan === "pro" &&
    subscriptionStatus === "active";

  // ----------------------------------------------------
  // DURATION OPTIONS
  // ----------------------------------------------------

  const durationOptions = useMemo(() => {
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
    if (!isPro && duration !== "5") {
      setDuration("5");
    }
  }, [isPro, duration]);

  // ----------------------------------------------------
  // BUTTON VALIDATION
  // ----------------------------------------------------

  const canGenerate = useMemo(() => {
    if (!isPro) {
      return false;
    }

    if (mode === "text") {
      return prompt.trim().length >= 3;
    }

    return (
      imageFile !== null &&
      prompt.trim().length >= 3
    );
  }, [isPro, mode, prompt, imageFile]);

  // ----------------------------------------------------
  // IMAGE SELECT
  // ----------------------------------------------------

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    setImageFile(selectedFile);
    setMessage("");
    setVideoUrl("");
  }

  // ----------------------------------------------------
  // SAVE VIDEO TO HISTORY
  // ----------------------------------------------------

  async function saveVideoToHistory(
    generatedVideoUrl: string
  ) {
    if (!user?.uid) {
      return;
    }

    try {
      const saveResponse = await fetch(
        "/api/save-video",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            userId: user.uid,
            prompt: prompt.trim(),
            mode,
            language,
            duration: Number(duration),
            videoUrl: generatedVideoUrl,
            watermark:
              watermark.trim() ||
              "naijavid.ai",
          }),
        }
      );

      let saveData: SaveHistoryResponse;

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

  // ----------------------------------------------------
  // GENERATE VIDEO
  // ----------------------------------------------------

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

    if (!isPro) {
      setMessage(
        "An active Pro subscription is required."
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

      // ------------------------------------------------
      // TEXT TO VIDEO
      // POST /generate
      // ------------------------------------------------

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
      }

      // ------------------------------------------------
      // IMAGE TO VIDEO
      // POST /generate-from-image
      // ------------------------------------------------

      else {
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

      // ------------------------------------------------
      // READ GENERATION RESPONSE
      // ------------------------------------------------

      let data: GenerateResponse;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          `Backend returned an invalid response. HTTP ${response.status}.`
        );
      }

      console.log(
        "GENERATION RESPONSE:",
        data
      );

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

      // ------------------------------------------------
      // SHOW VIDEO
      // ------------------------------------------------

      setVideoUrl(
        generatedVideoUrl
      );

      // ------------------------------------------------
      // SAVE TO HISTORY
      // ------------------------------------------------

      await saveVideoToHistory(
        generatedVideoUrl
      );

      setMessage(
        "Video generated successfully and saved to history."
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

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // NOT SIGNED IN
  // ----------------------------------------------------

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

  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------

  return (
    <main className="min-h-screen bg-black text-white px-5 py-10">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

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
                  ? "PRO"
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

        {/* PRO NOTICE */}

        {!isPro && (

          <div className="mb-8 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-7">

            <h2 className="mb-3 text-2xl font-bold">
              Pro required
            </h2>

            <p className="mb-6 text-white/75">
              Video generation is available to active Pro users.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
            >
              Upgrade to Pro
            </button>

          </div>

        )}

        {/* GENERATOR FORM */}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#07102e] to-[#17115f] p-6 md:p-8"
        >

          {/* MODE */}

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

          {/* TEXT */}

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

          {/* IMAGE */}

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

                <p className="mt-2 text-sm text-white/50">
                  A motion prompt is required.
                </p>

              </div>

            </div>

          )}

          {/* SETTINGS */}

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

          {/* GENERATE */}

          <button
            type="submit"
            disabled={
              submitting ||
              !canGenerate ||
              !isPro
            }
            className="w-full rounded-2xl bg-white py-5 text-xl font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40 md:text-2xl"
          >

            {submitting
              ? "Generating Video..."
              : isPro
                ? "Generate Video"
                : "Upgrade to Pro to Generate"}

          </button>

          {/* MESSAGE */}

          {message && (

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">

              <p className="text-white/90">
                {message}
              </p>

            </div>

          )}

          {/* VIDEO */}

          {videoUrl && (

            <div className="mt-8">

              <h2 className="mb-4 text-2xl font-bold">
                Generated Video
              </h2>

              <video
                src={videoUrl}
                controls
                playsInline
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