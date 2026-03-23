import { SupportedLanguage, getLanguageInstruction } from "./language-presets";
import { VideoNiche, getNicheStyle } from "./niche-presets";

export type PromptBuilderInput = {
  subject: string;
  scene: string;
  niche: VideoNiche;
  language: SupportedLanguage;
  tone: string;
  audience: string;
  cameraStyle: string;
  durationSeconds: number;
};

export function buildVideoPrompt(input: PromptBuilderInput) {
  const subject = input.subject.trim();
  const scene = input.scene.trim();
  const tone = input.tone.trim();
  const audience = input.audience.trim();
  const cameraStyle = input.cameraStyle.trim();

  const languageInstruction = getLanguageInstruction(input.language);
  const nicheStyle = getNicheStyle(input.niche);

  return [
    `Create a ${input.durationSeconds}-second AI video.`,
    `Main subject: ${subject || "a compelling central subject"}.`,
    `Scene description: ${scene || "a visually engaging cinematic environment"}.`,
    `Visual style: ${nicheStyle}.`,
    `Tone: ${tone || "engaging, cinematic, and premium"}.`,
    `Target audience: ${audience || "general digital audience"}.`,
    `Camera direction: ${cameraStyle || "smooth cinematic camera motion with professional framing"}.`,
    `Video quality: ultra-detailed, realistic lighting, strong subject focus, polished composition, social-media-ready.`,
    languageInstruction,
    `Avoid distortions, blurred faces, broken hands, poor anatomy, duplicated objects, text errors, and low-quality rendering.`,
  ].join(" ");
}