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
  requiresPro?: boolean;
  restrictionReason?: string | null;
};

type Mode = "text" | "image" | "multi";
type AspectRatio = "16:9" | "9:16" | "1:1";
type CameraMotion =
  | "cinematic"
  | "zoom_in"
  | "pan_left"
  | "pan_right"
  | "static";

type CaptionStyle = "clean" | "bold" | "subtitle";
type CaptionPosition = "top" | "center" | "bottom";

type WatermarkPosition =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right";


const CAPTION_STYLES: Array<{
  value: CaptionStyle;
  label: string;
  description: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    description: "Balanced caption panel for general videos",
  },
  {
    value: "bold",
    label: "Bold",
    description: "Larger text for social and promotional videos",
  },
  {
    value: "subtitle",
    label: "Subtitle",
    description: "Compact subtitle-style presentation",
  },
];


const CAMERA_MOTIONS: Array<{
  value: CameraMotion;
  label: string;
  description: string;
}> = [
  { value: "cinematic", label: "Cinematic", description: "Push-in with gentle camera drift" },
  { value: "zoom_in", label: "Zoom In", description: "Smooth centred push toward the subject" },
  { value: "pan_left", label: "Pan Left", description: "Slow movement from right to left" },
  { value: "pan_right", label: "Pan Right", description: "Slow movement from left to right" },
  { value: "static", label: "Static", description: "No camera movement" },
];


const ASPECT_RATIOS: Array<{
  value: AspectRatio;
  label: string;
  description: string;
}> = [
  { value: "16:9", label: "16:9 Landscape", description: "YouTube, websites and presentations" },
  { value: "9:16", label: "9:16 Portrait", description: "TikTok, Reels, Shorts and WhatsApp Status" },
  { value: "1:1", label: "1:1 Square", description: "Instagram and Facebook posts" },
];

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

type BackgroundMusic =
  | "none"
  | "worship"
  | "cinematic"
  | "corporate"
  | "documentary"
  | "emotional"
  | "upbeat";

const BACKGROUND_MUSIC_OPTIONS: Array<{
  value: BackgroundMusic;
  label: string;
  description: string;
}> = [
  { value: "none", label: "None", description: "Narration only" },
  { value: "worship", label: "Worship / Inspirational", description: "Warm ministry and inspirational mood" },
  { value: "cinematic", label: "Cinematic", description: "Film-like atmospheric underscore" },
  { value: "corporate", label: "Corporate", description: "Clean professional business mood" },
  { value: "documentary", label: "Documentary", description: "Subtle factual background atmosphere" },
  { value: "emotional", label: "Emotional", description: "Gentle reflective underscore" },
  { value: "upbeat", label: "Upbeat / Social", description: "Energetic short-form social feel" },
];

type SceneTransition =
  | "none"
  | "fade"
  | "crossfade"
  | "slide_left"
  | "slide_right"
  | "zoom";

const SCENE_TRANSITIONS: Array<{
  value: SceneTransition;
  label: string;
  description: string;
}> = [
  { value: "none", label: "None", description: "Direct cut between images" },
  { value: "fade", label: "Fade", description: "Fade briefly through black" },
  { value: "crossfade", label: "Crossfade", description: "Smooth blend from one image to the next" },
  { value: "slide_left", label: "Slide Left", description: "Next scene slides in from the right" },
  { value: "slide_right", label: "Slide Right", description: "Next scene slides in from the left" },
  { value: "zoom", label: "Zoom", description: "Zoom-style reveal between scenes" },
];

type VideoTemplateId =
  | "church_announcement"
  | "sermon_highlight"
  | "christian_inspirational"
  | "business_promotion"
  | "news_update"
  | "social_media_reel"
  | "storytelling";

type VideoTemplate = {
  id: VideoTemplateId;
  label: string;
  description: string;
  videoStyle: VideoStyle;
  aspectRatio: AspectRatio;
  cameraMotion: CameraMotion;
  captionStyle: CaptionStyle;
  captionPosition: CaptionPosition;
  sceneTransition: SceneTransition;
  backgroundMusic: BackgroundMusic;
  musicVolume: number;
};

const VIDEO_TEMPLATES: VideoTemplate[] = [
  {
    id: "church_announcement",
    label: "Church Announcement",
    description: "Clear ministry announcement for services, programmes and events.",
    videoStyle: "church",
    aspectRatio: "9:16",
    cameraMotion: "cinematic",
    captionStyle: "bold",
    captionPosition: "bottom",
    sceneTransition: "crossfade",
    backgroundMusic: "worship",
    musicVolume: 10,
  },
  {
    id: "sermon_highlight",
    label: "Sermon Highlight",
    description: "Focused presentation for sermon excerpts, quotes and key teaching moments.",
    videoStyle: "church",
    aspectRatio: "9:16",
    cameraMotion: "zoom_in",
    captionStyle: "subtitle",
    captionPosition: "bottom",
    sceneTransition: "fade",
    backgroundMusic: "worship",
    musicVolume: 10,
  },
  {
    id: "christian_inspirational",
    label: "Christian Inspirational",
    description: "Warm faith-based presentation for encouragement and devotional content.",
    videoStyle: "cinematic",
    aspectRatio: "9:16",
    cameraMotion: "cinematic",
    captionStyle: "clean",
    captionPosition: "center",
    sceneTransition: "crossfade",
    backgroundMusic: "emotional",
    musicVolume: 10,
  },
  {
    id: "business_promotion",
    label: "Business Promotion",
    description: "Professional promotional treatment for products, services and brands.",
    videoStyle: "business",
    aspectRatio: "1:1",
    cameraMotion: "zoom_in",
    captionStyle: "bold",
    captionPosition: "bottom",
    sceneTransition: "slide_left",
    backgroundMusic: "corporate",
    musicVolume: 15,
  },
  {
    id: "news_update",
    label: "News Update",
    description: "Clean broadcast-style setup for reports, updates and factual information.",
    videoStyle: "news",
    aspectRatio: "16:9",
    cameraMotion: "static",
    captionStyle: "subtitle",
    captionPosition: "bottom",
    sceneTransition: "fade",
    backgroundMusic: "documentary",
    musicVolume: 5,
  },
  {
    id: "social_media_reel",
    label: "Social Media Reel",
    description: "Vertical short-form setup for Reels, Shorts, TikTok and WhatsApp Status.",
    videoStyle: "social",
    aspectRatio: "9:16",
    cameraMotion: "zoom_in",
    captionStyle: "bold",
    captionPosition: "center",
    sceneTransition: "zoom",
    backgroundMusic: "upbeat",
    musicVolume: 15,
  },
  {
    id: "storytelling",
    label: "Storytelling",
    description: "Narrative-focused treatment for emotional stories and multi-scene videos.",
    videoStyle: "storytelling",
    aspectRatio: "16:9",
    cameraMotion: "cinematic",
    captionStyle: "clean",
    captionPosition: "bottom",
    sceneTransition: "crossfade",
    backgroundMusic: "cinematic",
    musicVolume: 10,
  },
];

