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
  url?: string;
  videoUrl?: string;
  outputUrl?: string;
  downloadUrl?: string;
  message?: string;
  error?: string;
};

export default function GeneratorPage() {
  const router = useRouter();

  const { user, loading } = useAuth();

  const [plan, setPlan] = useState<UserPlan>("free");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<string>("inactive");
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

  /*
   * -------------------------------------------------------
   * LOAD USER PLAN FROM FIRESTORE
   * -------------------------------------------------------
   */

  useEffect(() => {
    let active = true;

    async function loadUserPlan() {
      if (loading) {
        return;
      }

      if (!user?.uid) {
        console.log("No authenticated Firebase user.");

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
          console.log("User document does not exist.");

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

        const firestorePlan: UserPlan =
          data.plan === "pro" ? "pro" : "free";

        const firestoreSubscription =
          typeof data.subscriptionStatus === "string"
            ? data.subscriptionStatus
            : "inactive";

        if (active) {
          setPlan(firestorePlan);
          setSubscriptionStatus(firestoreSubscription);
        }
      } catch (error) {
        console.error("PLAN READ ERROR:", error);

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

  /*
   * -------------------------------------------------------
   * PRO STATUS
   * -------------------------------------------------------
   */

  const isPro =
    plan === "pro" &&
    subscriptionStatus === "active";

  /*
   * -------------------------------------------------------
   * DURATION OPTIONS
   * -------------------------------------------------------
   */

  const durationOptions = useMemo(() => {
    if (isPro) {
      return [
        {
          label: "5 seconds",
          value: "5",
        },
        {
          label: "10 seconds",
          value: "10",
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

  /*
   * -------------------------------------------------------
   * FORM VALIDATION
   * -------------------------------------------------------
   */

  const canGenerate = useMemo(() => {
    if (!isPro) {
      return false;
    }

    if (mode === "text") {
      return prompt.trim().length > 0;
    }

    return imageFile !== null;
  }, [isPro, mode, prompt, imageFile]);

  /*
   * -------------------------------------------------------
   * IMAGE SELECT
   * -------------------------------------------------------
   */

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] || null;

    setImageFile(file);
    setVideoUrl("");
    setMessage("");
  }

  /*
   * -------------------------------------------------------
   * GENERATE VIDEO
   * -------------------------------------------------------
   */

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

    if (checkingPlan) {
      setMessage("Checking your subscription...");

      return;
    }

    /*
     * Recheck Firestore immediately before generation.
     * This prevents stale client state.
     */

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        setMessage(
          "Your account profile could not be found."
        );

        return;
      }

      const account = userSnapshot.data();

      const currentPlan = account.plan;
      const currentStatus =
        account.subscriptionStatus;

      if (
        currentPlan !== "pro" ||
        currentStatus !== "active"
      ) {
        setPlan("free");
        setSubscriptionStatus(
          currentStatus || "inactive"
        );

        setMessage(
          "You need an active Pro subscription to generate videos."
        );

        return;
      }
    } catch (error) {
      console.error(
        "Subscription verification error:",
        error
      );

      setMessage(
        "Unable to verify your subscription."
      );

      return;
    }

    if (mode === "text" && !prompt.trim()) {
      setMessage(
        "Please describe the video you want to generate."
      );

      return;
    }

    if (mode === "image" && !imageFile) {
      setMessage(
        "Please select an image first."
      );

      return;
    }

    setSubmitting(true);

    setMessage(
      mode === "text"
        ? "Generating your video..."
        : "Generating video from your image..."
    );

    try {
      /*
       * Use your deployed backend URL.
       *
       * Example:
       * NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
       */

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        "";

      if (!backendUrl) {
        throw new Error(
          "Backend URL is not configured."
        );
      }

      let response: Response;

      /*
       * ---------------------------------------------------
       * TEXT TO VIDEO
       * ---------------------------------------------------
       */

      if (mode === "text") {
        response = await fetch(
          `${backendUrl}/text-to-video`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              userId: user.uid,
              prompt: prompt.trim(),
              language,
              duration: Number(duration),
              watermark,
            }),
          }
        );
      }

      /*
       * ---------------------------------------------------
       * IMAGE TO VIDEO
       * ---------------------------------------------------
       */

      else {
        const formData = new FormData();

        formData.append(
          "userId",
          user.uid
        );

        formData.append(
          "duration",
          duration
        );

        formData.append(
          "language",
          language
        );

        formData.append(
          "watermark",
          watermark
        );

        if (prompt.trim()) {
          formData.append(
            "prompt",
            prompt.trim()
          );
        }

        if (imageFile) {
          formData.append(
            "image",
            imageFile
          );
        }

        response = await fetch(
          `${backendUrl}/image-to-video`,
          {
            method: "POST",
            body: formData,
          }
        );
      }

      /*
       * ---------------------------------------------------
       * READ RESPONSE
       * ---------------------------------------------------
       */

      let data: GenerateResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The video server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Video generation failed."
        );
      }

      const generatedVideo =
        data.videoUrl ||
        data.outputUrl ||
        data.downloadUrl ||
        data.url ||
        "";

      if (!generatedVideo) {
        setMessage(
          data.message ||
            "Generation completed, but no video URL was returned."
        );

        return;
      }

      setVideoUrl(generatedVideo);

      setMessage(
        "Video generated successfully."
      );
    } catch (error) {
      console.error(
        "Generation error:",
        error
      );

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Something went wrong while generating the video."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * -------------------------------------------------------
   * AUTH LOADING
   * -------------------------------------------------------
   */

  if (loading || checkingPlan) {
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

  /*
   * -------------------------------------------------------
   * NOT SIGNED IN
   * -------------------------------------------------------
   */

  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">

          <h1 className="text-3xl font-bold mb-4">
            Sign in required
          </h1>

          <p className="text-white/70 mb-6">
            Please sign in to use the NaijaVid AI
            generator.
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-white text-black px-6 py-3 font-semibold"
          >
            Return Home
          </button>

        </div>
      </main>
    );
  }

  /*
   * -------------------------------------------------------
   * MAIN UI
   * -------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-6xl mx-auto">

        {/* HEADER */}

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between mb-10">

          <div>

            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              NaijaVid AI Generator
            </h1>

            <p className="text-white/70 text-lg">
              Generate short videos from text or images.
            </p>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="rounded-full border border-white/20 bg-white/5 px-5 py-3">

              Current plan:{" "}

              <strong
                className={
                  isPro
                    ? "text-green-400"
                    : "text-white"
                }
              >
                {isPro ? "PRO" : "FREE"}
              </strong>

            </div>

            <button
              type="button"
              onClick={() =>
                router.push("/history")
              }
              className="rounded-full border border-white/20 px-5 py-3 font-semibold hover:bg-white/10"
            >
              View History
            </button>

          </div>

        </div>

        {/* FREE ACCOUNT NOTICE */}

        {!isPro && (

          <div className="mb-8 rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-7">

            <h2 className="text-2xl font-bold mb-3">
              Pro required
            </h2>

            <p className="text-white/75 mb-6">
              Video generation is locked to Pro
              users. Upgrade to unlock 5 to 10
              second generation and the premium
              workflow.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/pricing")
              }
              className="rounded-xl bg-white text-black px-6 py-3 font-semibold hover:bg-gray-200"
            >
              Upgrade to Pro
            </button>

          </div>

        )}

        {/* GENERATOR */}

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#07102e] to-[#17115f] p-6 md:p-8"
        >

          {/* MODE */}

          <div className="flex flex-wrap gap-4 mb-8">

            <button
              type="button"
              onClick={() => {
                setMode("text");
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

          {/* TEXT MODE */}

          {mode === "text" && (

            <div className="mb-8">

              <label className="block text-2xl font-bold mb-4">
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
                className="min-h-[190px] w-full resize-y rounded-2xl border border-white/10 bg-black/80 px-5 py-4 text-lg text-white outline-none focus:border-white/30"
              />

            </div>

          )}

          {/* IMAGE MODE */}

          {mode === "image" && (

            <div className="mb-8">

              <label className="block text-2xl font-bold mb-4">
                Upload Image
              </label>

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                className="block w-full rounded-2xl border border-white/10 bg-black/80 px-5 py-4 text-base text-white"
              />

              {imageFile && (

                <p className="mt-4 text-white/75 break-all">
                  Selected:{" "}
                  {imageFile.name}
                </p>

              )}

              <div className="mt-6">

                <label className="block text-lg font-semibold mb-3">
                  Motion Prompt
                </label>

                <textarea
                  value={prompt}
                  onChange={(event) =>
                    setPrompt(
                      event.target.value
                    )
                  }
                  placeholder="Optional: describe how the image should move"
                  className="min-h-[110px] w-full rounded-2xl border border-white/10 bg-black/80 px-5 py-4 text-white outline-none"
                />

              </div>

            </div>

          )}

          {/* SETTINGS */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            {/* LANGUAGE */}

            <div>

              <label className="block text-xl font-bold mb-3">
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

            {/* DURATION */}

            <div>

              <label className="block text-xl font-bold mb-3">
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

            {/* WATERMARK */}

            <div>

              <label className="block text-xl font-bold mb-3">
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

          {/* GENERATE BUTTON */}

          <button
            type="submit"
            disabled={
              submitting ||
              !canGenerate ||
              !isPro
            }
            className="w-full rounded-2xl bg-white py-5 text-xl md:text-2xl font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting
              ? "Generating Video..."
              : isPro
                ? "Generate Video"
                : "Upgrade to Pro to Generate"}
          </button>

          {/* STATUS */}

          {message && (

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">

              <p className="text-white/85">
                {message}
              </p>

            </div>

          )}

          {/* OUTPUT */}

          {videoUrl && (

            <div className="mt-8">

              <h2 className="text-2xl font-bold mb-4">
                Generated Video
              </h2>

              <video
                src={videoUrl}
                controls
                className="w-full rounded-2xl border border-white/10 bg-black"
              />

              <a
                href={videoUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black hover:bg-gray-200"
              >
                Download Video
              </a>

            </div>

          )}

        </form>

      </div>

    </main>
  );
}