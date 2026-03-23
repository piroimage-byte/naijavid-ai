export type SupportedLanguage =
  | "english"
  | "pidgin"
  | "yoruba"
  | "igbo"
  | "hausa";

export const LANGUAGE_OPTIONS: {
  value: SupportedLanguage;
  label: string;
  description: string;
}[] = [
  {
    value: "english",
    label: "English",
    description: "Standard English for broad audience videos",
  },
  {
    value: "pidgin",
    label: "Pidgin",
    description: "Casual Nigerian Pidgin tone for viral and relatable videos",
  },
  {
    value: "yoruba",
    label: "Yoruba",
    description: "Yoruba language style for regional audience targeting",
  },
  {
    value: "igbo",
    label: "Igbo",
    description: "Igbo language style for regional audience targeting",
  },
  {
    value: "hausa",
    label: "Hausa",
    description: "Hausa language style for regional audience targeting",
  },
];

export function getLanguageInstruction(language: SupportedLanguage) {
  switch (language) {
    case "pidgin":
      return "Write and express the scene in clear Nigerian Pidgin. Make it natural, relatable, and culturally familiar.";
    case "yoruba":
      return "Write and express the scene in Yoruba. Keep it culturally natural and audience-friendly.";
    case "igbo":
      return "Write and express the scene in Igbo. Keep it culturally natural and audience-friendly.";
    case "hausa":
      return "Write and express the scene in Hausa. Keep it culturally natural and audience-friendly.";
    case "english":
    default:
      return "Write and express the scene in clear English suitable for video generation.";
  }
}