const FREE_VIDEO_STYLES: VideoStyle[] = [
  "cinematic",
  "church",
  "social",
];

const FREE_CAMERA_MOTIONS: CameraMotion[] = [
  "cinematic",
  "static",
];

function hasActivePro(
  access: GenerationAccess | null
) {
  return (
    access?.plan === "pro" &&
    access?.subscriptionStatus === "active"
  );
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
  const [aspectRatio, setAspectRatio] =
    useState<AspectRatio>("16:9");
  const [cameraMotion, setCameraMotion] =
    useState<CameraMotion>("cinematic");
  const [showCaption, setShowCaption] =
    useState(true);
  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>("clean");
  const [captionPosition, setCaptionPosition] =
    useState<CaptionPosition>("bottom");
  const [showWatermark, setShowWatermark] =
    useState(true);
  const [watermarkPosition, setWatermarkPosition] =
    useState<WatermarkPosition>("bottom_right");
  const [watermarkOpacity, setWatermarkOpacity] =
    useState(70);
  const [backgroundMusic, setBackgroundMusic] =
    useState<BackgroundMusic>("none");
  const [musicVolume, setMusicVolume] =
    useState(15);
  const [sceneTransition, setSceneTransition] =
    useState<SceneTransition>("crossfade");
  const [showPreview, setShowPreview] =
    useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<VideoTemplateId | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [multiImageFiles, setMultiImageFiles] = useState<File[]>([]);
  const [multiImagePreviews, setMultiImagePreviews] = useState<string[]>([]);
  const [scenePrompts, setScenePrompts] = useState<string[]>([]);
  const [sceneDurations, setSceneDurations] = useState<number[]>([]);

  const multiSceneTotalDuration = sceneDurations.reduce(
    (total, seconds) => total + Number(seconds || 0),
    0
  );

  const [videoUrl, setVideoUrl] = useState("");

  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);

  const GENERATION_STAGES = [
    "Preparing",
    "Checking access",
    "Processing media",
    "Rendering & uploading",
    "Saving to history",
    "Complete",
  ] as const;

  function updateProgress(step: number, percent: number, status: string) {
    setProgressStep(step);
    setProgressPercent(percent);
    setMessage(status);
  }

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
  // REUSE SETTINGS FROM VIDEO HISTORY
  // --------------------------------------------------

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("reuse") !== "1") {
      return;
    }

    const parseBoolean = (value: string | null, fallback: boolean) => {
      if (value === null) return fallback;
      return value === "true";
    };

    const parsedMode = searchParams.get("mode");
    if (parsedMode === "text" || parsedMode === "image" || parsedMode === "multi") {
      setMode(parsedMode);
    }

    const savedPrompt = searchParams.get("prompt");
    if (savedPrompt !== null) setPrompt(savedPrompt);

    const savedLanguage = searchParams.get("language");
    if (savedLanguage) setLanguage(savedLanguage);

    const savedDuration = Number(searchParams.get("duration"));
    if (Number.isFinite(savedDuration) && savedDuration > 0) {
      setDuration(Math.min(savedDuration, 60));
    }

    const savedWatermark = searchParams.get("watermark");
    if (savedWatermark !== null) setWatermark(savedWatermark);

    const savedAspectRatio = searchParams.get("aspectRatio");
    if (
      savedAspectRatio === "16:9" ||
      savedAspectRatio === "9:16" ||
      savedAspectRatio === "1:1"
    ) {
      setAspectRatio(savedAspectRatio);
    }

    const savedCameraMotion = searchParams.get("cameraMotion");
    if (
      savedCameraMotion === "cinematic" ||
      savedCameraMotion === "zoom_in" ||
      savedCameraMotion === "pan_left" ||
      savedCameraMotion === "pan_right" ||
      savedCameraMotion === "static"
    ) {
      setCameraMotion(savedCameraMotion);
    }

    setShowCaption(
      parseBoolean(searchParams.get("showCaption"), true)
    );

    const savedCaptionStyle = searchParams.get("captionStyle");
    if (
      savedCaptionStyle === "clean" ||
      savedCaptionStyle === "bold" ||
      savedCaptionStyle === "subtitle"
    ) {
      setCaptionStyle(savedCaptionStyle);
    }

    const savedCaptionPosition = searchParams.get("captionPosition");
    if (
      savedCaptionPosition === "top" ||
      savedCaptionPosition === "center" ||
      savedCaptionPosition === "bottom"
    ) {
      setCaptionPosition(savedCaptionPosition);
    }

    setShowWatermark(
      parseBoolean(searchParams.get("showWatermark"), true)
    );

    const savedWatermarkPosition = searchParams.get("watermarkPosition");
    if (
      savedWatermarkPosition === "top_left" ||
      savedWatermarkPosition === "top_right" ||
      savedWatermarkPosition === "bottom_left" ||
      savedWatermarkPosition === "bottom_right"
    ) {
      setWatermarkPosition(savedWatermarkPosition);
    }

    const savedWatermarkOpacity = Number(searchParams.get("watermarkOpacity"));
    if (Number.isFinite(savedWatermarkOpacity) && savedWatermarkOpacity >= 0) {
      setWatermarkOpacity(Math.min(100, savedWatermarkOpacity));
    }

    const savedBackgroundMusic = searchParams.get("backgroundMusic");
    if (
      savedBackgroundMusic === "none" ||
      savedBackgroundMusic === "worship" ||
      savedBackgroundMusic === "cinematic" ||
      savedBackgroundMusic === "corporate" ||
      savedBackgroundMusic === "documentary" ||
      savedBackgroundMusic === "emotional" ||
      savedBackgroundMusic === "upbeat"
    ) {
      setBackgroundMusic(savedBackgroundMusic);
    }

    const savedMusicVolume = Number(searchParams.get("musicVolume"));
    if (Number.isFinite(savedMusicVolume) && savedMusicVolume >= 0) {
      setMusicVolume(Math.min(30, savedMusicVolume));
    }

    const savedTransition = searchParams.get("sceneTransition");
    if (
      savedTransition === "none" ||
      savedTransition === "fade" ||
      savedTransition === "crossfade" ||
      savedTransition === "slide_left" ||
      savedTransition === "slide_right" ||
      savedTransition === "zoom"
    ) {
      setSceneTransition(savedTransition);
    }

    setSelectedTemplate(null);
    setVideoUrl("");
    setShowPreview(false);
    setError("");
    setMessage(
      parsedMode === "image" || parsedMode === "multi"
        ? "Saved settings loaded. Please upload the image file(s) again before generating."
        : "Saved settings loaded from Video History."
    );
  }, []);

  // --------------------------------------------------
  // LOAD PLAN / ACCESS
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      return;
    }

    const currentUser = user;

    async function loadAccess() {
      try {
        setAccessLoading(true);
        setError("");

        const idToken = await currentUser.getIdToken();

        const response = await fetch(
          "/api/generation-access",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },

            body: JSON.stringify({
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

          requiresPro:
            Boolean(data.requiresPro),

          restrictionReason:
            data.restrictionReason ?? null,
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

  function currentFeatureRequest() {
    return {
      mode,
      duration:
        mode === "multi"
          ? multiSceneTotalDuration
          : duration,
      templateId: selectedTemplate,
      videoStyle,
      aspectRatio,
      cameraMotion,
      captionStyle,
      captionPosition,
      showWatermark,
      watermark,
      watermarkPosition,
      watermarkOpacity,
      backgroundMusic,
      sceneTransition,
    };
  }

  function showProRequired(feature: string) {
    setError(
      `${feature} is available on Founding Pro. Upgrade to unlock this feature.`
    );
    setMessage("");
  }

  function applyVideoTemplate(template: VideoTemplate) {
    if (!hasActivePro(generationAccess)) {
      showProRequired("Video templates");
      return;
    }
    setSelectedTemplate(template.id);
    setVideoStyle(template.videoStyle);
    setAspectRatio(template.aspectRatio);
    setCameraMotion(template.cameraMotion);
    setShowCaption(true);
    setCaptionStyle(template.captionStyle);
    setCaptionPosition(template.captionPosition);
    setSceneTransition(template.sceneTransition);
    setBackgroundMusic(template.backgroundMusic);
    setMusicVolume(template.musicVolume);
    setMessage(`${template.label} template applied. You can still customise every setting.`);
    setError("");
  }

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

  function handleMultiImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []).slice(0, 5);

    multiImagePreviews.forEach((url) => URL.revokeObjectURL(url));

    setMultiImageFiles(files);
    setMultiImagePreviews(
      files.map((file) => URL.createObjectURL(file))
    );
    setScenePrompts(files.map((_, index) => scenePrompts[index] || ""));
    setSceneDurations(files.map((_, index) => sceneDurations[index] || 5));
  }

  function moveMultiScene(
    fromIndex: number,
    toIndex: number
  ) {
    if (
      toIndex < 0 ||
      toIndex >= multiImageFiles.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const moveItem = <T,>(
      items: T[],
      from: number,
      to: number
    ) => {
      const next = [...items];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    };

    setMultiImageFiles((current) =>
      moveItem(current, fromIndex, toIndex)
    );

    setMultiImagePreviews((current) =>
      moveItem(current, fromIndex, toIndex)
    );

    setScenePrompts((current) =>
      moveItem(current, fromIndex, toIndex)
    );

    setSceneDurations((current) =>
      moveItem(current, fromIndex, toIndex)
    );
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

    const idToken = await currentUser.getIdToken();

    const response = await fetch(
      "/api/generation-access",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          action,
          features: currentFeatureRequest(),
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

          requiresPro:
            Boolean(data.requiresPro),

          restrictionReason:
            data.restrictionReason ?? null,
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
            duration:
              mode === "multi"
                ? multiSceneTotalDuration
                : duration,
            videoUrl: generatedVideoUrl,
            watermark,
            aspectRatio,
            cameraMotion,
            showCaption,
            captionStyle,
            captionPosition,
            showWatermark,
            watermarkPosition,
            watermarkOpacity,
            backgroundMusic,
            musicVolume,
            imageCount:
              mode === "multi"
                ? multiImageFiles.length
                : mode === "image"
                  ? 1
                  : 0,
            sceneTransition:
              mode === "multi"
                ? sceneTransition
                : "none",
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

  async function getBackendAuthHeaders() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("You must sign in first.");
    }

    // Force-refresh only when Firebase decides the cached token is stale.
    const idToken = await currentUser.getIdToken();

    return {
      Authorization: `Bearer ${idToken}`,
    };
  }

  // --------------------------------------------------
  // TEXT TO VIDEO
  // --------------------------------------------------

  async function generateTextVideo() {
    const authHeaders = await getBackendAuthHeaders();

    const response = await fetch(
      `${BACKEND_URL}/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },

        body: JSON.stringify({
          prompt: buildStyledPrompt(
            prompt,
            videoStyle
          ),
          language,
          duration,
          watermark,
          aspect_ratio: aspectRatio,
          motion_style: cameraMotion,
          caption_style: captionStyle,
          caption_position: captionPosition,
          show_caption: showCaption,
          show_watermark: showWatermark,
          watermark_position: watermarkPosition,
          watermark_opacity: watermarkOpacity,
          background_music: backgroundMusic,
          music_volume: musicVolume,
          video_style: videoStyle,
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

    const authHeaders = await getBackendAuthHeaders();
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

    formData.append(
      "aspect_ratio",
      aspectRatio
    );

    formData.append(
      "motion_style",
      cameraMotion
    );

    formData.append(
      "caption_style",
      captionStyle
    );

    formData.append(
      "caption_position",
      captionPosition
    );

    formData.append(
      "show_caption",
      String(showCaption)
    );

    formData.append(
      "show_watermark",
      String(showWatermark)
    );

    formData.append(
      "watermark_position",
      watermarkPosition
    );

    formData.append(
      "watermark_opacity",
      String(watermarkOpacity)
    );

    formData.append(
      "background_music",
      backgroundMusic
    );

    formData.append(
      "music_volume",
      String(musicVolume)
    );
    formData.append(
      "video_style",
      videoStyle
    );

    const response = await fetch(
      `${BACKEND_URL}/generate-from-image`,
      {
        method: "POST",
        headers: authHeaders,
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
  // MULTIPLE IMAGES TO VIDEO
  // --------------------------------------------------

  async function generateMultiImageVideo() {
    if (multiImageFiles.length < 2) {
      throw new Error("Please select at least 2 images.");
    }

    if (multiImageFiles.length > 5) {
      throw new Error("You can upload a maximum of 5 images.");
    }

    const authHeaders = await getBackendAuthHeaders();
    const formData = new FormData();

    multiImageFiles.forEach((file) => {
      formData.append("images", file);
    });

    formData.append(
      "prompt",
      buildStyledPrompt(prompt, videoStyle)
    );
    formData.append("language", language);
    if (multiSceneTotalDuration < 2) {
      throw new Error("Please set a duration for every scene.");
    }

    if (multiSceneTotalDuration > 60) {
      throw new Error("Total scene duration cannot exceed 60 seconds.");
    }

    formData.append("duration", String(multiSceneTotalDuration));
    formData.append("scene_prompts", JSON.stringify(scenePrompts));
    formData.append("scene_durations", JSON.stringify(sceneDurations));
    formData.append("watermark", watermark);
    formData.append("aspect_ratio", aspectRatio);
    formData.append("motion_style", cameraMotion);
    formData.append("caption_style", captionStyle);
    formData.append("caption_position", captionPosition);
    formData.append("show_caption", String(showCaption));
    formData.append("show_watermark", String(showWatermark));
    formData.append("watermark_position", watermarkPosition);
    formData.append("watermark_opacity", String(watermarkOpacity));
    formData.append("background_music", backgroundMusic);
    formData.append("music_volume", String(musicVolume));
    formData.append("video_style", videoStyle);
    formData.append("scene_transition", sceneTransition);

    const response = await fetch(
      `${BACKEND_URL}/generate-from-images`,
      {
        method: "POST",
        headers: authHeaders,
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.error ||
          data?.message ||
          "Multiple-image video generation failed."
      );
    }

    const generatedUrl =
      data.videoUrl ||
      data.video_url ||
      data.url ||
      data.output_url;

    if (!generatedUrl) {
      throw new Error("Backend did not return a video URL.");
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

    if (
      mode === "multi" &&
      multiImageFiles.length < 2
    ) {
      setError(
        "Please upload between 2 and 5 images."
      );
      return;
    }

    try {
      setGenerating(true);
      setError("");
      setProgressStep(0);
      setProgressPercent(5);
      updateProgress(0, 10, "Preparing your generation request...");

      updateProgress(1, 20, "Checking your plan and secure access...");

      const access =
        await updateGenerationAccess(
          "check"
        );

      if (!access.allowed) {
        setError(
          access.requiresPro
            ? access.restrictionReason ||
                "This feature requires Founding Pro."
            : "You have reached your free daily limit. Upgrade to Founding Pro for unlimited generations."
        );

        setMessage("");
        return;
      }

      updateProgress(
        2,
        35,
        mode === "multi"
          ? "Processing your images, scene timing and narration..."
          : mode === "image"
            ? "Processing your image and narration..."
            : "Processing your prompt, visual and narration..."
      );

      updateProgress(
        3,
        55,
        "Rendering the video and uploading the final file. Longer videos may take more time..."
      );

      const generatedUrl =
        mode === "text"
          ? await generateTextVideo()
          : mode === "image"
            ? await generateImageVideo()
            : await generateMultiImageVideo();

      setVideoUrl(
        generatedUrl
      );

      // Render securely records Free-plan usage after authentication.

      updateProgress(4, 90, "Saving video to your history...");

      const saved =
        await saveVideoToHistory(
          generatedUrl
        );

      updateProgress(
        5,
        100,
        saved
          ? "Video generated successfully and saved to history."
          : "Video generated successfully."
      );
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

  const freeDailyLimitReached =
    !isPro &&
    generationAccess?.remaining !== null &&
    generationAccess?.remaining !== undefined &&
    generationAccess.remaining <= 0;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-black text-white px-3 py-5 sm:px-4 sm:py-7 md:px-6 md:py-10 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight break-words">
              NaijaVid AI Generator
            </h1>

            <p className="text-white/70 text-base sm:text-lg mt-3">
              Generate short videos from text or images.
            </p>

            <p className="text-white/40 text-sm mt-2">
              Signed in as{" "}
              {user.displayName ||
                user.email ||
                "NaijaVid AI User"}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <div className="w-full sm:w-auto px-4 sm:px-5 py-3 border border-white/20 rounded-2xl sm:rounded-full text-center">
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
              className="w-full sm:w-auto px-4 sm:px-5 py-3 border border-white/20 rounded-2xl sm:rounded-full font-semibold hover:bg-white/10"
            >
              View History
            </button>

            <button
              type="button"
              onClick={
                handleSignOut
              }
              className="w-full sm:w-auto px-4 sm:px-5 py-3 border border-red-500/40 text-red-300 rounded-2xl sm:rounded-full font-semibold hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* PLAN */}

        {isPro ? (
          <section className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border border-green-500/40 bg-green-950/40 p-4 sm:p-7">
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
          <section className="mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl border border-blue-500/40 bg-blue-950/30 p-4 sm:p-7">
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

            <p className="mb-4">
              Remaining today:{" "}
              <strong>
                {generationAccess?.remaining ?? 0}
              </strong>
            </p>

            <p className="mb-6 text-sm text-white/60">
              Free includes text and single-image video, up to 8 seconds,
              16:9 or 9:16, basic styles and captions. Pro unlocks multiple
              images, 60-second videos, templates, music, advanced motion,
              square video and custom watermark controls.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-white text-black rounded-xl font-semibold hover:bg-gray-200 text-center"
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
          className="rounded-2xl sm:rounded-3xl border border-blue-500/30 bg-gradient-to-b from-blue-950/70 to-indigo-950/70 p-3 sm:p-5 md:p-8 overflow-hidden"
        >
          {/* MODE */}

          <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-2 lg:grid-cols-3 sm:mb-8">
            <button
              type="button"
              onClick={() => {
                setMode("text");
                if (duration > 8) setDuration(8);
              }}
              className={`w-full min-h-14 px-4 sm:px-6 lg:px-8 py-4 rounded-2xl font-semibold ${
                mode === "text"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Text to Video
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("image");
                if (duration > 8) setDuration(8);
              }}
              className={`w-full min-h-14 px-4 sm:px-6 lg:px-8 py-4 rounded-2xl font-semibold ${
                mode === "image"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Image to Video
            </button>

            <button
              type="button"
              onClick={() => {
                if (!hasActivePro(generationAccess)) {
                  showProRequired("Multiple-image videos");
                  return;
                }
                setMode("multi");
              }}
              className={`w-full min-h-14 px-4 sm:px-6 lg:px-8 py-4 rounded-2xl font-semibold ${
                mode === "multi"
                  ? "bg-white text-black"
                  : "border border-white/20 text-white"
              }`}
            >
              Multiple Images
              {!hasActivePro(generationAccess) && (
                <span className="ml-2 rounded-full bg-amber-300 px-2 py-0.5 text-xs text-black">
                  PRO
                </span>
              )}
            </button>
          </div>

          {/* QUICK TEMPLATES */}

          <div className="mb-6 sm:mb-8 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-4 sm:p-5">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold">
                Quick Templates
              </h3>
              <p className="text-sm text-white/55">
                Start with a ready-made video setup, then customise any setting below.
              </p>
            </div>

            <div className="mt-4 sm:mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {VIDEO_TEMPLATES.map((template) => {
                const selected = selectedTemplate === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyVideoTemplate(template)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-amber-200 bg-amber-100 text-black"
                        : "border-white/15 bg-black/30 text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-bold">
                        {template.label}
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-black/10 px-2 py-1 text-xs font-bold">
                          Applied
                        </span>
                      ) : !hasActivePro(generationAccess) ? (
                        <span className="rounded-full bg-amber-300 px-2 py-1 text-xs font-bold text-black">
                          PRO
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`mt-2 text-sm leading-5 ${
                        selected ? "text-black/65" : "text-white/55"
                      }`}
                    >
                      {template.description}
                    </div>

                    <div
                      className={`mt-3 text-xs ${
                        selected ? "text-black/55" : "text-white/40"
                      }`}
                    >
                      {template.aspectRatio} · {template.videoStyle} · {template.backgroundMusic}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-white/40">
              Applying a template changes style, aspect ratio, camera motion, captions,
              transition and background music. It does not replace your prompt, images,
              scene prompts or scene durations.
            </p>
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
                className="block w-full min-w-0 rounded-xl border border-white/20 bg-black/40 p-3 sm:p-4 text-sm sm:text-base"
              />

              {imagePreview && (
                <img
                  src={
                    imagePreview
                  }
                  alt="Selected preview"
                  className="mt-4 max-h-80 w-full rounded-xl border border-white/10 object-contain"
                />
              )}
            </div>
          )}

          {mode === "multi" && (
            <div className="mb-8">
              <label className="block text-xl font-bold mb-3">
                Upload 2 to 5 Images
              </label>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultiImageChange}
                className="block w-full min-w-0 rounded-xl border border-white/20 bg-black/40 p-3 sm:p-4 text-sm sm:text-base"
              />

              <p className="mt-2 text-sm text-white/50">
                Each image is a scene. Give every scene its own prompt and duration.
              </p>

              {multiImagePreviews.length > 0 && (
                <div className="mt-5 space-y-4">
                  {multiImagePreviews.map((preview, index) => (
                    <div
                      key={preview}
                      className="rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                        <div>
                          <img
                            src={preview}
                            alt={`Selected image ${index + 1}`}
                            className="aspect-square w-full rounded-xl object-cover"
                          />
                          <p className="mt-2 text-center text-sm font-semibold text-white/70">
                            Scene {index + 1}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() =>
                                moveMultiScene(index, index - 1)
                              }
                              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ↑ Move Up
                            </button>

                            <button
                              type="button"
                              disabled={
                                index === multiImagePreviews.length - 1
                              }
                              onClick={() =>
                                moveMultiScene(index, index + 1)
                              }
                              className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              ↓ Move Down
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-2 block text-sm font-semibold">
                              Scene Prompt
                            </label>
                            <textarea
                              value={scenePrompts[index] || ""}
                              onChange={(event) => {
                                const next = [...scenePrompts];
                                next[index] = event.target.value;
                                setScenePrompts(next);
                              }}
                              placeholder={`Describe what happens in Scene ${index + 1}`}
                              rows={3}
                              className="w-full rounded-xl border border-white/20 bg-black px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold">
                              Scene Duration
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min={1}
                                max={60}
                                value={sceneDurations[index] || 1}
                                onChange={(event) => {
                                  const next = [...sceneDurations];
                                  next[index] = Math.max(1, Number(event.target.value) || 1);
                                  setSceneDurations(next);
                                }}
                                className="w-24 sm:w-28 rounded-xl border border-white/20 bg-black px-3 sm:px-4 py-3"
                              />
                              <span className="text-sm text-white/60">seconds</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                    <span className="font-semibold">Total video duration: </span>
                    <span className={multiSceneTotalDuration > 60 ? "text-red-300" : "text-white"}>
                      {multiSceneTotalDuration} seconds
                    </span>
                    {multiSceneTotalDuration > 60 && (
                      <p className="mt-1 text-sm text-red-300">
                        Reduce scene durations. The current maximum is 60 seconds.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === "multi" && (
            <div className="mb-6 sm:mb-8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
              <h3 className="text-2xl font-bold">
                Scene Transition
              </h3>

              <p className="mt-1 text-sm text-white/50">
                Choose how each uploaded image changes into the next scene.
              </p>

              <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SCENE_TRANSITIONS.map((option) => {
                  const selected =
                    sceneTransition === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setSceneTransition(option.value)
                      }
                      className={`rounded-xl border p-4 text-left ${
                        selected
                          ? "border-white bg-white text-black"
                          : "border-white/15 text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="font-bold">
                        {option.label}
                      </div>

                      <div
                        className={`mt-1 text-sm ${
                          selected
                            ? "text-black/65"
                            : "text-white/50"
                        }`}
                      >
                        {option.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PROMPT */}

          <div className="mb-8">
            <label className="block text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
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
            <label className="block text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
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
                      onClick={() => {
                        if (
                          !hasActivePro(generationAccess) &&
                          !FREE_VIDEO_STYLES.includes(styleOption.value)
                        ) {
                          showProRequired("Advanced video styles");
                          return;
                        }

                        setVideoStyle(styleOption.value);
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-white bg-white text-black"
                          : "border-white/15 bg-black/30 text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-bold">
                        <span>{styleOption.label}</span>
                        {!hasActivePro(generationAccess) &&
                          !FREE_VIDEO_STYLES.includes(styleOption.value) && (
                            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-black">
                              PRO
                            </span>
                          )}
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

          {/* ASPECT RATIO */}

          <div className="mb-8">
            <label className="block text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Aspect Ratio
            </label>

            <div className="grid sm:grid-cols-3 gap-3">
              {ASPECT_RATIOS.map((option) => {
                const selected = aspectRatio === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (
                        !hasActivePro(generationAccess) &&
                        option.value === "1:1"
                      ) {
                        showProRequired("1:1 square video");
                        return;
                      }

                      setAspectRatio(option.value);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/30 text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span>{option.label}</span>
                      {!hasActivePro(generationAccess) &&
                        option.value === "1:1" && (
                          <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-black">
                            PRO
                          </span>
                        )}
                    </div>
                    <div
                      className={`mt-2 text-sm ${
                        selected
                          ? "text-black/70"
                          : "text-white/55"
                      }`}
                    >
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAMERA MOTION */}

          <div className="mb-8">
            <label className="block text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
              Camera Motion
            </label>

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {CAMERA_MOTIONS.map((option) => {
                const selected = cameraMotion === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (
                        !hasActivePro(generationAccess) &&
                        !FREE_CAMERA_MOTIONS.includes(option.value)
                      ) {
                        showProRequired("Advanced camera motion");
                        return;
                      }

                      setCameraMotion(option.value);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 bg-black/30 text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span>{option.label}</span>
                      {!hasActivePro(generationAccess) &&
                        !FREE_CAMERA_MOTIONS.includes(option.value) && (
                          <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-black">
                            PRO
                          </span>
                        )}
                    </div>
                    <div
                      className={`mt-2 text-sm leading-5 ${
                        selected ? "text-black/70" : "text-white/55"
                      }`}
                    >
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CAPTION CONTROLS */}

          <div className="mb-6 sm:mb-8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">
                    Captions
                  </h3>
                  <p className="mt-1 text-sm text-white/50">
                    Show your prompt as readable on-screen text.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCaption(!showCaption)}
                  className={`rounded-full px-5 py-2 font-semibold ${
                    showCaption
                      ? "bg-white text-black"
                      : "border border-white/20 text-white"
                  }`}
                >
                  {showCaption ? "On" : "Off"}
                </button>
              </div>

              {showCaption && (
                <>
                  <div>
                    <label className="block text-lg font-bold mb-3">
                      Caption Style
                    </label>

                    <div className="grid sm:grid-cols-3 gap-3">
                      {CAPTION_STYLES.map((option) => {
                        const selected =
                          captionStyle === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (
                                !hasActivePro(generationAccess) &&
                                option.value !== "clean"
                              ) {
                                showProRequired("Advanced caption styles");
                                return;
                              }

                              setCaptionStyle(option.value);
                            }}
                            className={`rounded-xl border p-4 text-left ${
                              selected
                                ? "border-white bg-white text-black"
                                : "border-white/15 text-white hover:bg-white/10"
                            }`}
                          >
                            <div className="font-bold">
                              {option.label}
                            </div>
                            <div
                              className={`mt-1 text-sm ${
                                selected
                                  ? "text-black/65"
                                  : "text-white/50"
                              }`}
                            >
                              {option.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-lg font-bold mb-3">
                      Caption Position
                    </label>

                    <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap">
                      {(
                        [
                          ["top", "Top"],
                          ["center", "Center"],
                          ["bottom", "Bottom"],
                        ] as Array<[CaptionPosition, string]>
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (
                              !hasActivePro(generationAccess) &&
                              value !== "bottom"
                            ) {
                              showProRequired("Advanced caption positioning");
                              return;
                            }

                            setCaptionPosition(value);
                          }}
                          className={`rounded-xl px-5 py-3 font-semibold ${
                            captionPosition === value
                              ? "bg-white text-black"
                              : "border border-white/20 text-white"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BACKGROUND MUSIC */}

          <div className="mb-6 sm:mb-8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <h3 className="text-2xl font-bold">
              Background Music
            </h3>
            <p className="mt-1 text-sm text-white/50">
              Add a low-volume music bed underneath the narration.
            </p>

            <div className="mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {BACKGROUND_MUSIC_OPTIONS.map((option) => {
                const selected =
                  backgroundMusic === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (
                        !hasActivePro(generationAccess) &&
                        option.value !== "none"
                      ) {
                        showProRequired("Background music");
                        return;
                      }

                      setBackgroundMusic(option.value);
                    }}
                    className={`rounded-xl border p-4 text-left ${
                      selected
                        ? "border-white bg-white text-black"
                        : "border-white/15 text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span>{option.label}</span>
                      {!hasActivePro(generationAccess) &&
                        option.value !== "none" && (
                          <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] text-black">
                            PRO
                          </span>
                        )}
                    </div>
                    <div
                      className={`mt-1 text-sm ${
                        selected
                          ? "text-black/65"
                          : "text-white/50"
                      }`}
                    >
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {backgroundMusic !== "none" && (
              <div className="mt-5">
                <label className="block text-lg font-bold mb-3">
                  Music Volume: {musicVolume}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={musicVolume}
                  onChange={(event) =>
                    setMusicVolume(Number(event.target.value))
                  }
                  className="w-full"
                />
                <p className="mt-2 text-sm text-white/50">
                  Narration stays at full volume. Music remains underneath it.
                </p>
              </div>
            )}
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

              {mode === "multi" ? (
                <div className="rounded-xl border border-white/20 bg-black px-4 py-3">
                  {multiSceneTotalDuration} seconds (automatic from scene timing)
                </div>
              ) : (
                <select
                  value={duration}
                  onChange={(event) =>
                    setDuration(Number(event.target.value))
                  }
                  className="w-full rounded-xl bg-black border border-white/20 px-4 py-3"
                >
                  {[5, 8].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} seconds
                    </option>
                  ))}
                </select>
              )}

            </div>

            <div>
              <label className="block text-xl font-bold mb-3">
                Watermark Text
              </label>

              <input
                value={watermark}
                disabled={!hasActivePro(generationAccess)}
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

          {/* WATERMARK CONTROLS */}

          <div className="mb-6 sm:mb-8 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold">
                    Watermark Controls
                  </h3>
                  <p className="mt-1 text-sm text-white/50">
                    Control whether the watermark appears, where it is placed, and its opacity.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!hasActivePro(generationAccess)) {
                      showProRequired("Custom watermark controls");
                      return;
                    }

                    setShowWatermark(!showWatermark);
                  }}
                  className={`rounded-full px-5 py-2 font-semibold ${
                    showWatermark
                      ? "bg-white text-black"
                      : "border border-white/20 text-white"
                  }`}
                >
                  {showWatermark ? "On" : "Off"}
                </button>
              </div>

              {showWatermark && (
                <>
                  <div>
                    <label className="block text-lg font-bold mb-3">
                      Watermark Position
                    </label>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(
                        [
                          ["top_left", "Top Left"],
                          ["top_right", "Top Right"],
                          ["bottom_left", "Bottom Left"],
                          ["bottom_right", "Bottom Right"],
                        ] as Array<[WatermarkPosition, string]>
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            if (!hasActivePro(generationAccess)) {
                              showProRequired("Custom watermark controls");
                              return;
                            }

                            setWatermarkPosition(value);
                          }}
                          className={`rounded-xl border px-4 py-3 font-semibold ${
                            watermarkPosition === value
                              ? "border-white bg-white text-black"
                              : "border-white/20 text-white hover:bg-white/10"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-lg font-bold mb-3">
                      Watermark Opacity: {watermarkOpacity}%
                    </label>

                    <input
                      type="range"
                      min={20}
                      max={100}
                      disabled={!hasActivePro(generationAccess)}
                      step={10}
                      value={watermarkOpacity}
                      onChange={(event) =>
                        setWatermarkOpacity(
                          Number(event.target.value)
                        )
                      }
                      className="w-full"
                    />

                    <p className="mt-2 text-sm text-white/50">
                      Lower values make the watermark more subtle.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* PREVIEW BEFORE GENERATION */}

          <div className="mb-8 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold">
                  Preview Before Generation
                </h3>
                <p className="mt-1 text-sm text-white/55">
                  Review the video plan before using a generation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="rounded-xl bg-cyan-100 px-5 py-3 font-bold text-black hover:bg-cyan-50"
              >
                {showPreview ? "Hide Preview" : "Preview Video Plan"}
              </button>
            </div>

            {showPreview && (
              <div className="mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/45">Mode</p>
                    <p className="mt-1 font-semibold">
                      {mode === "multi"
                        ? "Multiple Images"
                        : mode === "image"
                          ? "Image to Video"
                          : "Text to Video"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/45">Duration</p>
                    <p className="mt-1 font-semibold">
                      {mode === "multi" ? multiSceneTotalDuration : duration} seconds
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/45">Aspect Ratio</p>
                    <p className="mt-1 font-semibold">{aspectRatio}</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/45">Language</p>
                    <p className="mt-1 font-semibold">{language}</p>
                  </div>
                </div>

                {selectedTemplate && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-950/20 p-4">
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Template
                    </p>
                    <p className="mt-1 font-semibold">
                      {VIDEO_TEMPLATES.find((item) => item.id === selectedTemplate)?.label}
                    </p>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-white/45">
                    Main Prompt
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-white/80">
                    {prompt.trim() || "No prompt entered yet."}
                  </p>
                </div>

                {mode === "image" && imagePreview && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 font-semibold">Selected Image</p>
                    <img
                      src={imagePreview}
                      alt="Preview image"
                      className="max-h-72 rounded-xl object-contain"
                    />
                  </div>
                )}

                {mode === "multi" && (
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-lg font-bold">
                        Final Scene Order
                      </h4>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/65">
                        {multiImagePreviews.length} scenes
                      </span>
                    </div>

                    {multiImagePreviews.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-white/55">
                        Upload 2 to 5 images to preview the scene order.
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {multiImagePreviews.map((preview, index) => (
                          <div
                            key={`preview-${preview}`}
                            className="rounded-xl border border-white/10 bg-black/30 p-4"
                          >
                            <div className="flex gap-4">
                              <img
                                src={preview}
                                alt={`Preview scene ${index + 1}`}
                                className="h-24 w-24 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-bold">
                                    Scene {index + 1}
                                  </p>
                                  <span className="text-sm text-cyan-200">
                                    {sceneDurations[index] || 1}s
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-white/65">
                                  {scenePrompts[index]?.trim() ||
                                    "No scene prompt entered."}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Video Style</p>
                    <p className="mt-1 font-semibold">
                      {VIDEO_STYLES.find((item) => item.value === videoStyle)?.label || videoStyle}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Camera Motion</p>
                    <p className="mt-1 font-semibold">
                      {CAMERA_MOTIONS.find((item) => item.value === cameraMotion)?.label || cameraMotion}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Transition</p>
                    <p className="mt-1 font-semibold">
                      {mode === "multi"
                        ? SCENE_TRANSITIONS.find((item) => item.value === sceneTransition)?.label || sceneTransition
                        : "Not applicable"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Captions</p>
                    <p className="mt-1 font-semibold">
                      {showCaption
                        ? `${captionStyle} · ${captionPosition}`
                        : "Off"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Watermark</p>
                    <p className="mt-1 font-semibold">
                      {showWatermark
                        ? `${watermark || "naijavid.ai"} · ${watermarkPosition.replaceAll("_", " ")} · ${watermarkOpacity}%`
                        : "Off"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm text-white/45">Background Music</p>
                    <p className="mt-1 font-semibold">
                      {backgroundMusic === "none"
                        ? "None"
                        : `${BACKGROUND_MUSIC_OPTIONS.find((item) => item.value === backgroundMusic)?.label || backgroundMusic} · ${musicVolume}%`}
                    </p>
                  </div>
                </div>

                {mode === "multi" && multiSceneTotalDuration > 60 && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
                    Total scene duration exceeds the 60-second maximum.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {/* STATUS / GENERATION PROGRESS */}

          {message && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-white/80">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-white">{message}</p>
                <span className="text-sm font-bold text-white/60">
                  {progressPercent}%
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {(generating || progressPercent === 100) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {GENERATION_STAGES.map((stage, index) => {
                    const done = index < progressStep || progressPercent === 100;
                    const active = index === progressStep && progressPercent < 100;

                    return (
                      <div
                        key={stage}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          done
                            ? "border-white/20 bg-white/10 text-white"
                            : active
                              ? "border-white/30 bg-white/15 text-white"
                              : "border-white/5 bg-black/20 text-white/35"
                        }`}
                      >
                        <span className="mr-2">
                          {done ? "✓" : active ? "●" : "○"}
                        </span>
                        {stage}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* GENERATE BUTTON */}

          <button
            type="submit"
            disabled={generating}
            className="w-full min-h-14 rounded-2xl bg-white px-4 sm:px-6 py-4 sm:py-5 text-lg sm:text-xl font-bold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : freeDailyLimitReached ? "Daily Limit Reached" : "Generate Video"}
          </button>
        </form>

        {/* RESULT */}

        {videoUrl && (
          <section className="mt-8 sm:mt-10">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5">
              Generated Video
            </h2>

            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-3 sm:p-5">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-2xl bg-black"
              />

              <div className="grid grid-cols-1 gap-3 mt-4 sm:flex sm:flex-wrap sm:mt-5">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-center"
                >
                  Open Video
                </a>

                <a
                  href={videoUrl}
                  download
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 text-center"
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
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-white/20 hover:bg-white/10 text-center"
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