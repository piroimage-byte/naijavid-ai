export type VideoNiche =
  | "business"
  | "church"
  | "birthday"
  | "wedding"
  | "real-estate"
  | "product-ad"
  | "event-promo";

export const NICHE_OPTIONS: {
  value: VideoNiche;
  label: string;
  promptStyle: string;
}[] = [
  {
    value: "business",
    label: "Business",
    promptStyle:
      "professional commercial style, modern branding, sharp visuals, clean composition",
  },
  {
    value: "church",
    label: "Church",
    promptStyle:
      "uplifting faith-based atmosphere, warm lighting, spiritual tone, reverent and inspiring visuals",
  },
  {
    value: "birthday",
    label: "Birthday",
    promptStyle:
      "joyful celebration, luxury party styling, festive balloons, vibrant energy, cinematic birthday atmosphere",
  },
  {
    value: "wedding",
    label: "Wedding",
    promptStyle:
      "romantic elegant wedding visuals, soft lighting, cinematic love story style, premium event atmosphere",
  },
  {
    value: "real-estate",
    label: "Real Estate",
    promptStyle:
      "premium property showcase, wide clean interior shots, elegant camera motion, architectural presentation",
  },
  {
    value: "product-ad",
    label: "Product Ad",
    promptStyle:
      "high-conversion product commercial, polished studio visuals, premium marketing style, clean product emphasis",
  },
  {
    value: "event-promo",
    label: "Event Promo",
    promptStyle:
      "high-energy promo visuals, attention-grabbing composition, cinematic event marketing style",
  },
];

export function getNicheStyle(niche: VideoNiche) {
  const item = NICHE_OPTIONS.find((x) => x.value === niche);
  return item?.promptStyle || "cinematic high quality visual storytelling";
}